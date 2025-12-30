import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface CEOMetrics {
  summary: {
    totalApplications: number;
    totalHrBacklog: number;
    totalOverdueHvc: number;
  };
  applicationsByDay: Array<{
    date: string;
    total: number;
    [role: string]: number | string;
  }>;
  backlogTrend: Array<{
    date: string;
    count: number;
    newItems: number;
  }>;
  overdueHvcTrend: Array<{
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
  const navigate = useNavigate();

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
            <h1 className="text-2xl font-semibold text-gray-900">HR Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Last 30 days</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/pending-review" className="text-sm text-gray-400 hover:text-gray-900">Pending Review</Link>
            <Link to="/overdue-hvc" className="text-sm text-gray-400 hover:text-gray-900">Overdue HVCs</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Applications Chart */}
        <div className="border border-gray-100 p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-light text-gray-900">{metrics.summary.totalApplications}</span>
                <span className="text-lg text-gray-400">Applications</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Last 30 days by role</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-right">
              {Object.entries(metrics.roleBreakdown).map(([role, count]) => (
                <span key={role} className="text-sm text-gray-500">
                  {role}: <span className="font-medium text-gray-900">{count}</span>
                </span>
              ))}
            </div>
          </div>
          
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

        {/* Two clickable graph sections */}
        <div className="grid grid-cols-2 gap-8">
          {/* HR Backlog - Clicks into Pending Review */}
          <div 
            onClick={() => navigate('/pending-review')}
            className="border border-gray-100 p-6 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-4xl font-light ${metrics.summary.totalHrBacklog > 10 ? 'text-red-500' : 'text-gray-900'}`}>
                    {metrics.summary.totalHrBacklog}
                  </span>
                  <span className="text-lg text-gray-400">Pending Review</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">AI ≥ 7, awaiting human review</p>
              </div>
              <span className="text-sm text-gray-400">View all →</span>
            </div>
            
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={metrics.backlogTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBacklog" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip 
                  labelFormatter={formatDate}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [value, 'Pending']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#colorBacklog)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Overdue HVCs - Clicks into Overdue HVC page */}
          <div 
            onClick={() => navigate('/overdue-hvc')}
            className="border border-gray-100 p-6 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-4xl font-light ${(metrics.summary.totalOverdueHvc || 0) > 5 ? 'text-red-500' : 'text-gray-900'}`}>
                    {metrics.summary.totalOverdueHvc || 0}
                  </span>
                  <span className="text-lg text-gray-400">Overdue HVCs</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">No contact in 24h+</p>
              </div>
              <span className="text-sm text-gray-400">View all →</span>
            </div>
            
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={metrics.overdueHvcTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip 
                  labelFormatter={formatDate}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [value, 'Overdue']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#colorOverdue)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
