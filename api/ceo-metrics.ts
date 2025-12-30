import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

type PageResult = { id: string; url: string; properties: Record<string, unknown>; created_time: string };

function getPropertyValue(properties: Record<string, unknown>, key: string): unknown {
  const prop = properties[key] as Record<string, unknown> | undefined;
  if (!prop) return null;
  const type = prop.type as string;

  switch (type) {
    case 'title':
      return ((prop.title as Array<{ plain_text: string }>) || []).map((t) => t.plain_text).join('') || null;
    case 'select':
      return (prop.select as { name: string } | null)?.name || null;
    case 'status':
      return (prop.status as { name: string } | null)?.name || null;
    case 'number':
      return prop.number;
    case 'date':
      return (prop.date as { start: string } | null)?.start || null;
    case 'created_time':
      return prop.created_time || null;
    case 'formula': {
      const formula = prop.formula as Record<string, unknown>;
      if (formula.type === 'number') return formula.number;
      return null;
    }
    default:
      return null;
  }
}

// Interview statuses (candidates who have reached interview stage)
const INTERVIEW_STATUSES = [
  'Initial Evaluation Call',
  'CEO Interview',
  'Tech Test Task',
  'Collab Writing',
  'Trial Period',
  'Exploratory Call',
  'Tech Interview',
  'Accepted',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch ALL candidates from last 30 days
    const allPages: PageResult[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: DATABASE_ID,
        filter: {
          property: 'Date Added',
          created_time: { on_or_after: thirtyDaysAgo.toISOString() },
        },
        start_cursor: startCursor,
        page_size: 100,
      });

      const pages = response.results.filter(
        (p): p is PageResult => p.object === 'page' && 'properties' in p && 'url' in p
      );
      allPages.push(...pages);
      hasMore = response.has_more;
      startCursor = response.next_cursor ?? undefined;
    }

    // Parse all candidates with full data
    const candidates = allPages.map(page => {
      const dateAdded = (getPropertyValue(page.properties, 'Date Added') as string) || page.created_time;
      return {
        id: page.id,
        name: (getPropertyValue(page.properties, 'Name') as string) || 'Unknown',
        role: (getPropertyValue(page.properties, 'Role') as string) || 'Unknown',
        status: getPropertyValue(page.properties, 'Status') as string | null,
        interviewStatus: getPropertyValue(page.properties, 'Interview Status') as string | null,
        aiScore: getPropertyValue(page.properties, 'AI Score') as number | null,
        humanScore: getPropertyValue(page.properties, 'Human Score') as number | null,
        hoursSinceLastActivity: getPropertyValue(page.properties, 'Hours Since Last Activity') as number | null,
        dateAdded,
        dateAddedDay: dateAdded?.split('T')[0] || null,
        notionUrl: page.url,
      };
    });

    // Generate all 30 days
    const allDays: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      allDays.push(d.toISOString().split('T')[0]);
    }

    // =============================================
    // GRAPH 1: Time to Interview (Pipeline Velocity)
    // For candidates who reached interview, avg days from Date Added
    // =============================================
    const candidatesWithInterview = candidates.filter(c => 
      c.status && INTERVIEW_STATUSES.includes(c.status)
    );
    
    // Group by week for cleaner trend (day added → reached interview)
    const timeToInterviewByWeek: Record<string, { totalDays: number; count: number }> = {};
    
    candidatesWithInterview.forEach(c => {
      if (!c.dateAddedDay) return;
      // Estimate time to interview based on hours since last activity
      // (This is approximate - we don't have exact interview date)
      const daysInSystem = c.hoursSinceLastActivity ? c.hoursSinceLastActivity / 24 : 0;
      
      // Get week start for this candidate
      const weekStart = getWeekStart(c.dateAddedDay);
      if (!timeToInterviewByWeek[weekStart]) {
        timeToInterviewByWeek[weekStart] = { totalDays: 0, count: 0 };
      }
      timeToInterviewByWeek[weekStart].totalDays += daysInSystem;
      timeToInterviewByWeek[weekStart].count += 1;
    });

    const timeToInterviewTrend = Object.keys(timeToInterviewByWeek).sort().map(week => ({
      week,
      avgDays: Math.round(timeToInterviewByWeek[week].totalDays / timeToInterviewByWeek[week].count),
      count: timeToInterviewByWeek[week].count,
    }));

    // =============================================
    // GRAPH 2: AI vs Human Delta (for HVCs only)
    // For AI Score >= 7, track Human Score - AI Score per day
    // =============================================
    const hvcsWithBothScores = candidates.filter(c => 
      c.aiScore !== null && 
      c.aiScore >= 7 && 
      c.humanScore !== null
    );

    const aiHumanDeltaByDay: Record<string, { totalDelta: number; count: number }> = {};
    
    hvcsWithBothScores.forEach(c => {
      if (!c.dateAddedDay || c.aiScore === null || c.humanScore === null) return;
      
      if (!aiHumanDeltaByDay[c.dateAddedDay]) {
        aiHumanDeltaByDay[c.dateAddedDay] = { totalDelta: 0, count: 0 };
      }
      aiHumanDeltaByDay[c.dateAddedDay].totalDelta += (c.humanScore - c.aiScore);
      aiHumanDeltaByDay[c.dateAddedDay].count += 1;
    });

    const aiVsHumanTrend = allDays.map(day => {
      const data = aiHumanDeltaByDay[day];
      return {
        date: day,
        avgDelta: data ? Math.round((data.totalDelta / data.count) * 10) / 10 : null,
        count: data?.count || 0,
      };
    }).filter(d => d.count > 0); // Only days with data

    // =============================================
    // GRAPH 3: Stage Dwell Time (Where candidates get stuck)
    // Avg Hours Since Last Activity by current Status
    // =============================================
    const statusDwellTime: Record<string, { totalHours: number; count: number }> = {};
    
    candidates.forEach(c => {
      if (!c.status || c.hoursSinceLastActivity === null) return;
      
      if (!statusDwellTime[c.status]) {
        statusDwellTime[c.status] = { totalHours: 0, count: 0 };
      }
      statusDwellTime[c.status].totalHours += c.hoursSinceLastActivity;
      statusDwellTime[c.status].count += 1;
    });

    const stageDwellTime = Object.entries(statusDwellTime)
      .map(([status, data]) => ({
        status,
        avgHours: Math.round(data.totalHours / data.count),
        count: data.count,
      }))
      .sort((a, b) => b.avgHours - a.avgHours); // Worst bottlenecks first

    // =============================================
    // GRAPH 4: Response Time Trend
    // Avg Hours Since Last Activity for candidates added each day
    // =============================================
    const responseTimeByDay: Record<string, { totalHours: number; count: number }> = {};
    
    candidates.forEach(c => {
      if (!c.dateAddedDay || c.hoursSinceLastActivity === null) return;
      
      if (!responseTimeByDay[c.dateAddedDay]) {
        responseTimeByDay[c.dateAddedDay] = { totalHours: 0, count: 0 };
      }
      responseTimeByDay[c.dateAddedDay].totalHours += c.hoursSinceLastActivity;
      responseTimeByDay[c.dateAddedDay].count += 1;
    });

    const responseTimeTrend = allDays.map(day => {
      const data = responseTimeByDay[day];
      return {
        date: day,
        avgHours: data ? Math.round(data.totalHours / data.count) : null,
        count: data?.count || 0,
      };
    });

    // =============================================
    // SUMMARY STATS
    // =============================================
    const totalApplications = candidates.length;
    
    // HR Backlog (AI >= 7 in HR/HM CV Screening)
    const hrBacklogStatuses = ['HR Screening', 'HM CV Screening'];
    const hrBacklog = candidates.filter(c => 
      c.aiScore !== null && 
      c.aiScore >= 7 && 
      c.status && 
      hrBacklogStatuses.includes(c.status)
    );

    // Overall avg response time
    const allHours = candidates
      .filter(c => c.hoursSinceLastActivity !== null)
      .map(c => c.hoursSinceLastActivity!);
    const avgResponseHours = allHours.length > 0
      ? Math.round(allHours.reduce((a, b) => a + b, 0) / allHours.length)
      : 0;

    // Role breakdown
    const roleBreakdown: Record<string, number> = {};
    candidates.forEach(c => {
      const role = c.role || 'Unknown';
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
    });

    // Applications by day for the stacked chart
    const rolesByDay: Record<string, Record<string, number>> = {};
    const allRoles = new Set<string>();
    candidates.forEach(c => {
      if (!c.dateAddedDay) return;
      const role = c.role || 'Unknown';
      allRoles.add(role);
      if (!rolesByDay[c.dateAddedDay]) rolesByDay[c.dateAddedDay] = {};
      rolesByDay[c.dateAddedDay][role] = (rolesByDay[c.dateAddedDay][role] || 0) + 1;
    });

    const applicationsByDay = allDays.map(day => ({
      date: day,
      total: Object.values(rolesByDay[day] || {}).reduce((a, b) => a + b, 0),
      ...(rolesByDay[day] || {}),
    }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalApplications,
          totalHrBacklog: hrBacklog.length,
          avgResponseHours,
          candidatesAtInterview: candidatesWithInterview.length,
          hvcsWithScores: hvcsWithBothScores.length,
        },
        // Graph 1: Time to Interview
        timeToInterviewTrend,
        // Graph 2: AI vs Human Delta
        aiVsHumanTrend,
        // Graph 3: Stage Dwell Time
        stageDwellTime,
        // Graph 4: Response Time Trend
        responseTimeTrend,
        // Existing data
        applicationsByDay,
        roles: Array.from(allRoles).sort(),
        roleBreakdown,
        hrBacklogCandidates: hrBacklog.map(c => ({
          id: c.id,
          name: c.name,
          role: c.role,
          aiScore: c.aiScore,
          status: c.status,
          dateAdded: c.dateAdded,
          notionUrl: c.notionUrl,
        })),
      },
    });
  } catch (error) {
    console.error('CEO metrics error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  date.setDate(diff);
  return date.toISOString().split('T')[0];
}
