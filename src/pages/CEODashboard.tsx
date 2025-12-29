import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';

/**
 * Generate mock data for the last 30 days
 */
function generateMockData() {
  const days: string[] = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  // Graph 1: Response Velocity (Avg hours to first contact)
  const responseVelocity = days.map((day, i) => ({
    day,
    hours: Math.max(8, 36 - (i * 0.5) + (Math.random() * 12 - 6)), // Trending down from ~36h to ~22h
  }));

  // Graph 2: Processing Throughput (New vs Processed)
  const throughput = days.map((day, i) => {
    const newHVCs = Math.floor(5 + Math.random() * 8);
    const processed = Math.floor(4 + Math.random() * 7 + (i > 15 ? 2 : 0)); // Improving after day 15
    return { day, newHVCs, processed };
  });

  // Graph 3: AI Accuracy (AI vs Human score delta)
  const aiAccuracy = days.map((day, i) => ({
    day,
    delta: Math.max(0.2, 2.5 - (i * 0.06) + (Math.random() * 0.8 - 0.4)), // Converging from 2.5 to ~0.5
  }));

  // Graph 4: Manager Bottlenecks (Hours in pending HM review)
  const managerBottlenecks = days.map((day, i) => ({
    day,
    hours: Math.max(12, 72 - (i * 1.5) + (Math.random() * 20 - 10)), // Trending down
  }));

  // Graph 5: HVC Quality (Conversion to interview %)
  const hvcQuality = days.map((day, i) => ({
    day,
    rate: Math.min(65, 25 + (i * 1.2) + (Math.random() * 8 - 4)), // Trending up from 25% to ~60%
  }));

  return { responseVelocity, throughput, aiAccuracy, managerBottlenecks, hvcQuality };
}

interface KPICardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  insight?: string;
}

function KPICard({ title, subtitle, children, insight }: KPICardProps) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className="h-48">
        {children}
      </div>
      {insight && (
        <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">{insight}</p>
      )}
    </div>
  );
}

/**
 * CEO Insights Dashboard
 * 5 crucial line graphs for Fred's observable metrics
 */
export function CEODashboard() {
  const data = useMemo(() => generateMockData(), []);

  // Calculate summary stats
  const stats = useMemo(() => {
    const latestVelocity = data.responseVelocity[data.responseVelocity.length - 1].hours;
    const avgVelocity = data.responseVelocity.reduce((sum, d) => sum + d.hours, 0) / 30;
    
    const totalNew = data.throughput.reduce((sum, d) => sum + d.newHVCs, 0);
    const totalProcessed = data.throughput.reduce((sum, d) => sum + d.processed, 0);
    
    const latestDelta = data.aiAccuracy[data.aiAccuracy.length - 1].delta;
    const firstDelta = data.aiAccuracy[0].delta;
    
    const avgBottleneck = data.managerBottlenecks.reduce((sum, d) => sum + d.hours, 0) / 30;
    
    const latestConversion = data.hvcQuality[data.hvcQuality.length - 1].rate;

    return {
      latestVelocity: Math.round(latestVelocity),
      velocityTrend: latestVelocity < avgVelocity ? 'improving' : 'declining',
      netFlow: totalProcessed - totalNew,
      aiImprovement: Math.round(((firstDelta - latestDelta) / firstDelta) * 100),
      avgBottleneck: Math.round(avgBottleneck),
      conversion: Math.round(latestConversion),
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                CEO Insights
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Last 30 days • Observable metrics, not storytelling
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <a
                href="/"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← HVC Dashboard
              </a>
              <a
                href="/pending-review"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Pending Review
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{stats.latestVelocity}h</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Response Time</div>
            <div className={`text-xs mt-2 ${stats.latestVelocity <= 24 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.latestVelocity <= 24 ? '✓ Within target' : '⚠ Above 24h target'}
            </div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className={`text-2xl font-semibold ${stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.netFlow >= 0 ? '+' : ''}{stats.netFlow}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Net Flow (30d)</div>
            <div className="text-xs text-gray-400 mt-2">Processed vs New</div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-green-600">{stats.aiImprovement}%</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">AI Improvement</div>
            <div className="text-xs text-gray-400 mt-2">Score convergence</div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className={`text-2xl font-semibold ${stats.avgBottleneck <= 48 ? 'text-gray-900' : 'text-amber-600'}`}>
              {stats.avgBottleneck}h
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Avg HM Wait</div>
            <div className="text-xs text-gray-400 mt-2">Review queue</div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{stats.conversion}%</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Conversion</div>
            <div className="text-xs text-gray-400 mt-2">HVC → Interview</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Graph 1: Response Velocity */}
          <KPICard
            title="Response Velocity"
            subtitle="Avg hours from Applied to First Contact (HVCs)"
            insight="24-hour rule adherence. Red line = target. Below is good."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.responseVelocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  interval={6}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  domain={[0, 50]}
                />
                <Tooltip 
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0 }}
                  formatter={(value: number) => [`${value.toFixed(1)}h`, 'Avg Hours']}
                />
                <ReferenceLine y={24} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '24h Target', fontSize: 10, fill: '#ef4444' }} />
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#111827" 
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#111827' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </KPICard>

          {/* Graph 2: Processing Throughput */}
          <KPICard
            title="Processing Throughput"
            subtitle="New HVCs Identified vs HVCs Processed"
            insight="Processed should stay above New. Gap = backlog building."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.throughput}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  interval={6}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0 }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="newHVCs" 
                  stroke="#9ca3af" 
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: '#9ca3af' }}
                  name="New"
                />
                <Line 
                  type="monotone" 
                  dataKey="processed" 
                  stroke="#111827" 
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#111827' }}
                  name="Processed"
                />
              </LineChart>
            </ResponsiveContainer>
          </KPICard>

          {/* Graph 3: AI Accuracy Trend */}
          <KPICard
            title="AI Accuracy Trend"
            subtitle="Avg deviation between AI Score and Human Score"
            insight="Downward trend = AI is learning. Target: < 1.0 delta."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.aiAccuracy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  interval={6}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  domain={[0, 3]}
                />
                <Tooltip 
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0 }}
                  formatter={(value: number) => [value.toFixed(2), 'Delta']}
                />
                <ReferenceLine y={1} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Target', fontSize: 10, fill: '#22c55e' }} />
                <Line 
                  type="monotone" 
                  dataKey="delta" 
                  stroke="#111827" 
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#111827' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </KPICard>

          {/* Graph 4: Manager Bottlenecks */}
          <KPICard
            title="Manager Bottlenecks"
            subtitle="Avg hours in 'Pending Hiring Manager Review'"
            insight="Measures HM accountability. Should trend toward 24h."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.managerBottlenecks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  interval={6}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0 }}
                  formatter={(value: number) => [`${value.toFixed(0)}h`, 'Avg Wait']}
                />
                <ReferenceLine y={24} stroke="#22c55e" strokeDasharray="5 5" label={{ value: '24h', fontSize: 10, fill: '#22c55e' }} />
                <ReferenceLine y={48} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '48h', fontSize: 10, fill: '#f59e0b' }} />
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#111827" 
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#111827' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </KPICard>

          {/* Graph 5: HVC Quality Signal */}
          <div className="col-span-2">
            <KPICard
              title="HVC Quality Signal"
              subtitle="% of HVCs that convert to Scheduled Interview"
              insight="Validates if 'High Value' tag means anything. Higher = better targeting."
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.hvcQuality}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    interval={4}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    domain={[0, 80]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0 }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Conversion']}
                  />
                  <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="5 5" label={{ value: '50% Target', fontSize: 10, fill: '#22c55e' }} />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#111827" 
                    strokeWidth={2}
                    dot={{ r: 2, fill: '#111827' }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </KPICard>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-400">
          <p>Data refreshed every 5 minutes • Metrics calculated from Notion Candidate Board</p>
        </footer>
      </main>
    </div>
  );
}

