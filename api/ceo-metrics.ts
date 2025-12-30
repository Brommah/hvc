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

    // Parse all candidates
    const candidates = allPages.map(page => {
      const hotCandidate = getPropertyValue(page.properties, 'Hot Candidate?') as string | null;
      const priority = getPropertyValue(page.properties, 'Priority') as string | null;
      const stratification = getPropertyValue(page.properties, 'Stratification') as string | null;
      const hoursSinceLastActivity = getPropertyValue(page.properties, 'Hours Since Last Activity') as number | null;
      const status = getPropertyValue(page.properties, 'Status') as string | null;
      
      const isHvc = hotCandidate === 'Hot Candidate 🔥' || priority === '1st' || stratification === 'H';
      const isOverdue = hoursSinceLastActivity !== null && hoursSinceLastActivity > 24;
      const isActive = status !== 'Company Rejected' && status !== 'Candidate Rejected' && status !== 'Accepted';
      
      return {
        id: page.id,
        name: (getPropertyValue(page.properties, 'Name') as string) || 'Unknown',
        role: (getPropertyValue(page.properties, 'Role') as string) || 'Unknown',
        status,
        aiScore: getPropertyValue(page.properties, 'AI Score') as number | null,
        dateAdded: (getPropertyValue(page.properties, 'Date Added') as string) || page.created_time,
        notionUrl: page.url,
        isHvc,
        isOverdue,
        isActive,
        hoursSinceLastActivity,
      };
    });

    // === APPLICATIONS BY ROLE PER DAY ===
    const rolesByDay: Record<string, Record<string, number>> = {};
    const allRoles = new Set<string>();

    candidates.forEach(c => {
      const day = c.dateAdded?.split('T')[0];
      if (!day) return;
      
      const role = c.role || 'Unknown';
      allRoles.add(role);
      
      if (!rolesByDay[day]) rolesByDay[day] = {};
      rolesByDay[day][role] = (rolesByDay[day][role] || 0) + 1;
    });

    // Build sorted daily data
    const days = Object.keys(rolesByDay).sort();
    const applicationsByDay = days.map(day => ({
      date: day,
      total: Object.values(rolesByDay[day]).reduce((a, b) => a + b, 0),
      ...rolesByDay[day],
    }));

    // === HR BACKLOG ===
    // AI Score >= 7 AND Status in (HR Screening, HM CV Screening)
    const hrBacklogStatuses = ['HR Screening', 'HM CV Screening'];
    const hrBacklog = candidates.filter(c => 
      c.aiScore !== null && 
      c.aiScore >= 7 && 
      c.status && 
      hrBacklogStatuses.includes(c.status)
    );

    // HR Backlog by day (when they entered the backlog)
    const backlogByDay: Record<string, number> = {};
    hrBacklog.forEach(c => {
      const day = c.dateAdded?.split('T')[0];
      if (!day) return;
      backlogByDay[day] = (backlogByDay[day] || 0) + 1;
    });

    // Generate all 30 days for consistent charting
    const allDays: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      allDays.push(d.toISOString().split('T')[0]);
    }

    // Calculate cumulative backlog (outstanding items by EOD)
    // This shows how many items were in the backlog at end of each day
    let cumulativeCount = 0;
    const backlogTrend = allDays.map(day => {
      cumulativeCount += backlogByDay[day] || 0;
      return {
        date: day,
        count: cumulativeCount,
        newItems: backlogByDay[day] || 0,
      };
    });

    // === OVERDUE HVCs ===
    // HVCs (Hot Candidate, Priority 1st, or Stratification H) with >24h since last activity
    const overdueHvcs = candidates.filter(c => c.isHvc && c.isOverdue && c.isActive);

    // Overdue HVC trend - count by date added (approximation for trend)
    const overdueByDay: Record<string, number> = {};
    overdueHvcs.forEach(c => {
      const day = c.dateAdded?.split('T')[0];
      if (!day) return;
      overdueByDay[day] = (overdueByDay[day] || 0) + 1;
    });

    let cumulativeOverdue = 0;
    const overdueHvcTrend = allDays.map(day => {
      cumulativeOverdue += overdueByDay[day] || 0;
      return {
        date: day,
        count: cumulativeOverdue,
      };
    });

    // Summary
    const totalApplications = candidates.length;
    const totalHrBacklog = hrBacklog.length;
    const totalOverdueHvc = overdueHvcs.length;

    // Role breakdown for applications
    const roleBreakdown: Record<string, number> = {};
    candidates.forEach(c => {
      const role = c.role || 'Unknown';
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalApplications,
          totalHrBacklog,
          totalOverdueHvc,
        },
        applicationsByDay,
        backlogTrend,
        overdueHvcTrend,
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
