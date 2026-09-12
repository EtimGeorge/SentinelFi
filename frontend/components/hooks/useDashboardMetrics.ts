import { useEffect, useState, useCallback, useRef } from 'react';
import { useSecuredApi } from './useSecuredApi';
import { useAuth, Role } from '../context/AuthContext';
import useGlobalStore from '../../store/globalStore';

export interface DashboardMetrics {
  totalBudgeted: number;
  totalActualPaid: number;
  variancePercentage: number;
  burnRatePercentage: number;
  pendingApprovals: number;
  avgDailySpend?: number;
  estimatedExhaustionDate?: string | null;
  history?: { date: string; amount: number }[];
}

export interface ActivityLog {
  id: string;
  action: string;
  details: any;
  timestamp: string;
}

export interface DashboardState {
  metrics: DashboardMetrics | null;
  activities: ActivityLog[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardMetrics(): DashboardState {
  const { user, getPrimaryRole } = useAuth();
  const api = useSecuredApi();
  const { selectedProjectId } = useGlobalStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const currentFetchId = ++fetchIdRef.current;

    try {
      setLoading(true);
      setError(null);

      const role = getPrimaryRole();
      const isSuperAdmin = role === Role.SuperAdmin;
      const auditLogPath = isSuperAdmin ? '/admin/audit-logs' : '/admin/audit-logs/tenant';

      const dashboardUrl = selectedProjectId === 'all'
        ? '/dashboard/executive'
        : `/dashboard/executive?projectId=${selectedProjectId}`;

      const [execRes, summaryRes, activityRes] = await Promise.all([
        api.get(dashboardUrl),
        api.get('/dashboard/summary'),
        api.get(`${auditLogPath}?limit=5`),
      ]);

      if (currentFetchId !== fetchIdRef.current) return;

      const executiveData = execRes.data;
      setMetrics({
        ...executiveData.overview,
        history: executiveData.history,
        pendingApprovals: summaryRes.data.pendingApprovals,
      });
      setActivities(activityRes.data.logs || activityRes.data.data || []);
    } catch (err: any) {
      if (currentFetchId !== fetchIdRef.current) return;

      if (err?.response?.status === 403 || err?._isForbidden) {
        console.debug('[useDashboardMetrics] Insufficient role');
        setError(null);
      } else if (err?.name !== 'AbortError' && err?.name !== 'CanceledError') {
        setError('Failed to load dashboard data');
        console.error('[useDashboardMetrics]', err);
      }
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, api, selectedProjectId, getPrimaryRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { metrics, activities, loading, error, refetch: fetchData };
}