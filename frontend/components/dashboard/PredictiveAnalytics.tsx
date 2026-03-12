import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Zap, AlertTriangle } from 'lucide-react';
import Card from '../common/Card';
import { formatCurrency } from '../../lib/utils';

interface HistoryPoint {
  date: string;
  amount: number;
}

interface PredictiveAnalyticsProps {
  history: HistoryPoint[];
  totalBudgeted: number;
  totalActualPaid: number;
  avgDailySpend: number;
  estimatedExhaustionDate: string | null;
  currency: string;
}

const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({
  history,
  totalBudgeted,
  totalActualPaid,
  avgDailySpend,
  estimatedExhaustionDate,
  currency
}) => {
  // Compute cumulative spending for Burn-up chart
  let cumulative = 0;
  const burnUpData = history.map(h => {
    cumulative += h.amount;
    return {
      date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      spend: h.amount,
      cumulative: cumulative,
      budget: totalBudgeted
    };
  });

  const isNearingExhaustion = estimatedExhaustionDate
    ? (new Date(estimatedExhaustionDate).getTime() - new Date().getTime()) < (30 * 24 * 60 * 60 * 1000)
    : false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Burn-Up Chart */}
      <div className="lg:col-span-2">
        <Card
          title="Project Financial Trajectory (Burn-up)"
          subtitle="Cumulative spend vs Total Budgeted"
          borderTopColor="primary"
        >
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burnUpData}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative Outflow"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCumulative)"
                />
                <Line
                  type="stepAfter"
                  dataKey="budget"
                  name="Total Approved Budget"
                  stroke="#9CA3AF"
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Predictive Health Cards */}
      <div className="space-y-6">
        <Card title="Intelligence Forecaster" borderTopColor={isNearingExhaustion ? 'alert' : 'positive'}>
          <div className="space-y-6 py-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className={`w-4 h-4 ${isNearingExhaustion ? 'text-red-400' : 'text-brand-primary'}`} />
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Exhaustion Forecast</span>
              </div>
              <p className={`text-2xl font-black ${isNearingExhaustion ? 'text-red-400' : 'text-white'}`}>
                {estimatedExhaustionDate ? new Date(estimatedExhaustionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase">Based on 30-day velocity</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-gray-400" />
                  <span className="text-[9px] text-gray-500 uppercase font-bold">Daily Velocity</span>
                </div>
                <p className="text-sm font-bold text-white">{formatCurrency(avgDailySpend, currency)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3 text-gray-400" />
                  <span className="text-[9px] text-gray-500 uppercase font-bold">Burn Rate</span>
                </div>
                <p className="text-sm font-bold text-white">
                  {((totalActualPaid / (totalBudgeted || 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {isNearingExhaustion && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg flex items-start gap-3 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Critical Alert</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Budget exhaustion predicted within 30 days. Action required.</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Momentum Index" borderTopColor="secondary">
          <div className="h-[120px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={1500}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '10px' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-500 mt-2 text-center uppercase tracking-widest font-bold">Daily Spend Volatility</p>
        </Card>
      </div>
    </div>
  );
};

export default PredictiveAnalytics;
