import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface OverdueChartProps {
  currentAvgHours: number;
}

interface DataPoint {
  date: string;
  avgHours: number;
  label: string;
}

/**
 * Generate historical data points for the past 30 days
 * Uses the current value and simulates a trend with some variance
 */
function generateHistoricalData(currentAvg: number): DataPoint[] {
  const data: DataPoint[] = [];
  const today = new Date();
  
  // Generate 30 days of data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    let avgHours: number;
    if (i === 0) {
      // Today's actual value
      avgHours = currentAvg;
    } else {
      // Simulate historical data with realistic variance
      // Trend: slightly lower in the past, building up over time
      const baseValue = currentAvg * (0.6 + (0.4 * (30 - i) / 30));
      const variance = (Math.random() - 0.5) * baseValue * 0.3;
      avgHours = Math.max(0, Math.round(baseValue + variance));
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      avgHours,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  
  return data;
}

/**
 * Chart showing average overdue hours trend over the past month
 */
export function OverdueChart({ currentAvgHours }: OverdueChartProps) {
  const data = useMemo(
    () => generateHistoricalData(currentAvgHours),
    [currentAvgHours]
  );

  const maxValue = useMemo(
    () => Math.max(...data.map(d => d.avgHours)) * 1.1,
    [data]
  );

  return (
    <div className="bg-white border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            Avg. Overdue Hours Trend
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Last 30 days
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-amber-600">
            {currentAvgHours}h
          </div>
          <div className="text-xs text-gray-500">Today</div>
        </div>
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              domain={[0, maxValue]}
              tickFormatter={(value) => `${value}h`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#fbbf24' }}
              formatter={(value: number) => [`${value}h`, 'Avg. Overdue']}
            />
            <Area
              type="monotone"
              dataKey="avgHours"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#colorOverdue)"
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <p className="text-xs text-gray-400 mt-3 text-center">
        Historical data is simulated • Live tracking starts today
      </p>
    </div>
  );
}

