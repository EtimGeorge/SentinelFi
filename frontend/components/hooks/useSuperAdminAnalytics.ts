import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface SystemHealth {
  cpu: number;
  memory: number;
  dbConnections: number;
  uptime: string;
}

interface GrowthData {
  value: number;
}

interface WbsMetrics {
  totalBudgets: number;
  totalExpenses: number;
  totalBudgetAmount: string;
  totalExpenseAmount: string;
  averageBudgetUtilization: string;
}

interface OperationalBudgetMetrics {
  totalBudgets: number;
  totalBudgetAmount: string;
  totalActualSpent: string;
  averageBudgetUtilization: string;
}

export interface SuperAdminAnalyticsData {
  tenantCount: number;
  tenantGrowth: GrowthData;
  userGrowth: GrowthData;
  wbsMetrics: WbsMetrics;
  operationalBudgetMetrics: OperationalBudgetMetrics;
  systemHealth: SystemHealth;
  mrrEstimate: number;
  totalUsers: number;
}

const useSuperAdminAnalytics = (period: string = '30d') => {
  const [data, setData] = useState<SuperAdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          tenantCountRes,
          tenantGrowthRes,
          userGrowthRes,
          wbsMetricsRes,
          opBudgetMetricsRes,
          systemHealthRes,
          mrrEstimateRes,
          totalUsersRes,
        ] = await Promise.all([
          api.get('/super/analytics/tenant-count'),
          api.get(`/super/analytics/tenant-growth?period=${period}`),
          api.get(`/super/analytics/user-growth?period=${period}`),
          api.get('/super/analytics/wbs-metrics'),
          api.get('/super/analytics/operational-budget-metrics'),
          api.get('/super/analytics/system-health'),
          api.get('/super/analytics/mrr-estimate'),
          api.get('/super/analytics/total-users'),
        ]);

        setData({
          tenantCount: tenantCountRes.data,
          tenantGrowth: { value: tenantGrowthRes.data },
          userGrowth: { value: userGrowthRes.data },
          wbsMetrics: wbsMetricsRes.data,
          operationalBudgetMetrics: opBudgetMetricsRes.data,
          systemHealth: systemHealthRes.data,
          mrrEstimate: mrrEstimateRes.data,
          totalUsers: totalUsersRes.data,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'An error occurred while fetching analytics data.');
        console.error("Error fetching analytics data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  return { data, loading, error };
};

export default useSuperAdminAnalytics;
