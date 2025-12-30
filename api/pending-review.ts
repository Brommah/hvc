import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

interface Candidate {
  id: string;
  name: string;
  role: string | null;
  status: string | null;
  priority: string | null;
  stratification: string | null;
  hotCandidate: boolean;
  hoursSinceLastActivity: number | null;
  latestCommunication: string | null;
  linkedinProfile: string | null;
  notionUrl: string;
  interviewStatus: string | null;
  aiScore: number | null;
  humanScore: number | null;
  dateAdded: string | null;
  aiProcessedAt: string | null;
  cvVerifiedByLynn: string | null;
  passedHumanFilter: boolean;
  hoursSinceAiReview: number | null;
}

function getPropertyValue(properties: Record<string, unknown>, key: string): unknown {
  const prop = properties[key] as Record<string, unknown> | undefined;
  if (!prop) return null;

  const type = prop.type as string;

  switch (type) {
    case 'title':
      return ((prop.title as Array<{ plain_text: string }>) || []).map((t) => t.plain_text).join('') || null;
    case 'rich_text':
      return ((prop.rich_text as Array<{ plain_text: string }>) || []).map((t) => t.plain_text).join('') || null;
    case 'select':
      return (prop.select as { name: string } | null)?.name || null;
    case 'status':
      return (prop.status as { name: string } | null)?.name || null;
    case 'number':
      return prop.number;
    case 'checkbox':
      return prop.checkbox;
    case 'url':
      return prop.url || null;
    case 'date':
      return (prop.date as { start: string } | null)?.start || null;
    case 'created_time':
      return prop.created_time || null;
    case 'last_edited_time':
      return prop.last_edited_time || null;
    case 'formula': {
      const formula = prop.formula as Record<string, unknown>;
      if (formula.type === 'number') return formula.number;
      if (formula.type === 'string') return formula.string;
      if (formula.type === 'boolean') return formula.boolean;
      if (formula.type === 'date') return (formula.date as { start: string } | null)?.start || null;
      return null;
    }
    default:
      return null;
  }
}

function mapPageToCandidate(page: { id: string; url: string; properties: Record<string, unknown> }): Candidate {
  const props = page.properties;
  const hotCandidateValue = getPropertyValue(props, 'Hot Candidate?') as string | null;
  
  return {
    id: page.id,
    name: (getPropertyValue(props, 'Name') as string) || 'Unknown',
    role: getPropertyValue(props, 'Role') as string | null,
    status: getPropertyValue(props, 'Status') as string | null,
    priority: getPropertyValue(props, 'Priority') as string | null,
    stratification: getPropertyValue(props, 'Stratification') as string | null,
    hotCandidate: hotCandidateValue === 'Hot Candidate 🔥',
    hoursSinceLastActivity: getPropertyValue(props, 'Hours Since Last Activity') as number | null,
    latestCommunication: getPropertyValue(props, 'Latest Communication') as string | null,
    linkedinProfile: getPropertyValue(props, 'Linkedin Profile') as string | null,
    notionUrl: page.url,
    interviewStatus: getPropertyValue(props, 'Interview Status') as string | null,
    aiScore: getPropertyValue(props, 'AI Score') as number | null,
    humanScore: getPropertyValue(props, 'Human Score') as number | null,
    dateAdded: getPropertyValue(props, 'Date Added') as string | null,
    aiProcessedAt: getPropertyValue(props, 'AI Processed At') as string | null,
    cvVerifiedByLynn: getPropertyValue(props, 'CV Verified by Lynn') as string | null,
    passedHumanFilter: getPropertyValue(props, 'Passed Human Filter') as boolean || false,
    hoursSinceAiReview: (() => {
      // For screening backlog, calculate hours since Date Added (time in pipeline)
      const dateAdded = getPropertyValue(props, 'Date Added') as string | null;
      if (!dateAdded) return null;
      return Math.round((Date.now() - new Date(dateAdded).getTime()) / (1000 * 60 * 60));
    })(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch candidates in HR Screening or HM Screening status (the human review backlog)
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        or: [
          {
            property: 'Status',
            status: {
              equals: 'HR Screening',
            },
          },
          {
            property: 'Status',
            status: {
              equals: 'HM Screening',
            },
          },
        ],
      },
      sorts: [
        {
          // Sort by date added (oldest first = longest waiting)
          property: 'Date Added',
          direction: 'ascending',
        },
      ],
    });

    const candidates = response.results
      .filter((page): page is { id: string; url: string; properties: Record<string, unknown>; object: 'page' } => 
        page.object === 'page' && 'properties' in page
      )
      .map(mapPageToCandidate);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({ 
      success: true, 
      data: candidates, 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

