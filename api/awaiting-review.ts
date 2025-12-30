import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

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

    // Fetch candidates awaiting review (no CV Verified by Lynn)
    type PageResult = { id: string; url: string; properties: Record<string, unknown> };
    const allPages: PageResult[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: DATABASE_ID,
        filter: {
          and: [
            {
              property: 'Date Added',
              created_time: { on_or_after: thirtyDaysAgo.toISOString() },
            },
            {
              property: 'CV Verified by Lynn',
              date: { is_empty: true },
            },
            {
              property: 'Status',
              status: { does_not_equal: 'Company Rejected' },
            },
            {
              property: 'Status',
              status: { does_not_equal: 'Candidate Rejected' },
            },
          ],
        },
        sorts: [{ property: 'AI Score', direction: 'descending' }],
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

    const candidates = allPages.map(page => ({
      id: page.id,
      name: (getPropertyValue(page.properties, 'Name') as string) || 'Unknown',
      role: getPropertyValue(page.properties, 'Role') as string | null,
      aiScore: getPropertyValue(page.properties, 'AI Score') as number | null,
      dateAdded: getPropertyValue(page.properties, 'Date Added') as string | null,
      notionUrl: page.url,
    }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({ success: true, data: candidates });
  } catch (error) {
    console.error('Awaiting review error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

