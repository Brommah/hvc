import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

interface DayData {
  day: string;
  date: string;
  newCandidates: number;
  verified: number;
  avgResponseHours: number;
  candidateCount: number;
}

interface CEOMetrics {
  dailyData: DayData[];
  summary: {
    totalNew: number;
    totalVerified: number;
    backlog: number;
    avgResponseHours: number;
    conversionRate: number;
  };
}

function getPropertyValue(properties: Record<string, unknown>, key: string): unknown {
  const prop = properties[key] as Record<string, unknown> | undefined;
  if (!prop) return null;
  const type = prop.type as string;

  switch (type) {
    case 'title':
      return ((prop.title as Array<{ plain_text: string }>) || []).map((t) => t.plain_text).join('') || null;
    case 'select':
      return (prop.select as { name: string } | null)?.name || null;
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

    // Fetch all candidates with pagination
    type PageResult = { id: string; created_time: string; properties: Record<string, unknown> };
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
        (p): p is PageResult => p.object === 'page' && 'properties' in p
      );
      allPages.push(...pages);
      hasMore = response.has_more;
      startCursor = response.next_cursor ?? undefined;
    }

    // Build last 30 days
    const days: { day: string; date: string; dateObj: Date }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({
        day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        date: d.toISOString().split('T')[0],
        dateObj: d,
      });
    }

    // Process candidates
    const dailyData: DayData[] = days.map(({ day, date }) => {
      const dayCandidates = allPages.filter(p => {
        const addedDate = (getPropertyValue(p.properties, 'Date Added') as string)?.split('T')[0];
        return addedDate === date;
      });

      const verifiedOnDay = allPages.filter(p => {
        const verifiedDate = (getPropertyValue(p.properties, 'CV Verified by Lynn') as string)?.split('T')[0];
        return verifiedDate === date;
      });

      const hoursValues = dayCandidates
        .map(p => getPropertyValue(p.properties, 'Hours Since Last Activity') as number | null)
        .filter((h): h is number => h !== null);

      const avgHours = hoursValues.length > 0
        ? hoursValues.reduce((a, b) => a + b, 0) / hoursValues.length
        : 0;

      return {
        day,
        date,
        newCandidates: dayCandidates.length,
        verified: verifiedOnDay.length,
        avgResponseHours: Math.round(avgHours),
        candidateCount: dayCandidates.length,
      };
    });

    // Summary
    const totalNew = dailyData.reduce((sum, d) => sum + d.newCandidates, 0);
    const totalVerified = dailyData.reduce((sum, d) => sum + d.verified, 0);
    
    const allHours = allPages
      .map(p => getPropertyValue(p.properties, 'Hours Since Last Activity') as number | null)
      .filter((h): h is number => h !== null);
    const avgResponseHours = allHours.length > 0
      ? Math.round(allHours.reduce((a, b) => a + b, 0) / allHours.length)
      : 0;

    // Conversion: candidates with interview status
    const withInterview = allPages.filter(p => {
      const status = getPropertyValue(p.properties, 'Interview Status') as string | null;
      return status && !['', 'None', 'N/A'].includes(status);
    }).length;
    const conversionRate = allPages.length > 0 ? Math.round((withInterview / allPages.length) * 100) : 0;

    const metrics: CEOMetrics = {
      dailyData,
      summary: {
        totalNew,
        totalVerified,
        backlog: totalNew - totalVerified,
        avgResponseHours,
        conversionRate,
      },
    };

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    console.error('CEO metrics error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
