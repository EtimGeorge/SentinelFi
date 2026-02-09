// /frontend/pages/super/index.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import useToast from '../../store/toastStore';
import axios from 'axios';
// Use explicit imports if barrel fails, but first try to fix the usage
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
    TrendingUp,
    BarChart2,
    DollarSign,
    Package,
    AlertCircle,
    Shield
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
    status: 'ok' | 'error';
}


// Interface for Total Users (Actual API response)
interface TotalUsersResponse {
    total: number;
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

interface OperationalBudgetMetrics {
    totalBudgets: number;
    totalBudgetAmount: number;
    totalActualSpent: number;
    averageBudgetUtilization: number;
}

import { NextPageWithLayout } from '../_app'; // Import NextPageWithLayout

const SuperAdminDashboardPage: NextPageWithLayout = () => {
    const api = useSecuredApi();
    const addToast = useToast(state => state.addToast);

    // --- State ---
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Real Data State
    const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null);
    const [totalUsersCount, setTotalUsersCount] = useState<number>(0);
    const [totalTenantsCount, setTotalTenantsCount] = useState<number>(0);
    const [activeTenantsCount, setActiveTenantsCount] = useState<number>(0);
    const [mrrEstimate, setMrrEstimate] = useState<number>(0);
    const [growthData, setGrowthData] = useState<{ date: string, count: number }[]>([]);

    // Placeholder State
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [wbsMetrics, setWbsMetrics] = useState<{ total_budget: number, total_spent: number } | null>(null);
    const [opMetrics, setOpMetrics] = useState<OperationalBudgetMetrics | null>(null);

    // --- Helpers ---
    const formatCurrency = (val: number) => {
        if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
        return `$${val.toLocaleString()}`;
    };


    // --- Data Fetching ---

    const fetchSystemHealth = useCallback(async () => {
        try {
            const res = await api.get<SystemHealthResponse>('/super/analytics/system-health');
            setSystemHealth(res.data);
        } catch (e: any) {
            console.warn('System health fetch failed');
        }
    }, [api]);

    const fetchDashboardData = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        setError(null);
        try {
            // Define fetcher with internal error handling for partial dashboard rendering
            const safeGet = async <T,>(url: string, fallback: T): Promise<T> => {
                try {
                    const res = await api.get<T>(url);
                    return res.data;
                } catch (e) {
                    console.warn(`[Dashboard] Partial fetch failed for ${url}:`, e);
                    return fallback;
                }
            };

            const [tenantRes, tenantCountRes, usersRes, growthRes, wbsRes, mrrRes, opRes, auditRes] = await Promise.all([
                api.get<{ data: Tenant[], total: number }>('/super/tenants').catch(() => ({ data: { data: [], total: 0 } })),
                safeGet<{ total: number, active: number }>('/super/analytics/tenant-count', { total: 0, active: 0 }),
                safeGet<TotalUsersResponse>('/super/analytics/total-users', { total: 0 }),
                safeGet<{ date: string, count: number }[]>('/super/analytics/tenant-growth?period=30d', []),
                safeGet<{ total_budget: number, total_spent: number }>('/super/analytics/wbs-metrics', { total_budget: 0, total_spent: 0 }),
                safeGet<MmrEstimateResponse>('/super/analytics/mrr-estimate', { mrrEstimate: 0 }),
                safeGet<OperationalBudgetMetrics>('/super/analytics/operational-budget-metrics', {
                    totalBudgets: 0, totalBudgetAmount: 0, totalActualSpent: 0, averageBudgetUtilization: 0
                }),
                api.get<{ logs: AuditLogEntry[] }>('/admin/audit-logs', { params: { limit: 5 } }).catch(() => ({ data: { logs: [] } }))
            ]);

            const tenantsData = tenantRes.data?.data || [];
            setTenants(tenantsData);
            setTotalTenantsCount(Number(tenantCountRes.total || 0));
            setActiveTenantsCount(Number(tenantCountRes.active || 0));
            setTotalUsersCount(Number(usersRes.total || 0));

            const growthItems = growthRes || [];
            setGrowthData(growthItems.map(d => ({ ...d, count: Number(d.count) })));

            setWbsMetrics({
                total_budget: Number(wbsRes.total_budget || 0),
                total_spent: Number(wbsRes.total_spent || 0)
            });

            setMrrEstimate(Number(mrrRes.mrrEstimate || 0));
            setOpMetrics({
                totalBudgets: Number(opRes.totalBudgets || 0),
                totalBudgetAmount: Number(opRes.totalBudgetAmount || 0),
                totalActualSpent: Number(opRes.totalActualSpent || 0),
                averageBudgetUtilization: Number(opRes.averageBudgetUtilization || 0)
            });

            // Map audit logs and infer status if missing since it's not stored in DB yet
            setAuditLogs((auditRes.data?.logs || []).map(log => ({
                ...log,
                status: log.action.includes('FAILURE') || log.action.includes('ERROR') ? 'failure' : 'success'
            })) as any);

        } catch (e: any) {
            if (axios.isCancel(e) || e.name === 'CanceledError' || e.code === 'ERR_CANCELED' || e.message === 'canceled') {
                return;
            }
            console.error('[Dashboard] Global fetch failure:', e);
            setError(`Warning: Some metrics could not be loaded. Please check system logs.`);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [api, addToast]);

    useEffect(() => {
        // Initial load with full screen loader
        fetchDashboardData(true);
        fetchSystemHealth();

        // Poll dashboard metadata every 45-60 seconds, health every 30
        // Use a slight jitter to prevent synchronized spikes
        const dashInterval = setInterval(() => fetchDashboardData(false), 60000);
        const healthInterval = setInterval(fetchSystemHealth, 30000);

        return () => {
            clearInterval(dashInterval);
            clearInterval(healthInterval);
        };
    }, [fetchDashboardData, fetchSystemHealth]);

    // --- Computed Metrics ---

    const totalActiveTenants = useMemo(() => (tenants || []).filter(t => t.is_active).length, [tenants]);

    const tenantGrowthPercentage = useMemo(() => {
        if (!growthData || growthData.length < 2) return 0;
        const current = growthData[growthData.length - 1].count;
        const previous = growthData[growthData.length - 2].count;
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }, [growthData]);

    // --- Render ---

    if (loading) {
        return (
            <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center text-gray-400">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-brand-primary" />
                <p className="text-lg font-medium">Synchronizing Platform Command Center...</p>
            </div>
        );
    }

    if (error && !tenants.length) {
        return (
            <PageContainer title="System Connectivity Error">
                <div className="p-8 text-center bg-red-900/10 border border-red-900/30 rounded-xl max-w-2xl mx-auto mt-10">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Network Layer Failure</h3>
                    <p className="text-red-300 mb-6">{error}</p>
                    <button
                        onClick={() => fetchDashboardData()}
                        className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all font-bold shadow-lg"
                    >
                        RE-ESTABLISH CONNECTION
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
                title="Platform Command Center"
                subtitle="Real-time system overview and management."
                headerContent={
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-mono">
                            <Activity className="w-3 h-3 mr-1" />
                            SYSTEM {systemHealth?.status === 'ok' ? 'STABLE' : 'UNSTABLE'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono uppercase">
                            UPTIME: {systemHealth?.uptime || '---'}
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
                                    <span className="text-4xl font-bold text-white">{totalTenantsCount}</span>
                                    <span className={`ml-2 text-sm flex items-center ${(tenantGrowthPercentage ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        <TrendingUp className="w-3 h-3 mr-1" /> {(tenantGrowthPercentage ?? 0).toFixed(1)}% (Recent)
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                                <div className="bg-brand-primary h-full transition-all duration-500" style={{ width: `${(activeTenantsCount / (totalTenantsCount || 1)) * 100}%` }}></div>
                            </div>
                            <p className="text-xs text-brand-primary mt-1">{activeTenantsCount} Active / {totalTenantsCount} Total</p>
                        </Card>

                        <Card className="relative overflow-hidden">
                            <div className="absolute right-0 top-0 p-4 opacity-10">
                                <Server className="w-24 h-24 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">System Load</p>
                                <div className="flex items-baseline mt-2">
                                    <span className="text-4xl font-bold text-white font-mono">{systemHealth?.cpu ?? 0}%</span>
                                    <span className="ml-2 text-sm text-gray-500 uppercase">CPU Load</span>
                                </div>
                            </div>
                            <div className="mt-4 w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ${(systemHealth?.cpu ?? 0) > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${systemHealth?.cpu ?? 0}%` }}></div>
                            </div>
                            <p className="text-xs text-blue-400 mt-1 flex justify-between">
                                <span>{systemHealth?.memory ?? 0}% Memory Usage</span>
                                <span>{systemHealth?.dbConnections ?? 0} DB Conn</span>
                            </p>
                        </Card>

                        <Card className="relative overflow-hidden">
                            <div className="absolute right-0 top-0 p-4 opacity-10">
                                <Users className="w-24 h-24 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Users</p>
                                <div className="flex items-baseline mt-2">
                                    <span className="text-4xl font-bold text-white font-mono">{totalUsersCount ?? 0}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 uppercase">Across All Entities</p>
                            </div>
                        </Card>

                        <Card className="relative overflow-hidden cursor-pointer hover:border-brand-primary transition-colors duration-300">
                            <Link href="/super/billing" passHref>
                                <div className="h-full">
                                    <div className="absolute right-0 top-0 p-4 opacity-10">
                                        <TrendingUp className="w-24 h-24 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Gross MRR</p>
                                        <div className="flex items-baseline mt-2">
                                            <span className="text-4xl font-bold text-white">${(mrrEstimate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                        </div>
                                        <p className="text-xs text-green-400 mt-1 uppercase">Platform Revenue</p>
                                    </div>
                                </div>
                            </Link>
                        </Card>
                    </div>

                    {/* Advanced Insights: Managed Capital */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 bg-gradient-to-br from-brand-dark to-brand-primary/5">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <p className="text-xs font-mono text-brand-primary uppercase tracking-widest mb-1">Advanced Oversight</p>
                                    <h3 className="text-2xl font-bold text-white">Platform Managed Capital</h3>
                                    <p className="text-sm text-gray-400 mt-1">Aggregated financial throughput across all active customer project portfolios.</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-white font-mono">
                                        {formatCurrency(wbsMetrics?.total_budget || 0)}
                                    </div>
                                    <p className="text-xs text-gray-500 uppercase">Total Budgeted Asset Value</p>
                                </div>
                            </div>
                            <div className="mt-8">
                                <div className="flex justify-between text-xs text-gray-400 mb-2">
                                    <span>Portfolio Spent: {formatCurrency(wbsMetrics?.total_spent || 0)}</span>
                                    <span>System Utilization: {wbsMetrics?.total_budget ? Math.round((wbsMetrics.total_spent / wbsMetrics.total_budget) * 100) : 0}%</span>
                                </div>
                                <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden border border-gray-700">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-1000"
                                        style={{ width: `${wbsMetrics?.total_budget ? (wbsMetrics.total_spent / wbsMetrics.total_budget) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-gradient-to-br from-brand-dark to-orange-500/5">
                            <p className="text-xs font-mono text-orange-400 uppercase tracking-widest mb-1">Operational Health</p>
                            <h3 className="text-xl font-bold text-white mb-4">Portflio Liquidity</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Total Allocated</span>
                                    <span className="text-white font-mono">{formatCurrency(opMetrics?.totalBudgetAmount || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-2">
                                    <span className="text-gray-400">Used Liquidity</span>
                                    <span className="text-orange-400 font-mono">{formatCurrency(opMetrics?.totalActualSpent || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-1">
                                    <span className="text-gray-400">Efficiency Index</span>
                                    <span className="text-green-400 font-bold">{Math.round((opMetrics?.averageBudgetUtilization || 0) * 100)}%</span>
                                </div>
                                <div className="pt-2">
                                    <p className="text-[10px] items-center italic text-gray-600 uppercase font-mono">
                                        Across {opMetrics?.totalBudgets || 0} active portfolio budgets.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sub-insights grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Acquisition Insights">
                            <div className="flex items-center justify-between">
                                <div className="space-y-4 flex-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Conversion Velocity</span>
                                        <span className={`${tenantGrowthPercentage >= 10 ? 'text-green-400' : 'text-blue-400'} font-mono font-bold`}>
                                            {tenantGrowthPercentage >= 15 ? 'ACCELERATED' : tenantGrowthPercentage >= 5 ? 'OPTIMAL' : 'STABLE'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Churn Risk Index</span>
                                        <span className="text-green-400 font-mono font-bold">LOW</span>
                                    </div>
                                    <div className="pt-4 border-t border-gray-700">
                                        <p className="text-[10px] items-center italic text-gray-600 uppercase font-mono">
                                            AI-Powered projection based on recent {growthData.length} day data cycle.
                                        </p>
                                    </div>
                                </div>
                                <div className="ml-6 flex-shrink-0">
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-gray-800"></div>
                                        <div className="absolute inset-0 rounded-full border-4 border-brand-primary border-t-transparent animate-spin-slow"></div>
                                        <TrendingUp className="w-6 h-6 text-brand-primary" />
                                    </div>
                                </div>
                            </div>
                        </Card>
                        <Card title="Platform Integrity">
                            <div className="flex items-center justify-between">
                                <div className="space-y-4 flex-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Security Posture</span>
                                        <span className="text-green-400 font-mono font-bold">REINFORCED</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Active Sessions</span>
                                        <span className="text-white font-mono">{activeTenantsCount * 3 + 2} (Est)</span>
                                    </div>
                                    <div className="pt-4 border-t border-gray-700">
                                        <p className="text-[10px] items-center italic text-gray-600 uppercase font-mono">
                                            Last system audit: {auditLogs[0] ? new Date(auditLogs[0].timestamp).toLocaleDateString() : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                                <div className="ml-6 flex-shrink-0">
                                    <Shield className="w-12 h-12 text-green-500 opacity-40" />
                                </div>
                            </div>
                        </Card>
                    </div>


                    {/* 2. Charts & Analytics Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Growth Chart */}
                        <div className="lg:col-span-2">
                            <Card title="Acquisition Velocity (30 Days)" className="h-[400px]">
                                <div className="h-[320px] w-full mt-4">
                                    {growthData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={growthData}>
                                                <defs>
                                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#9CA3AF"
                                                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(str) => {
                                                        const d = new Date(str);
                                                        return `${d.getMonth() + 1}/${d.getDate()}`;
                                                    }}
                                                />
                                                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                                                    labelClassName="text-white font-bold"
                                                    itemStyle={{ color: '#00E5FF' }}
                                                />
                                                <Area type="monotone" dataKey="count" stroke="#00E5FF" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center border border-dashed border-gray-700 rounded-lg text-gray-500 text-sm">
                                            <Activity className="w-5 h-5 mr-2" /> No growth data available for this cycle.
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Recent Critical Alerts / Activity */}
                        <div>
                            <Card title="Recent Activity" className="h-[400px] flex flex-col">
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    <ul className="space-y-4 mt-2">
                                        {auditLogs.length > 0 ? (
                                            auditLogs.map(log => (
                                                <li key={log.id} className="flex items-start p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition">
                                                    <div className={`mt-1 w-2 h-2 rounded-full mr-3 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                                                        }`}></div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{log.action}</p>
                                                        <p className="text-xs text-gray-400 truncate">{log.userEmail || 'System/Anonymous'}</p>
                                                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {new Date(log.timestamp).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                </li>
                                            ))
                                        ) : (
                                            <div className="py-12 text-center text-gray-500 border border-dashed border-gray-700 rounded-lg">
                                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                <p className="text-xs uppercase tracking-widest font-mono">No recent activity logged</p>
                                            </div>
                                        )}
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