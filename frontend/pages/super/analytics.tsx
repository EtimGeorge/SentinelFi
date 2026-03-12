import React, { useState } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import useSuperAdminAnalytics from '../../components/hooks/useSuperAdminAnalytics';
import { 
  BarChart2, 
  TrendingUp, 
  Users, 
  Building, 
  DollarSign, 
  Package, 
  Server, 
  AlertCircle,
  Activity,
  Shield
} from 'lucide-react';

import { 
  Tooltip, 
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  ResponsiveContainer
} from 'recharts';

import { Spinner } from '../../components/common/Spinner'; // Assuming a Spinner component exists

// A simple, reusable stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeColor?: string;
  subValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, changeColor, subValue }) => (
  <Card>
    <div className="flex items-center">
      <div className="p-3 rounded-full bg-gray-700 mr-4">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
      </div>
    </div>
    {change && (
      <div className={`mt-2 text-xs flex items-center ${changeColor}`}>
        <TrendingUp className="w-4 h-4 mr-1" />
        {change}
      </div>
    )}
  </Card>
);

import { NextPageWithLayout } from '../_app'; // Import NextPageWithLayout

const SuperAdminAnalyticsPage: NextPageWithLayout = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const { data, loading, error } = useSuperAdminAnalytics(timeRange);

  return (
    <>
      <Head>
        <title>Platform Analytics | SentinelFi SuperAdmin</title>
      </Head>

      <PageContainer
        title="Global Analytics"
        subtitle="Deep dive into platform usage, growth, and performance metrics."
        headerContent={<BarChart2 className="w-8 h-8 text-brand-primary/80" />}
      >
        <div className="flex justify-end mb-4">
          <div className="flex items-center space-x-2 bg-gray-800 p-1 rounded-lg">
            {['24h', '7d', '30d', '1y'].map((period) => (
              <button
                key={period}
                onClick={() => setTimeRange(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeRange === period
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700'
                }`}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 bg-red-900/20 rounded-lg">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-500 font-semibold">Failed to load analytics data</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 1. Top Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Total Tenants"
                value={data.tenantCount}
                icon={<Building className="w-6 h-6 text-blue-400" />}
                change={`+${data.tenantGrowth.reduce((acc, curr) => acc + curr.count, 0)} in last ${timeRange}`}
                changeColor="text-green-400"
              />
              <StatCard 
                title="Total Users"
                value={data.totalUsers}
                icon={<Users className="w-6 h-6 text-teal-400" />}
                change={`+${data.userGrowth.value} in last 30d`}
                changeColor="text-green-400"
              />
              <StatCard 
                title="Est. MRR"
                value={`${(data.mrrEstimate / 1000).toFixed(1)}k`}
                icon={<DollarSign className="w-6 h-6 text-green-400" />}
              />
               <StatCard 
                title="CPU / Memory"
                value={`${data.systemHealth.cpu}% / ${data.systemHealth.memory}%`}
                icon={<Server className="w-6 h-6 text-indigo-400" />}
                subValue={`Uptime: ${data.systemHealth.uptime}`}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              <Card title="Global Project Throughput (WBS)" borderTopColor="primary">
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <StatCard title="Total WBS Nodes" value={data.wbsMetrics.total_budget ? (data.wbsMetrics.total_spent > 0 ? 'ACTIVE' : 'READY') : '---'} icon={<Package className="w-5 h-5 text-brand-primary"/>} />
                  <StatCard title="Total Capital Managed" value={data.wbsMetrics.totalBudgetAmount} icon={<DollarSign className="w-5 h-5 text-green-400"/>} />
                  <StatCard title="Cumulative Expenses" value={data.wbsMetrics.totalExpenseAmount} icon={<TrendingUp className="w-5 h-5 text-blue-400"/>} />
                  <StatCard title="System Burn Rate" value={`${Math.round(parseFloat(data.wbsMetrics.averageBudgetUtilization) * 100)}%`} icon={<Activity className="w-5 h-5 text-orange-400"/>} />
                </div>
                 <div className="mt-4 w-full bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700">
                    <div className="bg-brand-primary h-full transition-all duration-1000" style={{ width: `${data.wbsMetrics.total_budget ? (data.wbsMetrics.total_spent / data.wbsMetrics.total_budget) * 100 : 0}%` }}></div>
                 </div>
              </Card>

              <Card title="Platform Operational Liquidity" borderTopColor="alert">
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <StatCard title="Total Op. Budgets" value={data.operationalBudgetMetrics.totalBudgets || 0} icon={<Package className="w-5 h-5 text-orange-400"/>} />
                  <StatCard title="Total Allocated" value={`$${((parseFloat(data.operationalBudgetMetrics.totalBudgetAmount) || 0) / 1000).toFixed(1)}k`} icon={<DollarSign className="w-5 h-5 text-green-400"/>} />
                   <StatCard title="Total Utilization" value={`$${((parseFloat(data.operationalBudgetMetrics.totalActualSpent) || 0) / 1000).toFixed(1)}k`} icon={<Activity className="w-5 h-5 text-purple-400"/>} />
                   <StatCard title="Average Efficiency" value={`${Math.round(parseFloat(data.operationalBudgetMetrics.averageBudgetUtilization) * 100)}%`} icon={<Shield className="w-5 h-5 text-teal-400"/>} />
                </div>
                 <div className="mt-4 w-full bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700">
                    <div className="bg-teal-500 h-full transition-all duration-1000" style={{ width: `${parseFloat(data.operationalBudgetMetrics.averageBudgetUtilization) * 100}%` }}></div>
                 </div>
              </Card>
            </div>


            {/* 3. Charts - Placeholder for future implementation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Acquisition Velocity (Tenant Growth)">
                <div className="h-64 w-full">
                  {data.tenantGrowth.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.tenantGrowth}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          stroke="#6b7280" 
                          fontSize={12} 
                          tickFormatter={(str) => {
                            const date = new Date(str);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ color: '#9ca3af' }}
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#3b82f6" 
                          fillOpacity={1} 
                          fill="url(#colorCount)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <p>No growth data available for this period.</p>
                    </div>
                  )}
                </div>
              </Card>
              <Card title="Subscription Concentration" subtitle="Breakdown of active customer tiers.">
                <div className="h-64 w-full">
                  {data.planDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.planDistribution}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.planDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                           itemStyle={{ color: '#fff' }}
                        />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                       <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
                       <p className="text-xs uppercase font-mono">Insufficient Cluster Data</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

          </div>
        ) : null}
      </PageContainer>
    </>
  );
};



export default SuperAdminAnalyticsPage;

