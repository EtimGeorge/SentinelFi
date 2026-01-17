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
  AlertCircle
} from 'lucide-react';
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

const SuperAdminAnalyticsPage: React.FC = () => {
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
                change={`+${data.tenantGrowth.value} in last 30d`}
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
            
            {/* 2. Financial & WBS Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              <Card title="Global WBS Metrics">
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <StatCard title="Total WBS Budgets" value={data.wbsMetrics.totalBudgets} icon={<Package className="w-5 h-5 text-purple-400"/>} />
                  <StatCard title="Total WBS Expenses" value={data.wbsMetrics.totalExpenses} icon={<Package className="w-5 h-5 text-purple-400"/>} />
                  <StatCard title="Total Budget Amount" value={`${(parseFloat(data.wbsMetrics.totalBudgetAmount) / 1000).toFixed(1)}k`} icon={<DollarSign className="w-5 h-5 text-green-400"/>} />
                  <StatCard title="Total Expense Amount" value={`${(parseFloat(data.wbsMetrics.totalExpenseAmount) / 1000).toFixed(1)}k`} icon={<DollarSign className="w-5 h-5 text-green-400"/>} />
                </div>
                 <div className="mt-4 text-center text-sm text-gray-400">
                  Average Budget Utilization: <span className="font-bold text-lg text-white">{parseFloat(data.wbsMetrics.averageBudgetUtilization) * 100}%</span>
                </div>
              </Card>
              <Card title="Global Operational Budget Metrics">
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <StatCard title="Total Op. Budgets" value={data.operationalBudgetMetrics.totalBudgets} icon={<Package className="w-5 h-5 text-orange-400"/>} />
                  <StatCard title="Total Budget Amount" value={`${(parseFloat(data.operationalBudgetMetrics.totalBudgetAmount) / 1000).toFixed(1)}k`} icon={<DollarSign className="w-5 h-5 text-green-400"/>} />
                   <StatCard title="Total Actual Spent" value={`${(parseFloat(data.operationalBudgetMetrics.totalActualSpent) / 1000).toFixed(1)}k`} icon={<DollarSign className="w-5 h-5 text-green-400"/>} />
                </div>
                 <div className="mt-4 text-center text-sm text-gray-400">
                  Average Budget Utilization: <span className="font-bold text-lg text-white">{parseFloat(data.operationalBudgetMetrics.averageBudgetUtilization) * 100}%</span>
                </div>
              </Card>
            </div>

            {/* 3. Charts - Placeholder for future implementation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Acquisition Velocity (Chart)">
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <BarChart2 className="w-10 h-10 mb-2" />
                  <p>Chart data API needs to be enhanced to return time-series data.</p>
                </div>
              </Card>
              <Card title="Subscription Distribution (Chart)">
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <BarChart2 className="w-10 h-10 mb-2" />
                   <p>API for plan distribution data is required.</p>
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

