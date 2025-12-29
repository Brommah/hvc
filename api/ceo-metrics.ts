import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

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

interface CEOMetrics {
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
    case 'date':
      return (prop.date as { start: string } | null)?.start || null;
    case 'created_time':
      return prop.created_time || null;
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

function isHVC(props: Record<string, unknown>): boolean {
  const hotCandidate = getPropertyValue(props, 'Hot Candidate?') as string | null;
  const priority = getPropertyValue(props, 'Priority') as string | null;
  const stratification = getPropertyValue(props, 'Stratification') as string | null;
  
  return (
    hotCandidate === 'Hot Candidate 🔥' ||
    priority === '1st' ||
    stratification === 'H'
  );
}

function isProcessed(props: Record<string, unknown>): boolean {
  const status = getPropertyValue(props, 'Status') as string | null;
  const interviewStatus = getPropertyValue(props, 'Interview Status') as string | null;
  const cvVerified = getPropertyValue(props, 'CV Verified by Lynn') as string | null;
  
  // Considered "processed" if has interview status, CV verified, or status changed from initial
  return !!(
    interviewStatus ||
    cvVerified ||
    (status && !['New', 'Unread', 'To Review'].includes(status))
  );
}

function hasInterview(props: Record<string, unknown>): boolean {
  const interviewStatus = getPropertyValue(props, 'Interview Status') as string | null;
  if (!interviewStatus) return false;
  
  const positiveStatuses = ['Scheduled', 'Completed', 'Phone Screen', 'On-site', 'Final Round', 'Offer'];
  return positiveStatuses.some(s => interviewStatus.toLowerCase().includes(s.toLowerCase()));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all candidates from last 30 days
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: 'Date Added',
        created_time: {
          on_or_after: thirtyDaysAgo.toISOString(),
        },
      },
    });

    const candidates = response.results
      .filter((page): page is { id: string; properties: Record<string, unknown>; created_time: string } => 
        page.object === 'page' && 'properties' in page
      )
      .map(page => ({
        id: page.id,
        props: page.properties,
        createdTime: page.created_time,
        dateAdded: getPropertyValue(page.properties, 'Date Added') as string | null,
        hoursActivity: getPropertyValue(page.properties, 'Hours Since Last Activity') as number | null,
        aiScore: getPropertyValue(page.properties, 'AI Score') as number | null,
        humanScore: getPropertyValue(page.properties, 'Human Score') as number | null,
        aiProcessedAt: getPropertyValue(page.properties, 'AI Processed At') as string | null,
        cvVerifiedAt: getPropertyValue(page.properties, 'CV Verified by Lynn') as string | null,
        isHVC: isHVC(page.properties),
        isProcessed: isProcessed(page.properties),
        hasInterview: hasInterview(page.properties),
      }));

    const days = getLast30Days();

    // 1. Response Velocity - Avg "Hours Since Last Activity" for HVCs added each day
    const responseVelocity: ResponseVelocityMetric[] = days.map(({ day, date }) => {
      const dayCandidates = candidates.filter(c => {
        const addedDate = (c.dateAdded || c.createdTime)?.split('T')[0];
        return addedDate === date && c.isHVC && c.hoursActivity !== null;
      });
      
      const avgHours = dayCandidates.length > 0
        ? dayCandidates.reduce((sum, c) => sum + (c.hoursActivity || 0), 0) / dayCandidates.length
        : 0;
      
      return { day, date, hours: Math.round(avgHours * 10) / 10, count: dayCandidates.length };
    });

    // 2. Throughput - New HVCs vs Processed HVCs per day
    const throughput: ThroughputMetric[] = days.map(({ day, date }) => {
      const newHVCs = candidates.filter(c => {
        const addedDate = (c.dateAdded || c.createdTime)?.split('T')[0];
        return addedDate === date && c.isHVC;
      }).length;
      
      // For processed, we look at CV verified date or estimate from status
      const processed = candidates.filter(c => {
        const verifiedDate = c.cvVerifiedAt?.split('T')[0];
        return verifiedDate === date && c.isHVC;
      }).length;
      
      return { day, date, newHVCs, processed };
    });

    // 3. AI Accuracy - Delta between AI Score and Human Score
    const candidatesWithBothScores = candidates.filter(
      c => c.aiScore !== null && c.humanScore !== null
    );
    
    const aiAccuracy: AIAccuracyMetric[] = days.map(({ day, date }) => {
      const dayCandidates = candidatesWithBothScores.filter(c => {
        const addedDate = (c.dateAdded || c.createdTime)?.split('T')[0];
        return addedDate === date;
      });
      
      const avgDelta = dayCandidates.length > 0
        ? dayCandidates.reduce((sum, c) => sum + Math.abs((c.aiScore || 0) - (c.humanScore || 0)), 0) / dayCandidates.length
        : 0;
      
      return { day, date, delta: Math.round(avgDelta * 100) / 100, count: dayCandidates.length };
    });

    // 4. Manager Bottlenecks - Time between AI Processed and CV Verified
    const candidatesWithReviewTimes = candidates.filter(
      c => c.aiProcessedAt && c.cvVerifiedAt
    );
    
    const managerBottlenecks: BottleneckMetric[] = days.map(({ day, date }) => {
      const dayCandidates = candidatesWithReviewTimes.filter(c => {
        const verifiedDate = c.cvVerifiedAt?.split('T')[0];
        return verifiedDate === date;
      });
      
      const avgHours = dayCandidates.length > 0
        ? dayCandidates.reduce((sum, c) => {
            const aiTime = new Date(c.aiProcessedAt!).getTime();
            const humanTime = new Date(c.cvVerifiedAt!).getTime();
            return sum + (humanTime - aiTime) / (1000 * 60 * 60);
          }, 0) / dayCandidates.length
        : 0;
      
      return { day, date, hours: Math.round(avgHours * 10) / 10, count: dayCandidates.length };
    });

    // 5. HVC Quality - Conversion rate to interview
    const hvcQuality: ConversionMetric[] = days.map(({ day, date, dateObj }) => {
      // Cumulative: all HVCs up to this date
      const hvcsBefore = candidates.filter(c => {
        const addedDate = new Date((c.dateAdded || c.createdTime) || '');
        return addedDate <= dateObj && c.isHVC;
      });
      
      const total = hvcsBefore.length;
      const converted = hvcsBefore.filter(c => c.hasInterview).length;
      const rate = total > 0 ? (converted / total) * 100 : 0;
      
      return { day, date, rate: Math.round(rate * 10) / 10, total, converted };
    });

    // Calculate summary stats
    const hvcCandidates = candidates.filter(c => c.isHVC);
    const avgResponseHours = hvcCandidates.length > 0
      ? hvcCandidates.reduce((sum, c) => sum + (c.hoursActivity || 0), 0) / hvcCandidates.length
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

    const metrics: CEOMetrics = {
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

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ success: true, data: metrics, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error calculating CEO metrics:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

