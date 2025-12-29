import { useState, useEffect, useCallback } from 'react';
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
 * 5 crucial line graphs with REAL data from Notion
 */
export function CEODashboard() {
  const [metrics, setMetrics] = useState<CEOMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ceo-metrics');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
        setLastUpdated(new Date());
      } else {
        setError(data.error || 'Failed to fetch metrics');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      console.error('Failed to fetch CEO metrics:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '—';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 animate-spin mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-gray-500 mt-4">Calculating metrics from Notion...</p>
        </div>
      </div>
    );
  }

  const stats = metrics?.summary || {
    avgResponseHours: 0,
    netFlow: 0,
    aiImprovement: 0,
    avgBottleneckHours: 0,
    conversionRate: 0,
  };

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
                Last 30 days • Real data from Notion
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
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Last sync:</span>
                <span className="text-gray-600 font-medium">{formatLastUpdated(lastUpdated)}</span>
              </div>
              <button
                onClick={fetchMetrics}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 mb-6">
            <div className="flex items-center gap-2 text-red-600">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="font-medium">Error loading metrics</span>
            </div>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{stats.avgResponseHours}h</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Avg Response</div>
            <div className={`text-xs mt-2 ${stats.avgResponseHours <= 24 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.avgResponseHours <= 24 ? '✓ Within target' : '⚠ Above 24h'}
            </div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className={`text-2xl font-semibold ${stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.netFlow >= 0 ? '+' : ''}{stats.netFlow}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Net Flow (30d)</div>
            <div className="text-xs text-gray-400 mt-2">Processed - New</div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className={`text-2xl font-semibold ${stats.aiImprovement > 0 ? 'text-green-600' : stats.aiImprovement < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {stats.aiImprovement > 0 ? '+' : ''}{stats.aiImprovement}%
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">AI Improvement</div>
            <div className="text-xs text-gray-400 mt-2">Score convergence</div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className={`text-2xl font-semibold ${stats.avgBottleneckHours <= 48 ? 'text-gray-900' : 'text-amber-600'}`}>
              {stats.avgBottleneckHours}h
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Avg HM Wait</div>
            <div className="text-xs text-gray-400 mt-2">Review queue</div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{stats.conversionRate}%</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Conversion</div>
            <div className="text-xs text-gray-400 mt-2">HVC → Interview</div>
          </div>
        </div>

        {/* Charts Grid */}
        {metrics && (
          <div className="grid grid-cols-2 gap-6">
            {/* Graph 1: Response Velocity */}
            <KPICard
              title="Response Velocity"
              subtitle="Avg hours since last activity for HVCs (by date added)"
              insight="24-hour rule adherence. Red line = target. Below is good."
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.responseVelocity}>
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
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0, background: 'white' }}
                    formatter={(value: number, name: string) => [
                      name === 'hours' ? `${value}h` : value,
                      name === 'hours' ? 'Avg Hours' : 'Candidates'
                    ]}
                  />
                  <ReferenceLine y={24} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '24h', fontSize: 10, fill: '#ef4444' }} />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#111827" 
                    strokeWidth={2}
                    dot={{ r: 2, fill: '#111827' }}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </KPICard>

            {/* Graph 2: Processing Throughput */}
            <KPICard
              title="Processing Throughput"
              subtitle="New HVCs added vs HVCs verified (by day)"
              insight="Processed should stay above New. Gap = backlog building."
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.throughput}>
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
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0, background: 'white' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line 
                    type="monotone" 
                    dataKey="newHVCs" 
                    stroke="#9ca3af" 
                    strokeWidth={1.5}
                    dot={{ r: 2, fill: '#9ca3af' }}
                    name="New HVCs"
                    connectNulls
                  />
                  <Line 
                    type="monotone" 
                    dataKey="processed" 
                    stroke="#111827" 
                    strokeWidth={2}
                    dot={{ r: 2, fill: '#111827' }}
                    name="Verified"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </KPICard>

            {/* Graph 3: AI Accuracy Trend */}
            <KPICard
              title="AI Accuracy Trend"
              subtitle="Avg |AI Score - Human Score| for candidates with both"
              insight="Downward trend = AI is learning. Target: < 1.0 delta."
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.aiAccuracy}>
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
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0, background: 'white' }}
                    formatter={(value: number, name: string) => [
                      name === 'delta' ? value.toFixed(2) : value,
                      name === 'delta' ? 'Avg Delta' : 'Candidates'
                    ]}
                  />
                  <ReferenceLine y={1} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Target', fontSize: 10, fill: '#22c55e' }} />
                  <Line 
                    type="monotone" 
                    dataKey="delta" 
                    stroke="#111827" 
                    strokeWidth={2}
                    dot={{ r: 2, fill: '#111827' }}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </KPICard>

            {/* Graph 4: Manager Bottlenecks */}
            <KPICard
              title="Manager Bottlenecks"
              subtitle="Hours between AI review and human verification"
              insight="Measures HM accountability. Should trend toward 24h."
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.managerBottlenecks}>
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
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0, background: 'white' }}
                    formatter={(value: number, name: string) => [
                      name === 'hours' ? `${value}h` : value,
                      name === 'hours' ? 'Avg Wait' : 'Candidates'
                    ]}
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
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </KPICard>

            {/* Graph 5: HVC Quality Signal */}
            <div className="col-span-2">
              <KPICard
                title="HVC Quality Signal"
                subtitle="Cumulative % of HVCs that reached interview stage"
                insight="Validates if 'High Value' tag means anything. Higher = better targeting."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.hvcQuality}>
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
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0, background: 'white' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'rate') return [`${value}%`, 'Conversion'];
                        return [value, name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          const data = payload[0].payload as ConversionMetric;
                          return `${label} (${data.converted}/${data.total} HVCs)`;
                        }
                        return label;
                      }}
                    />
                    <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="5 5" label={{ value: '50%', fontSize: 10, fill: '#22c55e' }} />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#111827" 
                      strokeWidth={2}
                      dot={{ r: 2, fill: '#111827' }}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </KPICard>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-400">
          <p>Real-time metrics from Notion • Refreshes every 5 minutes</p>
        </footer>
      </main>
    </div>
  );
}
