import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface CEOMetrics {
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

// Color palette for roles
const ROLE_COLORS: Record<string, string> = {
  'AI Innovator': '#3b82f6',
  'Principal Fullstack Engineer': '#10b981',
  'Unknown': '#9ca3af',
};

function getRoleColor(role: string, index: number): string {
  if (ROLE_COLORS[role]) return ROLE_COLORS[role];
  const colors = ['#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
  return colors[index % colors.length];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
            <h1 className="text-2xl font-semibold text-gray-900">CEO Insights</h1>
            <p className="text-sm text-gray-400 mt-1">Last 30 days</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-gray-400 hover:text-gray-900">Dashboard</Link>
            <Link to="/pending-review" className="text-sm text-gray-400 hover:text-gray-900">Pending Review</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Summary Boxes */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          {/* Applications */}
          <div className="border border-gray-100 p-6">
            <div className="text-5xl font-light text-gray-900">{metrics.summary.totalApplications}</div>
            <div className="text-sm text-gray-400 mt-2">Applications (30d)</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(metrics.roleBreakdown).map(([role, count]) => (
                <span key={role} className="text-xs text-gray-500">
                  {role}: <span className="font-medium">{count}</span>
                </span>
              ))}
            </div>
          </div>

          {/* HR Backlog - Clickable */}
          <button
            onClick={() => setShowBacklogList(!showBacklogList)}
            className="border border-gray-100 p-6 text-left hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className={`text-5xl font-light ${metrics.summary.totalHrBacklog > 10 ? 'text-red-500' : 'text-gray-900'}`}>
              {metrics.summary.totalHrBacklog}
            </div>
            <div className="text-sm text-gray-400 mt-2">HR Backlog →</div>
            <div className="text-xs text-gray-400 mt-1">
              AI Score ≥ 7 + Status: HR Screening / HM CV Screening
            </div>
          </button>
        </div>

        {/* HR Backlog List (expandable) */}
        {showBacklogList && metrics.hrBacklogCandidates.length > 0 && (
          <div className="border border-gray-100 mb-12">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">HR Backlog Candidates ({metrics.hrBacklogCandidates.length})</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Role</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">AI Score</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Status</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {metrics.hrBacklogCandidates.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{c.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{c.role || '—'}</td>
                      <td className="px-4 py-2 text-sm text-green-600 font-medium">{c.aiScore}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{c.status}</td>
                      <td className="px-4 py-2 text-right">
                        <a
                          href={c.notionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-900 hover:underline"
                        >
                          Review →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Applications by Role per Day - Stacked Area Chart */}
        <div className="border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-1">Applications by Role</h2>
          <p className="text-sm text-gray-400 mb-6">Daily breakdown by position</p>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics.applicationsByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <Tooltip 
                labelFormatter={formatDate}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              {metrics.roles.map((role, idx) => (
                <Area
                  key={role}
                  type="monotone"
                  dataKey={role}
                  stackId="1"
                  stroke={getRoleColor(role, idx)}
                  fill={getRoleColor(role, idx)}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* HR Backlog Trend - Bar Chart */}
        <div className="border border-gray-100 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-1">HR Backlog Trend</h2>
          <p className="text-sm text-gray-400 mb-6">New HVCs entering backlog per day (AI ≥ 7, in HR/HM Screening)</p>
          
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.backlogTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <Tooltip 
                labelFormatter={formatDate}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
              <Bar 
                dataKey="count" 
                name="New Backlog" 
                fill="#ef4444" 
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
