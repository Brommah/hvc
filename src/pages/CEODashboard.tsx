import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

interface CEOMetrics {
  summary: {
    totalApplications: number;
    totalHrBacklog: number;
    avgResponseHours: number;
    candidatesAtInterview: number;
    hvcsWithScores: number;
  };
  timeToInterviewTrend: Array<{
    week: string;
    avgDays: number;
    count: number;
  }>;
  aiVsHumanTrend: Array<{
    date: string;
    avgDelta: number | null;
    count: number;
  }>;
  stageDwellTime: Array<{
    status: string;
    avgHours: number;
    count: number;
  }>;
  responseTimeTrend: Array<{
    date: string;
    avgHours: number | null;
    count: number;
  }>;
  applicationsByDay: Array<{
    date: string;
    total: number;
    [role: string]: number | string;
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeek(dateStr: string): string {
  const date = new Date(dateStr);
  return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function CEODashboard() {
  const [metrics, setMetrics] = useState<CEOMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBacklogList, setShowBacklogList] = useState(false);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/ceo-metrics');
        const data = await response.json();
        if (data.success) {
          setMetrics(data.data);
        } else {
          setError(data.error || 'Failed to load metrics');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">HR Operations</h1>
            <p className="text-sm text-gray-400 mt-1">Last 30 days</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-gray-400 hover:text-gray-900">Dashboard</Link>
            <Link to="/pending-review" className="text-sm text-gray-400 hover:text-gray-900">Pending Review</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          <div className="border border-gray-100 p-4">
            <div className="text-3xl font-light text-gray-900">{metrics.summary.totalApplications}</div>
            <div className="text-xs text-gray-400 mt-1">Applications</div>
          </div>
          <button
            onClick={() => setShowBacklogList(!showBacklogList)}
            className="border border-gray-100 p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className={`text-3xl font-light ${metrics.summary.totalHrBacklog > 10 ? 'text-red-500' : 'text-gray-900'}`}>
              {metrics.summary.totalHrBacklog}
            </div>
            <div className="text-xs text-gray-400 mt-1">HR Backlog →</div>
          </button>
          <div className="border border-gray-100 p-4">
            <div className="text-3xl font-light text-gray-900">{metrics.summary.candidatesAtInterview}</div>
            <div className="text-xs text-gray-400 mt-1">At Interview</div>
          </div>
          <div className="border border-gray-100 p-4">
            <div className={`text-3xl font-light ${metrics.summary.avgResponseHours > 48 ? 'text-red-500' : 'text-gray-900'}`}>
              {metrics.summary.avgResponseHours}h
            </div>
            <div className="text-xs text-gray-400 mt-1">Avg Response</div>
          </div>
        </div>

        {/* HR Backlog List (expandable) */}
        {showBacklogList && metrics.hrBacklogCandidates.length > 0 && (
          <div className="border border-gray-100 mb-8">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-700">HR Backlog ({metrics.hrBacklogCandidates.length})</h3>
              <span className="text-xs text-gray-400">AI ≥ 7 + HR/HM Screening</span>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Role</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">AI</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Status</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {metrics.hrBacklogCandidates.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{c.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{c.role || '—'}</td>
                      <td className="px-4 py-2 text-sm text-green-600 font-medium">{c.aiScore}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{c.status}</td>
                      <td className="px-4 py-2 text-right">
                        <a href={c.notionUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-900">
                          Open →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Graph Grid: 2x2 */}
        <div className="grid grid-cols-2 gap-6">
          
          {/* GRAPH 1: Time to Interview */}
          <div className="border border-gray-100 p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Time to Interview</h3>
            <p className="text-xs text-gray-400 mb-4">Avg days from application to interview stage, by week</p>
            
            {metrics.timeToInterviewTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={metrics.timeToInterviewTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="week" 
                    tickFormatter={(w) => formatDate(w)}
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    unit="d"
                  />
                  <Tooltip 
                    labelFormatter={formatWeek}
                    formatter={(value: number) => [`${value} days`, 'Avg Time']}
                    contentStyle={{ fontSize: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="3 3" />
                  <Bar dataKey="avgDays" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                No interview data yet
              </div>
            )}
          </div>

          {/* GRAPH 2: AI vs Human Delta */}
          <div className="border border-gray-100 p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-1">AI vs Human Score</h3>
            <p className="text-xs text-gray-400 mb-4">Avg (Human - AI) for HVCs. Zero = aligned. ({metrics.summary.hvcsWithScores} candidates)</p>
            
            {metrics.aiVsHumanTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={metrics.aiVsHumanTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    labelFormatter={formatDate}
                    formatter={(value: number) => [value, 'Δ (Human - AI)']}
                    contentStyle={{ fontSize: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                  <Line 
                    type="monotone" 
                    dataKey="avgDelta" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#8b5cf6' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                No HVCs with both scores yet
              </div>
            )}
          </div>

          {/* GRAPH 3: Stage Dwell Time */}
          <div className="border border-gray-100 p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Stage Bottlenecks</h3>
            <p className="text-xs text-gray-400 mb-4">Avg hours candidates spend in each stage (worst first)</p>
            
            {metrics.stageDwellTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart 
                  data={metrics.stageDwellTime.slice(0, 6)} 
                  layout="vertical"
                  margin={{ top: 5, right: 5, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis 
                    type="number"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    unit="h"
                  />
                  <YAxis 
                    type="category"
                    dataKey="status"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={75}
                  />
                  <Tooltip 
                    formatter={(value: number, _name: string, props: { payload: { count: number } }) => [
                      `${value}h avg (${props.payload.count} candidates)`, 
                      'Dwell Time'
                    ]}
                    contentStyle={{ fontSize: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="avgHours" radius={[0, 2, 2, 0]}>
                    {metrics.stageDwellTime.slice(0, 6).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.avgHours > 72 ? '#ef4444' : entry.avgHours > 48 ? '#f59e0b' : '#10b981'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                No stage data
              </div>
            )}
          </div>

          {/* GRAPH 4: Response Time Trend */}
          <div className="border border-gray-100 p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Response Time Trend</h3>
            <p className="text-xs text-gray-400 mb-4">Avg hours since last activity, by day added. Target: &lt;24h</p>
            
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart 
                data={metrics.responseTimeTrend.filter(d => d.avgHours !== null)} 
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  unit="h"
                />
                <Tooltip 
                  labelFormatter={formatDate}
                  formatter={(value: number) => [`${value}h`, 'Avg Response']}
                  contentStyle={{ fontSize: '12px', border: '1px solid #e5e7eb' }}
                />
                <ReferenceLine y={24} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '24h', position: 'right', fontSize: 10, fill: '#22c55e' }} />
                <Area 
                  type="monotone" 
                  dataKey="avgHours" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  fill="url(#colorResponse)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Applications by Role */}
        <div className="border border-gray-100 p-5 mt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Applications by Role</h3>
              <p className="text-xs text-gray-400 mt-0.5">Daily breakdown by position</p>
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              {Object.entries(metrics.roleBreakdown).map(([role, count]) => (
                <span key={role}>{role}: <span className="font-medium text-gray-900">{count}</span></span>
              ))}
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={metrics.applicationsByDay} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                labelFormatter={formatDate}
                contentStyle={{ fontSize: '12px', border: '1px solid #e5e7eb' }}
              />
              {metrics.roles.map((role, idx) => (
                <Area
                  key={role}
                  type="monotone"
                  dataKey={role}
                  stackId="1"
                  stroke={idx === 0 ? '#3b82f6' : '#10b981'}
                  fill={idx === 0 ? '#3b82f6' : '#10b981'}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
