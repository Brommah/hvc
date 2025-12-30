import { Client } from '@notionhq/client';
import type { QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';

type PageObjectResponse = Extract<QueryDatabaseResponse['results'][number], { object: 'page' }>;

let notionClient: Client | null = null;

/**
 * Get or create the Notion client (lazy initialization)
 */
function getNotionClient(): Client {
  if (!notionClient) {
    if (!process.env.NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY environment variable is not set');
    }
    notionClient = new Client({
      auth: process.env.NOTION_API_KEY,
    });
  }
  return notionClient;
}

function getDatabaseId(): string {
  if (!process.env.NOTION_DATABASE_ID) {
    throw new Error('NOTION_DATABASE_ID environment variable is not set');
  }
  return process.env.NOTION_DATABASE_ID;
}

export interface Candidate {
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

/**
 * Extracts a property value from a Notion page
 */
function getPropertyValue(
  properties: PageObjectResponse['properties'],
  key: string
): unknown {
  const prop = properties[key];
  if (!prop) return null;

  switch (prop.type) {
    case 'title':
      return prop.title.map((t) => t.plain_text).join('') || null;
    case 'rich_text':
      return prop.rich_text.map((t) => t.plain_text).join('') || null;
    case 'select':
      return prop.select?.name || null;
    case 'status':
      return prop.status?.name || null;
    case 'number':
      return prop.number;
    case 'checkbox':
      return prop.checkbox;
    case 'url':
      return prop.url || null;
    case 'date':
      return prop.date?.start || null;
    case 'created_time':
      return prop.created_time || null;
    case 'last_edited_time':
      return prop.last_edited_time || null;
    case 'formula':
      if (prop.formula.type === 'number') return prop.formula.number;
      if (prop.formula.type === 'string') return prop.formula.string;
      if (prop.formula.type === 'boolean') return prop.formula.boolean;
      if (prop.formula.type === 'date') return prop.formula.date?.start || null;
      return null;
    default:
      return null;
  }
}

/**
 * Maps a Notion page to a Candidate object
 */
function mapPageToCandidate(page: PageObjectResponse): Candidate {
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
      const aiDate = getPropertyValue(props, 'AI Processed At') as string | null;
      if (!aiDate) return null;
      return Math.round((Date.now() - new Date(aiDate).getTime()) / (1000 * 60 * 60));
    })(),
  };
}

/**
 * Fetches high-value candidates that haven't been followed up on in 24+ hours
 * High-value: Hot Candidate 🔥 OR Priority = 1st OR Stratification = H
 */
export async function getHighValueCandidates(): Promise<Candidate[]> {
  const notion = getNotionClient();
  const databaseId = getDatabaseId();
  
  // Calculate date 1 month ago
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        // Only candidates added in the last month
        {
          property: 'Date Added',
          created_time: {
            on_or_after: oneMonthAgo.toISOString(),
          },
        },
        // Exclude Company Rejected status
        {
          property: 'Status',
          status: {
            does_not_equal: 'Company Rejected',
          },
        },
        // Exclude Accepted status
        {
          property: 'Status',
          status: {
            does_not_equal: 'Accepted',
          },
        },
        // Exclude Completed interview status
        {
          property: 'Interview Status',
          select: {
            does_not_equal: 'Completed',
          },
        },
        // High-value candidate criteria (any of these)
        {
          or: [
            {
              property: 'Hot Candidate?',
              select: {
                equals: 'Hot Candidate 🔥',
              },
            },
            {
              property: 'Priority',
              select: {
                equals: '1st',
              },
            },
            {
              property: 'Stratification',
              select: {
                equals: 'H',
              },
            },
          ],
        },
      ],
    },
    sorts: [
      {
        property: 'Hours Since Last Activity',
        direction: 'descending',
      },
    ],
  });

  const allCandidates = response.results
    .filter((page): page is PageObjectResponse => page.object === 'page' && 'properties' in page)
    .map(mapPageToCandidate);

  // Filter for candidates with > 24 hours since last activity
  const overdueNeedingFollowUp = allCandidates.filter((c) => {
    // If no activity tracked, consider them as needing follow-up
    if (c.hoursSinceLastActivity === null) return true;
    return c.hoursSinceLastActivity > 24;
  });

  return overdueNeedingFollowUp;
}

/**
 * Fetches candidates that have been AI reviewed but not yet human reviewed
 * Sorted by time since AI review (longest waiting first)
 */
export async function getPendingHumanReview(): Promise<Candidate[]> {
  const notion = getNotionClient();
  const databaseId = getDatabaseId();
  
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        // Has been processed by AI
        {
          property: 'AI Processed At',
          date: {
            is_not_empty: true,
          },
        },
        // Has NOT been verified by Lynn (human review pending)
        {
          property: 'CV Verified by Lynn',
          date: {
            is_empty: true,
          },
        },
        // Has NOT passed human filter yet
        {
          property: 'Passed Human Filter',
          checkbox: {
            equals: false,
          },
        },
        // Exclude rejected/completed statuses
        {
          property: 'Status',
          status: {
            does_not_equal: 'Company Rejected',
          },
        },
        {
          property: 'Status',
          status: {
            does_not_equal: 'Candidate Rejected',
          },
        },
      ],
    },
    sorts: [
      {
        property: 'AI Processed At',
        direction: 'ascending', // Oldest first (longest waiting)
      },
    ],
  });

  const candidates = response.results
    .filter((page): page is PageObjectResponse => page.object === 'page' && 'properties' in page)
    .map(mapPageToCandidate);

  return candidates;
}

// CEO Metrics Types
export interface CEOMetrics {
  summary: {
    totalApplications: number;
    totalHrBacklog: number;
  };
  applicationsByDay: Array<{
    date: string;
    total: number;
    [role: string]: number | string;
  }>;
  backlogTrend: Array<{
    date: string;
    count: number;
  }>;
  roles: string[];
  roleBreakdown: Record<string, number>;
  hrBacklogCandidates: Array<{
    id: string;
    name: string;
    role: string | null;
    aiScore: number | null;
    status: string | null;
    dateAdded: string | null;
    notionUrl: string;
  }>;
}

/**
 * Fetches CEO metrics - Applications and HR Backlog
 */
export async function getCEOMetrics(): Promise<CEOMetrics> {
  const notion = getNotionClient();
  const databaseId = getDatabaseId();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch ALL candidates with pagination
  const allPages: PageObjectResponse[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Date Added',
        created_time: { on_or_after: thirtyDaysAgo.toISOString() },
      },
      start_cursor: startCursor,
      page_size: 100,
    });

    const pages = response.results.filter(
      (page): page is PageObjectResponse => page.object === 'page' && 'properties' in page
    );
    allPages.push(...pages);
    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  const allCandidates = allPages.map(mapPageToCandidate);

  // === APPLICATIONS BY ROLE PER DAY ===
  const rolesByDay: Record<string, Record<string, number>> = {};
  const allRoles = new Set<string>();

  allCandidates.forEach(c => {
    const day = c.dateAdded?.split('T')[0];
    if (!day) return;
    
    const role = c.role || 'Unknown';
    allRoles.add(role);
    
    if (!rolesByDay[day]) rolesByDay[day] = {};
    rolesByDay[day][role] = (rolesByDay[day][role] || 0) + 1;
  });

  const days = Object.keys(rolesByDay).sort();
  const applicationsByDay = days.map(day => ({
    date: day,
    total: Object.values(rolesByDay[day]).reduce((a, b) => a + b, 0),
    ...rolesByDay[day],
  }));

  // === HR BACKLOG ===
  // AI Score >= 7 AND Status in (HR Screening, HM CV Screening)
  const hrBacklogStatuses = ['HR Screening', 'HM CV Screening'];
  const hrBacklog = allCandidates.filter(c => 
    c.aiScore !== null && 
    c.aiScore >= 7 && 
    c.status && 
    hrBacklogStatuses.includes(c.status)
  );

  // HR Backlog by day
  const backlogByDay: Record<string, number> = {};
  hrBacklog.forEach(c => {
    const day = c.dateAdded?.split('T')[0];
    if (!day) return;
    backlogByDay[day] = (backlogByDay[day] || 0) + 1;
  });

  const backlogTrend = days.map(day => ({
    date: day,
    count: backlogByDay[day] || 0,
  }));

  // Role breakdown
  const roleBreakdown: Record<string, number> = {};
  allCandidates.forEach(c => {
    const role = c.role || 'Unknown';
    roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
  });

  return {
    summary: {
      totalApplications: allCandidates.length,
      totalHrBacklog: hrBacklog.length,
    },
    applicationsByDay,
    backlogTrend,
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
  };
}

/**
 * Simple candidate for awaiting review list
 */
export interface AwaitingReviewCandidate {
  id: string;
  name: string;
  role: string | null;
  aiScore: number | null;
  dateAdded: string | null;
  notionUrl: string;
}

/**
 * Fetches candidates awaiting Lynn's review
 */
export async function getAwaitingReview(): Promise<AwaitingReviewCandidate[]> {
  const notion = getNotionClient();
  const databaseId = getDatabaseId();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const allPages: PageObjectResponse[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
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
        ],
      },
      sorts: [{ property: 'AI Score', direction: 'descending' }],
      start_cursor: startCursor,
      page_size: 100,
    });

    const pages = response.results.filter(
      (page): page is PageObjectResponse => page.object === 'page' && 'properties' in page
    );
    allPages.push(...pages);
    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  return allPages.map(page => ({
    id: page.id,
    name: (getPropertyValue(page.properties, 'Name') as string) || 'Unknown',
    role: getPropertyValue(page.properties, 'Role') as string | null,
    aiScore: getPropertyValue(page.properties, 'AI Score') as number | null,
    dateAdded: getPropertyValue(page.properties, 'Date Added') as string | null,
    notionUrl: page.url,
  }));
}

