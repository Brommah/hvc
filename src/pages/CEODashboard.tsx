import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface DayData {
  day: string;
  date: string;
  newCandidates: number;
  verified: number;
  avgResponseHours: number;
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

export function CEODashboard() {
  const [metrics, setMetrics] = useState<CEOMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ceo-metrics');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">Loading metrics...</div>
      </div>
    );
  }

  const stats = metrics?.summary;
  const dailyData = metrics?.dailyData || [];

  // Calculate net flow per day for bar chart
  const flowData = dailyData.map(d => ({
    day: d.day,
    net: d.newCandidates - d.verified,
    new: d.newCandidates,
    verified: d.verified,
  }));

  // Response time data
  const responseData = dailyData
    .filter(d => d.avgResponseHours > 0)
    .map(d => ({
      day: d.day,
      hours: d.avgResponseHours,
    }));

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">CEO Insights</h1>
            <p className="text-sm text-gray-400 mt-1">Last 30 days</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="/" className="text-gray-400 hover:text-gray-900">← Dashboard</a>
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="px-4 py-2 text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-10">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 mb-8 text-sm">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="border border-gray-100 p-6">
            <div className="text-4xl font-light text-gray-900">{stats?.totalNew || 0}</div>
            <div className="text-sm text-gray-400 mt-2">Applications (30d)</div>
          </div>
          <div className="border border-gray-100 p-6">
            <div className="text-4xl font-light text-gray-900">{stats?.totalVerified || 0}</div>
            <div className="text-sm text-gray-400 mt-2">Reviewed by Lynn</div>
          </div>
          <a 
            href="/awaiting-review" 
            className="border border-gray-100 p-6 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer block"
          >
            <div className={`text-4xl font-light ${(stats?.backlog || 0) > 50 ? 'text-red-500' : 'text-gray-900'}`}>
              {stats?.backlog || 0}
            </div>
            <div className="text-sm text-gray-400 mt-2">Awaiting Review →</div>
          </a>
          <div className="border border-gray-100 p-6">
            <div className={`text-4xl font-light ${(stats?.avgResponseHours || 0) > 24 ? 'text-red-500' : 'text-green-600'}`}>
              {stats?.avgResponseHours || 0}h
            </div>
            <div className="text-sm text-gray-400 mt-2">Avg Wait Time</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-8">
          {/* Daily Net Flow */}
          <div className="border border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Are We Keeping Up?</h3>
            <p className="text-xs text-gray-400 mb-6">Each bar = candidates added that day minus candidates verified. Red bars mean the backlog grew. Green bars mean we caught up.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0 }}
                    formatter={(value: number, name: string) => {
                      if (name === 'net') return [value > 0 ? `+${value}` : value, 'Net Change'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => label}
                  />
                  <ReferenceLine y={0} stroke="#e5e7eb" />
                  <Bar dataKey="net" radius={[2, 2, 0, 0]}>
                    {flowData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.net > 0 ? '#ef4444' : '#22c55e'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Response Time Trend */}
          <div className="border border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-1">How Fast Are We Responding?</h3>
            <p className="text-xs text-gray-400 mb-6">Average hours candidates wait before we contact them. Green dashed line = 24h target. Line should trend down toward it.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={responseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0 }}
                    formatter={(value: number) => [`${value}h`, 'Avg Hours']}
                  />
                  <ReferenceLine y={24} stroke="#22c55e" strokeDasharray="4 4" />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#111827" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#111827' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom insight */}
        <div className="mt-8 p-6 bg-gray-50 border border-gray-100">
          <div className="flex items-start gap-4">
            <div className={`w-3 h-3 rounded-full mt-1 ${(stats?.backlog || 0) > 100 ? 'bg-red-500' : (stats?.backlog || 0) > 50 ? 'bg-amber-500' : 'bg-green-500'}`} />
            <div>
              <p className="text-sm text-gray-900 font-medium">
                {(stats?.backlog || 0) > 100 
                  ? 'Review queue is piling up'
                  : (stats?.backlog || 0) > 50 
                    ? 'Some candidates waiting for review'
                    : 'Review queue under control'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stats?.backlog} candidates haven't been reviewed by Lynn yet (out of {stats?.totalNew} total this month).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
