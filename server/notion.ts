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
interface DailyMetric {
  day: string;
  date: string;
}

interface ResponseVelocityMetric extends DailyMetric {
  hours: number;
  count: number;
}

interface ThroughputMetric extends DailyMetric {
  newHVCs: number;
  processed: number;
}

interface AIAccuracyMetric extends DailyMetric {
  delta: number;
  count: number;
}

interface BottleneckMetric extends DailyMetric {
  hours: number;
  count: number;
}

interface ConversionMetric extends DailyMetric {
  rate: number;
  total: number;
  converted: number;
}

export interface CEOMetrics {
  responseVelocity: ResponseVelocityMetric[];
  throughput: ThroughputMetric[];
  aiAccuracy: AIAccuracyMetric[];
  managerBottlenecks: BottleneckMetric[];
  hvcQuality: ConversionMetric[];
  summary: {
    avgResponseHours: number;
    netFlow: number;
    aiImprovement: number;
    avgBottleneckHours: number;
    conversionRate: number;
  };
}

function getLast30Days(): { day: string; date: string; dateObj: Date }[] {
  const days: { day: string; date: string; dateObj: Date }[] = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    days.push({
      day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: date.toISOString().split('T')[0],
      dateObj: date,
    });
  }
  return days;
}

function isHVC(candidate: Candidate): boolean {
  return candidate.hotCandidate || candidate.priority === '1st' || candidate.stratification === 'H';
}

function hasInterview(candidate: Candidate): boolean {
  const interviewStatus = candidate.interviewStatus;
  if (!interviewStatus) return false;
  
  const positiveStatuses = ['Scheduled', 'Completed', 'Phone Screen', 'On-site', 'Final Round', 'Offer'];
  return positiveStatuses.some(s => interviewStatus.toLowerCase().includes(s.toLowerCase()));
}

/**
 * Fetches CEO metrics - 5 key graphs for last 30 days
 */
export async function getCEOMetrics(): Promise<CEOMetrics> {
  const notion = getNotionClient();
  const databaseId = getDatabaseId();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch ALL candidates from last 30 days (with pagination)
  const allPages: PageObjectResponse[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Date Added',
        created_time: {
          on_or_after: thirtyDaysAgo.toISOString(),
        },
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

  const days = getLast30Days();

  // 1. Response Velocity - Avg "Hours Since Last Activity" for ALL candidates added each day
  const responseVelocity: ResponseVelocityMetric[] = days.map(({ day, date }) => {
    const dayCandidates = allCandidates.filter(c => {
      const addedDate = c.dateAdded?.split('T')[0];
      return addedDate === date && c.hoursSinceLastActivity !== null;
    });
    
    const avgHours = dayCandidates.length > 0
      ? dayCandidates.reduce((sum, c) => sum + (c.hoursSinceLastActivity || 0), 0) / dayCandidates.length
      : 0;
    
    return { day, date, hours: Math.round(avgHours * 10) / 10, count: dayCandidates.length };
  });

  // 2. Throughput - New candidates vs Processed per day (ALL candidates)
  const throughput: ThroughputMetric[] = days.map(({ day, date }) => {
    const newHVCs = allCandidates.filter(c => {
      const addedDate = c.dateAdded?.split('T')[0];
      return addedDate === date;
    }).length;
    
    const processed = allCandidates.filter(c => {
      const verifiedDate = c.cvVerifiedByLynn?.split('T')[0];
      return verifiedDate === date;
    }).length;
    
    return { day, date, newHVCs, processed };
  });

  // 3. AI Accuracy - Delta between AI Score and Human Score
  const candidatesWithBothScores = allCandidates.filter(
    c => c.aiScore !== null && c.humanScore !== null
  );
  
  const aiAccuracy: AIAccuracyMetric[] = days.map(({ day, date }) => {
    const dayCandidates = candidatesWithBothScores.filter(c => {
      const addedDate = c.dateAdded?.split('T')[0];
      return addedDate === date;
    });
    
    const avgDelta = dayCandidates.length > 0
      ? dayCandidates.reduce((sum, c) => sum + Math.abs((c.aiScore || 0) - (c.humanScore || 0)), 0) / dayCandidates.length
      : 0;
    
    return { day, date, delta: Math.round(avgDelta * 100) / 100, count: dayCandidates.length };
  });

  // 4. Manager Bottlenecks - Time between AI Processed and CV Verified
  const candidatesWithReviewTimes = allCandidates.filter(
    c => c.aiProcessedAt && c.cvVerifiedByLynn
  );
  
  const managerBottlenecks: BottleneckMetric[] = days.map(({ day, date }) => {
    const dayCandidates = candidatesWithReviewTimes.filter(c => {
      const verifiedDate = c.cvVerifiedByLynn?.split('T')[0];
      return verifiedDate === date;
    });
    
    const avgHours = dayCandidates.length > 0
      ? dayCandidates.reduce((sum, c) => {
          const aiTime = new Date(c.aiProcessedAt!).getTime();
          const humanTime = new Date(c.cvVerifiedByLynn!).getTime();
          return sum + (humanTime - aiTime) / (1000 * 60 * 60);
        }, 0) / dayCandidates.length
      : 0;
    
    return { day, date, hours: Math.round(avgHours * 10) / 10, count: dayCandidates.length };
  });

  // 5. HVC Quality - Conversion rate to interview
  const hvcQuality: ConversionMetric[] = days.map(({ day, date, dateObj }) => {
    const hvcsBefore = allCandidates.filter(c => {
      const addedDate = new Date(c.dateAdded || '');
      return addedDate <= dateObj && isHVC(c);
    });
    
    const total = hvcsBefore.length;
    const converted = hvcsBefore.filter(c => hasInterview(c)).length;
    const rate = total > 0 ? (converted / total) * 100 : 0;
    
    return { day, date, rate: Math.round(rate * 10) / 10, total, converted };
  });

  // Calculate summary stats
  const hvcCandidates = allCandidates.filter(c => isHVC(c));
  const avgResponseHours = hvcCandidates.length > 0
    ? hvcCandidates.reduce((sum, c) => sum + (c.hoursSinceLastActivity || 0), 0) / hvcCandidates.length
    : 0;
  
  const totalNew = throughput.reduce((sum, d) => sum + d.newHVCs, 0);
  const totalProcessed = throughput.reduce((sum, d) => sum + d.processed, 0);
  
  const validAiAccuracy = aiAccuracy.filter(d => d.count > 0);
  const firstWeekDelta = validAiAccuracy.slice(0, 7).reduce((sum, d) => sum + d.delta, 0) / Math.max(1, validAiAccuracy.slice(0, 7).length);
  const lastWeekDelta = validAiAccuracy.slice(-7).reduce((sum, d) => sum + d.delta, 0) / Math.max(1, validAiAccuracy.slice(-7).length);
  const aiImprovement = firstWeekDelta > 0 ? ((firstWeekDelta - lastWeekDelta) / firstWeekDelta) * 100 : 0;
  
  const validBottlenecks = managerBottlenecks.filter(d => d.count > 0);
  const avgBottleneckHours = validBottlenecks.length > 0
    ? validBottlenecks.reduce((sum, d) => sum + d.hours, 0) / validBottlenecks.length
    : 0;
  
  const latestConversion = hvcQuality[hvcQuality.length - 1];
  const conversionRate = latestConversion?.rate || 0;

  return {
    responseVelocity,
    throughput,
    aiAccuracy,
    managerBottlenecks,
    hvcQuality,
    summary: {
      avgResponseHours: Math.round(avgResponseHours),
      netFlow: totalProcessed - totalNew,
      aiImprovement: Math.round(aiImprovement),
      avgBottleneckHours: Math.round(avgBottleneckHours),
      conversionRate: Math.round(conversionRate),
    },
  };
}

