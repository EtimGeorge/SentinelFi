import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { useAuth, Role } from '../../components/context/AuthContext';
import { LayoutDashboard, Zap, FileText, Bell, Clock, BarChart2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { formatCurrency } from '../../lib/utils';

interface SummaryStats {
  totalBudgeted: number;
  totalActualPaid: number;
  pendingApprovals: number;
  variancePercentage: number;
}

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  timestamp: string;
}

const DashboardHome: React.FC = () => {
  const { user, hasAnyRole, getPrimaryRole } = useAuth();
  const api = useSecuredApi();
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardContent = async () => {
      setLoading(true);
      try {
        const [statsRes, activityRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/admin/audit-logs?limit=5')
        ]);
        setStats(statsRes.data);
        setActivities(activityRes.data.logs || []);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardContent();
  }, [api]);

  const actionLinks = [
    { label: 'View Executive Dashboard', href: '/dashboard/ceo', icon: LayoutDashboard, roles: [Role.CEO, Role.Finance, Role.Admin, Role.ITHead, Role.OperationalHead] },
    { label: 'Log New Expense', href: '/expense/tracker', icon: Zap, roles: [Role.AssignedProjectUser, Role.Admin, Role.CEO, Role.Finance, Role.ITHead, Role.OperationalHead] },
    { label: 'Draft a New Budget', href: '/budget/draft', icon: FileText, roles: [Role.Finance, Role.Admin] },
    { label: 'View Financial Reports', href: '/reporting/variance', icon: LayoutDashboard, roles: [Role.Finance, Role.Admin, Role.OperationalHead, Role.CEO] },
  ];
  
  const relevantActions = actionLinks.filter(link => hasAnyRole(link.roles));

  return (
    <>
      <Head><title>Welcome | SentinelFi</title></Head>
      <PageContainer
        title={`Welcome, ${user?.email.split('@')[0]}!`}
        subtitle={`You are logged in as a ${getPrimaryRole()}.`}
      >
        <h2 className="text-2xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">Quick Navigation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {relevantActions.map((action, index) => (
            <Link 
              key={index} 
              href={action.href}
              className="flex flex-col items-center justify-center p-6 bg-brand-dark rounded-lg shadow-md hover:bg-brand-dark/60 hover:border-brand-primary/50 transition duration-150 border border-gray-700 text-center group"
            >
              <action.icon className="w-10 h-10 text-brand-primary mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-white mb-1">{action.label}</p>
              <p className="text-xs text-gray-400">Manage {action.label.split(' ').pop()} tasks</p>
            </Link>
          ))}
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">Your Summary</h2>

        {loading ? (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Recent Activity" borderTopColor="secondary">
                    <div className="space-y-3">
                        {activities.length > 0 ? (
                            activities.map(log => (
                                <p key={log.id} className="flex items-start text-sm text-gray-400">
                                    <Clock className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                    <span>
                                        <strong className="text-gray-200 capitalize">{log.action.replace(/_/g, ' ')}</strong>
                                        <br />
                                        <small className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</small>
                                    </span>
                                </p>
                            ))
                        ) : (
                            <p className="text-gray-500 text-sm">No recent activity found.</p>
                        )}
                        <Link href="/admin/audit/logs" className="text-brand-primary text-sm mt-4 block hover:underline">View All Activity</Link>
                    </div>
                </Card>
                
                <Card title="Notifications & Alerts" borderTopColor="alert">
                    <div className="space-y-3 text-gray-400">
                        {stats && stats.variancePercentage > 5 && (
                            <p className="flex items-center text-sm"><Bell className="w-4 h-4 mr-2 text-alert-critical" /> High Variance Alert: {stats.variancePercentage.toFixed(1)}%</p>
                        )}
                        {stats && stats.pendingApprovals > 0 && (
                            <p className="flex items-center text-sm"><Bell className="w-4 h-4 mr-2 text-brand-primary" /> {stats.pendingApprovals} Budget Drafts Pending</p>
                        )}
                        {(!stats || (stats.variancePercentage <= 5 && stats.pendingApprovals === 0)) && (
                            <p className="text-gray-500 text-sm">All clear! No critical alerts.</p>
                        )}
                        <Link href="/approvals" className="text-brand-primary text-sm mt-4 block hover:underline">View All Notifications</Link>
                    </div>
                </Card>

                <Card title="Financial Snapshot" borderTopColor="primary">
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Budget</p>
                            <p className="text-xl font-semibold text-white">{formatCurrency(stats?.totalBudgeted || 0)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Actual Spent</p>
                            <p className="text-xl font-semibold text-white">{formatCurrency(stats?.totalActualPaid || 0)}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-800">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">Variance</span>
                                <span className={`text-sm font-bold ${stats && stats.variancePercentage > 0 ? 'text-alert-critical' : 'text-alert-positive'}`}>
                                    {stats?.variancePercentage.toFixed(2)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 h-1.5 rounded-full mt-1">
                                <div 
                                    className={`h-1.5 rounded-full ${stats && stats.variancePercentage > 5 ? 'bg-alert-critical' : 'bg-brand-primary'}`}
                                    style={{ width: `${Math.min(100, (stats?.totalActualPaid || 0) / (stats?.totalBudgeted || 1) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        )}
        
        <p className="mt-8 text-sm text-gray-500 italic">
          Tip: You can use the left-hand sidebar for quick access to specific modules like the WBS Manager or Executive Reports.
        </p>
      </PageContainer>
    </>
  );
};

export default DashboardHome;
