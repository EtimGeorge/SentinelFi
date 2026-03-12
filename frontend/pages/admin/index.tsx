import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PageContainer from '../../components/Layout/PageContainer';
import { 
  Building, 
  Users, 
  BarChart3, 
  MessageSquare, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Zap, 
  LifeBuoy,
  LayoutDashboard,
  LucideIcon,
  Loader2
} from 'lucide-react';
import Card from '../../components/common/Card';
import { useAuth } from '../../components/context/AuthContext';
import { useCurrency } from '../../components/context/CurrencyContext';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardStat {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  color: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const api = useSecuredApi();
  const { convertToDisplay, convertAmount, userCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [executive, setExecutive] = useState<any>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantRes, summaryRes, execRes] = await Promise.all([
        api.get('/admin/tenants/my'),
        api.get('/dashboard/summary'),
        api.get('/dashboard/executive')
      ]);
      setTenantData(tenantRes.data);
      setSummary(summaryRes.data);
      setExecutive(execRes.data);
    } catch (error) {
      console.error('Dashboard synchronization failure:', error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stats: DashboardStat[] = useMemo(() => [
    { 
      label: 'Operational Liquidity', 
      value: summary ? convertToDisplay(summary.totalBudgeted) : '---', 
      change: 'Active Budget', 
      isPositive: true, 
      icon: Building, 
      color: 'text-blue-400' 
    },
    { 
      label: 'Throughput Variance', 
      value: summary ? `${Math.abs(summary.variancePercentage).toFixed(1)}%` : '---', 
      change: summary?.variancePercentage >= 0 ? 'Over projection' : 'Under projection', 
      isPositive: summary?.variancePercentage < 10, // Highlight if variance is high
      icon: BarChart3, 
      color: 'text-brand-primary' 
    },
    { 
      label: 'Pending Dispatches', 
      value: summary?.pendingApprovals?.toString() || '0', 
      change: 'Awaiting Action', 
      isPositive: true, 
      icon: Clock, 
      color: 'text-orange-400' 
    },
    { 
      label: 'Daily Burn Rate', 
      value: executive?.overview?.avgDailySpend ? convertToDisplay(executive.overview.avgDailySpend) : '---', 
      change: 'Avg. Intensity', 
      isPositive: true, 
      icon: Zap, 
      color: 'text-purple-400' 
    }
  ], [summary, executive, convertToDisplay]);

  const activityData = useMemo(() => {
    if (!executive?.history) return [];
    return executive.history.map((h: any) => ({
      name: new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' }),
      value: convertAmount(h.amount, 'USD', userCurrency.code)
    }));
  }, [executive, convertAmount, userCurrency]);

  return (
    <>
      <Head>
        <title>Intelligence Dashboard | SentinelFi</title>
      </Head>
      <PageContainer
        title="Intelligence Dashboard"
        subtitle={`Command center for ${tenantData?.name || 'Infrastructure Management'}`}
        headerContent={<LayoutDashboard className="w-8 h-8 text-brand-primary/80" />}
      >
        <div className="space-y-6">
          {/* Top Row: Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {loading ? (
              Array(4).fill(0).map((_, i) => <div key={i} className="h-32 bg-gray-800/30 rounded-2xl animate-pulse" />)
            ) : (
              stats.map((stat, i) => (
                <StatCard key={i} stat={stat} />
              ))
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Operational Chart */}
            <div className="lg:col-span-2 space-y-6">
              <Card title="Operational Intensity & Throughput" subtitle="Aggregated spending patterns across the last 30 operational cycles.">
                <div className="h-[300px] w-full mt-4">
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                       <Loader2 className="w-8 h-8 animate-spin text-brand-primary/50" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activityData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="name" stroke="#9CA3AF" tick={{fill: '#9CA3AF', fontSize: 10}} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF', fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(val) => `${userCurrency.symbol}${val > 1000 ? (val/1000).toFixed(1)+'k' : val}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                          itemStyle={{ color: '#00E5FF', fontWeight: 'bold' }}
                          formatter={(value: number) => [convertToDisplay(value, userCurrency.code), 'Throughput']}
                          labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#00E5FF" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} animationDuration={1500} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              {/* Advanced Signal Row (New) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Card className="bg-brand-primary/5 border-brand-primary/10">
                    <div className="flex items-center gap-3">
                       <Zap className="w-5 h-5 text-brand-primary" />
                       <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest">Efficiency Prediction</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">Based on current throughput, your infrastructure utilization is optimized. No immediate scaling required.</p>
                 </Card>
                 <Card className="bg-blue-500/5 border-blue-500/10">
                    <div className="flex items-center gap-3">
                       <ShieldCheck className="w-5 h-5 text-blue-400" />
                       <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Registry Integrity</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">Identity records are synchronized across all nodes. Zero anomalies detected in last 24h.</p>
                 </Card>
              </div>
            </div>

            {/* Support Hub Sidebar */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-brand-dark to-brand-primary/15 border-brand-primary/30 shadow-[0_0_30px_rgba(var(--brand-primary-rgb),0.1)]">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-brand-primary/20 rounded-xl">
                    <LifeBuoy className="w-6 h-6 text-brand-primary" />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight uppercase">Landlord Support</h3>
                </div>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  Facing technical infrastructure challenges? Directly communicate with the SuperAdmin team.
                </p>
                <Link href="/admin/support" passHref>
                  <button className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 text-brand-dark rounded-2xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-brand-primary/20 flex items-center justify-center space-x-2 text-sm uppercase tracking-widest">
                    <MessageSquare className="w-4 h-4" />
                    <span>Launch Helpdesk</span>
                  </button>
                </Link>
              </Card>

              <Card title="Operational Control">
                <div className="space-y-4">
                  <QuickNavLink 
                    href="/admin/users" 
                    icon={Users} 
                    label="Team & Registry" 
                    desc="Identity management & RBAC" 
                  />
                  <QuickNavLink 
                    href="/admin/clients" 
                    icon={Building} 
                    label="Client Portfolio" 
                    desc="Manage external client nodes" 
                  />
                  <QuickNavLink 
                    href="/admin/audit-log" 
                    icon={Clock} 
                    label="Audit Registry" 
                    desc="Consolidated security logs" 
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

// --- Sub-components ---

const zapIcon = Zap; // Helper for mapping

const StatCard: React.FC<{ stat: DashboardStat }> = ({ stat }) => (
  <Card className="hover:border-white/20 transition-colors group">
    <div className="flex justify-between items-start">
      <div className={`p-2 rounded-lg bg-gray-800 group-hover:bg-brand-dark transition-colors`}>
        <stat.icon className={`w-6 h-6 ${stat.color}`} />
      </div>
      {stat.isPositive ? (
        <span className="text-green-400 text-xs font-medium flex items-center">
          <ArrowUpRight className="w-3 h-3 mr-1" /> {stat.change}
        </span>
      ) : (
        <span className="text-red-400 text-xs font-medium flex items-center">
          <ArrowDownRight className="w-3 h-3 mr-1" /> {stat.change}
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-sm font-medium text-gray-500">{stat.label}</p>
      <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
    </div>
  </Card>
);

const QuickNavLink: React.FC<{ href: string, icon: LucideIcon, label: string, desc: string }> = ({ href, icon: Icon, label, desc }) => (
  <Link href={href} className="flex items-center p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition group border border-transparent hover:border-white/5">
    <div className="p-2 bg-gray-700/50 rounded-lg mr-4 group-hover:bg-brand-primary/10 transition">
      <Icon className="w-5 h-5 text-gray-400 group-hover:text-brand-primary" />
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-bold text-white">{label}</h4>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
    <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
  </Link>
);

export default AdminDashboard;
