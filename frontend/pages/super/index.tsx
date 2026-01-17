// /frontend/pages/super/index.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import useToast from '../../store/toastStore';
import { 
  LayoutDashboard, 
  Loader2, 
  Building, 
  Users, 
  Clock, 
  Plus, 
  ArrowRight,
  Activity,
  AlertTriangle,
  Server,
  TrendingUp 
} from 'lucide-react';
import Link from 'next/link';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts';

// --- Interfaces ---

interface Tenant {
  tenant_id: string;
  name: string;
  schema_name: string;
  admin_email: string;
  is_active: boolean;
  created_at: string; // ISO string
}

// Interface for System Health (Actual API response)
interface SystemHealthResponse {
  cpu: number;
  memory: number;
  dbConnections: number;
  uptime: string;
}

// Interface for Total Users (Actual API response)
interface TotalUsersResponse {
  totalUsers: number;
}

// Interface for MRR Estimate (Actual API response)
interface MmrEstimateResponse {
  mrrEstimate: number;
}

// Interface for Audit Log (Actual API response)
interface AuditLogEntry {
  id: string;
  action: string;
  userEmail: string; // Use userEmail from backend
  timestamp: string;
  status: 'success' | 'failure'; // Based on backend AuditService logic
}

const SuperAdminDashboardPage: React.FC = () => {
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);

  // --- State ---
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real Data State
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse>({ cpu: 0, memory: 0, dbConnections: 0, uptime: '0h' });
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0);
  const [mrrEstimate, setMrrEstimate] = useState<number>(0);

  // Mock Data State (for now, until implemented)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // --- Data Fetching ---

  const fetchSystemHealth = useCallback(async () => {
    try {
      const res = await api.get<SystemHealthResponse>('/super/dashboard/system-health');
      setSystemHealth(res.data);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      addToast(`Error loading system health: ${msg}`, 'error');
      // Optionally set error state or keep previous health data
    }
  }, [api, addToast]);


  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Real Tenant Data
      const tenantRes = await api.get<{ tenants: Tenant[], total: number }>('/super/tenants');
      setTenants(tenantRes.data.tenants);

      // 2. Fetch System Health
      await fetchSystemHealth();

      // 3. Fetch Total Users
      const totalUsersRes = await api.get<TotalUsersResponse>('/super/dashboard/total-users');
      setTotalUsersCount(totalUsersRes.data.totalUsers);

      // 4. Fetch MRR Estimate
      const mrrRes = await api.get<MmrEstimateResponse>('/super/dashboard/mrr-estimate');
      setMrrEstimate(mrrRes.data.mrrEstimate);

      // 5. Fetch Audit Logs
      const auditRes = await api.get<{ logs: AuditLogEntry[] }>('/admin/audit/logs', { params: { limit: 5 } });
      setAuditLogs(auditRes.data.logs);

    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Failed to fetch dashboard data: ${msg}`);
      addToast(`Error loading dashboard: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast, fetchSystemHealth]);

  useEffect(() => {
    fetchDashboardData();
    // Poll for health every 30s
    const interval = setInterval(() => {
        fetchSystemHealth(); // Only fetch system health for polling
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, fetchSystemHealth]);

  // --- Computed Metrics ---

  const totalActiveTenants = useMemo(() => tenants.filter(t => t.is_active).length, [tenants]);
  
  const growthData = useMemo(() => {
    // Group tenants by month created
    const dataMap = new Map<string, number>();
    const monthYearFormat = { year: 'numeric', month: 'short' } as const;

    tenants.forEach(t => {
      const date = new Date(t.created_at);
      const key = date.toLocaleString('default', monthYearFormat);
      dataMap.set(key, (dataMap.get(key) || 0) + 1);
    });

    // Get the last 6 months (or fewer if fewer tenants) for consistent charting
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // Go back 5 months to include current
    sixMonthsAgo.setDate(1); // Start from the first day of that month

    const chartData: { name: string; value: number }[] = [];
    let currentMonth = new Date(sixMonthsAgo);

    while (currentMonth <= new Date()) {
      const key = currentMonth.toLocaleString('default', monthYearFormat);
      chartData.push({ name: key, value: dataMap.get(key) || 0 });
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    return chartData;
  }, [tenants]);

  const tenantGrowthPercentage = useMemo(() => {
    if (growthData.length < 2) return 0;
    const lastMonthTenants = growthData[growthData.length - 1].value;
    const secondLastMonthTenants = growthData[growthData.length - 2].value;

    if (secondLastMonthTenants === 0) {
      return lastMonthTenants > 0 ? 100 : 0; // If last month has tenants but previous had none, 100% growth
    }
    return ((lastMonthTenants - secondLastMonthTenants) / secondLastMonthTenants) * 100;
  }, [growthData]);

  // --- Render ---

  if (loading) {
    return (
        <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center text-gray-400">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-brand-primary" />
            <p className="text-lg font-medium">Initializing Command Center...</p>
        </div>
    );
  }

  if (error) {
    return (
        <PageContainer title="Access Error">
            <div className="p-8 text-center bg-red-900/10 border border-red-900/30 rounded-xl">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Dashboard Unavailable</h3>
                <p className="text-red-300">{error}</p>
                <button 
                    onClick={fetchDashboardData}
                    className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                >
                    Retry Connection
                </button>
            </div>
        </PageContainer>
    );
  }

  return (
    <>
      <Head>
        <title>SuperAdmin Command Center | SentinelFi</title>
      </Head>

      <PageContainer
        title="Platform Command Center" // Upgraded Title
        subtitle="Real-time system overview and management."
        headerContent={
            <div className="flex items-center space-x-2">
                <div className="flex items-center px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-mono">
                    <Activity className="w-3 h-3 mr-1" />
                    SYSTEM STABLE
                </div>
                <div className="text-xs text-gray-500 font-mono">
                    UPTIME: {systemHealth.uptime}
                </div>
            </div>
        }
      >
        <div className="space-y-8">
            
            {/* 1. Key Performance Indicators (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Building className="w-24 h-24 text-brand-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Tenants</p>
                        <div className="flex items-baseline mt-2">
                            <span className="text-4xl font-bold text-white">{tenants.length}</span>
                            <span className={`ml-2 text-sm flex items-center ${tenantGrowthPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                <TrendingUp className="w-3 h-3 mr-1" /> {tenantGrowthPercentage.toFixed(1)}% vs last month
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                        <div className="bg-brand-primary h-full" style={{ width: `${(totalActiveTenants / (tenants.length || 1)) * 100}%` }}></div>
                    </div>
                    <p className="text-xs text-brand-primary mt-1">{totalActiveTenants} Active</p>
                </Card>

                <Card className="relative overflow-hidden">
                     <div className="absolute right-0 top-0 p-4 opacity-10">
                        <Server className="w-24 h-24 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">System Load</p>
                        <div className="flex items-baseline mt-2">
                            <span className="text-4xl font-bold text-white">{systemHealth.cpu}%</span>
                            <span className="ml-2 text-sm text-gray-500">CPU Usage</span>
                        </div>
                    </div>
                     <div className="mt-4 w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                        <div className={`h-full ${systemHealth.cpu > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${systemHealth.cpu}%` }}></div>
                    </div>
                    <p className="text-xs text-blue-400 mt-1">{systemHealth.memory}% Memory Usage</p>
                </Card>

                <Card className="relative overflow-hidden">
                     <div className="absolute right-0 top-0 p-4 opacity-10">
                        <Users className="w-24 h-24 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Users</p>
                        <div className="flex items-baseline mt-2">
                            <span className="text-4xl font-bold text-white font-mono">{totalUsersCount}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Across all schemas</p>
                    </div>
                </Card>

                <Card className="relative overflow-hidden cursor-pointer hover:border-brand-primary transition-colors duration-300">
                    <Link href="/super/billing" passHref>
                        <div className="h-full">
                            <div className="absolute right-0 top-0 p-4 opacity-10">
                                <Activity className="w-24 h-24 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">MRR Estimate</p>
                                <div className="flex items-baseline mt-2">
                                    <span className="text-4xl font-bold text-white">${mrrEstimate.toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-green-400 mt-1">Stripe Integrated</p>
                            </div>
                        </div>
                    </Link>
                </Card>
            </div>

            {/* 2. Charts & Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Growth Chart */}
                <div className="lg:col-span-2">
                    <Card title="Tenant Growth Trajectory" className="h-[400px]">
                        <div className="h-[320px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growthData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="name" stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                                        labelStyle={{ color: '#F3F4F6' }}
                                        itemStyle={{ color: '#00E5FF' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#00E5FF" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Recent Critical Alerts / Activity */}
                <div>
                     <Card title="Recent Activity" className="h-[400px] flex flex-col">
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <ul className="space-y-4 mt-2">
                                {auditLogs.map(log => (
                                    <li key={log.id} className="flex items-start p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition">
                                        <div className={`mt-1 w-2 h-2 rounded-full mr-3 ${
                                            log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                                        }`}></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{log.action}</p>
                                            <p className="text-xs text-gray-400 truncate">{log.userEmail}</p>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="pt-4 border-t border-gray-700 mt-2">
                            <Link href="/super/audit-log" className="text-xs text-brand-primary hover:underline flex items-center justify-center">
                                View Full Audit Log <ArrowRight className="ml-1 w-3 h-3" />
                            </Link>
                        </div>
                     </Card>
                </div>
            </div>

            {/* 3. Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/super/tenants#create" className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl hover:bg-brand-primary/20 transition flex flex-col items-center justify-center text-center group">
                    <Plus className="w-8 h-8 text-brand-primary mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-white">New Tenant</span>
                </Link>
                <Link href="/super/settings" className="p-4 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition flex flex-col items-center justify-center text-center group">
                    <Server className="w-8 h-8 text-gray-400 mb-2 group-hover:text-white transition-colors" />
                    <span className="text-sm font-medium text-gray-400 group-hover:text-white">System Config</span>
                </Link>
                 {/* Placeholders for future quick actions */}
            </div>

        </div>
      </PageContainer>
    </>
  );
};

export default SuperAdminDashboardPage;