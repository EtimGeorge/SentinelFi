import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface SystemHealth {
  cpu: number;
  memory: number;
  dbConnections: number;
  uptime: string;
}

interface GrowthData {
  value: number;
}

interface TimeSeriesData {
  date: string;
  count: number;
}

interface WbsMetrics {
  totalBudgets: number;
  totalExpenses: number;
  totalBudgetAmount: string; // Formatting for display
  totalExpenseAmount: string; // Formatting for display
  averageBudgetUtilization: string; // Percentage for display
  total_budget: number; // Keep for internal/compatibility
  total_spent: number;  // Keep for internal/compatibility
}

interface OperationalBudgetMetrics {
  totalBudgets: number;
  totalBudgetAmount: string;
  totalActualSpent: string;
  averageBudgetUtilization: string;
}

export interface SuperAdminAnalyticsData {
  tenantCount: number;
  tenantGrowth: TimeSeriesData[]; // Changed to array
  userGrowth: GrowthData;
  wbsMetrics: WbsMetrics;
  operationalBudgetMetrics: OperationalBudgetMetrics;
  systemHealth: SystemHealth;
  mrrEstimate: number;
  totalUsers: number;
  planDistribution: { name: string, value: number }[];
}


const useSuperAdminAnalytics = (period: string = '30d') => {
  const [data, setData] = useState<SuperAdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          tenantCountRes,
          tenantGrowthRes, // Now returns array
          userGrowthRes,
          wbsMetricsRes,
          opBudgetMetricsRes,
          systemHealthRes,
          mrrEstimateRes,
          totalUsersRes,
          planDistributionRes,
        ] = await Promise.all([
          api.get('/super/analytics/tenant-count', { signal: controller.signal }),
          api.get(`/super/analytics/tenant-growth?period=${period}`, { signal: controller.signal }),
          api.get(`/super/analytics/user-growth?period=${period}`, { signal: controller.signal }),
          api.get('/super/analytics/wbs-metrics', { signal: controller.signal }),
          api.get('/super/analytics/operational-budget-metrics', { signal: controller.signal }),
          api.get('/super/analytics/system-health', { signal: controller.signal }),
          api.get('/super/analytics/mrr-estimate', { signal: controller.signal }),
          api.get('/super/analytics/total-users', { signal: controller.signal }),
          api.get('/super/analytics/plan-distribution', { signal: controller.signal }),
        ]);

        if (!controller.signal.aborted) {
          // Fix: Backend returns objects { total: number } etc., not raw numbers.
          // We cast to 'any' temporarily to access properties safely, or we could update the generic types.
          const tc = tenantCountRes.data as any;
          // tg is now the array directly
          const tg = tenantGrowthRes.data as any; 
          const ug = userGrowthRes.data as any;
          const mrr = mrrEstimateRes.data as any;
          const tu = totalUsersRes.data as any;

          const wbs = wbsMetricsRes.data as any;
          setData({
            tenantCount: tc.total || 0,
            tenantGrowth: (Array.isArray(tg) ? tg : []).map(d => ({ ...d, count: Number(d.count || 0) })), 
            userGrowth: { value: Number(ug.count || 0) },
            wbsMetrics: {
               totalBudgets: wbs.total_budget ? (wbs.total_spent > 0 ? 1 : 0) : 0, // Mock count if not real
               totalExpenses: 0, // Placeholder if backend doesn't provide
               totalBudgetAmount: `$${((wbs.total_budget || 0) / 1000).toFixed(1)}k`,
               totalExpenseAmount: `$${((wbs.total_spent || 0) / 1000).toFixed(1)}k`,
               averageBudgetUtilization: wbs.total_budget ? (wbs.total_spent / wbs.total_budget).toString() : '0',
               total_budget: Number(wbs.total_budget || 0),
               total_spent: Number(wbs.total_spent || 0)
            },
            operationalBudgetMetrics: {
               ...opBudgetMetricsRes.data,
               totalBudgets: Number(opBudgetMetricsRes.data.totalBudgets || 0)
            },
            systemHealth: systemHealthRes.data,
            mrrEstimate: Number(mrr.mrrEstimate || 0),
            totalUsers: Number(tu.total || 0),
            planDistribution: Array.isArray(planDistributionRes.data) ? planDistributionRes.data : [],
          });
        }
      } catch (err: any) {
        if (axios.isCancel(err) || err.name === 'AbortError' || err.code === 'ERR_CANCELED' || err.message === 'canceled') return;
        if (!controller.signal.aborted) {
            setError(err.response?.data?.message || err.message || 'An error occurred while fetching analytics data.');
            console.error("Error fetching analytics data:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
            setLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => controller.abort();
  }, [period, user]);

  return { data, loading, error };
};

export default useSuperAdminAnalytics;
