import React from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { useAuth, Role } from '../../components/context/AuthContext';
import { LayoutDashboard, Zap, FileText, Bell, Clock, BarChart2 } from 'lucide-react'; // NEW: Added Bell, Clock, BarChart2
import Link from 'next/link';
import Card from '../../components/common/Card'; // NEW: Import Card

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  
  const actionLinks = [
    { label: 'View Executive Dashboard', href: '/dashboard/ceo', icon: LayoutDashboard, roles: [Role.CEO, Role.Finance, Role.Admin, Role.ITHead, Role.OperationalHead] },
    { label: 'Log New Expense', href: '/expense/tracker', icon: Zap, roles: [Role.AssignedProjectUser, Role.Admin, Role.CEO, Role.Finance, Role.ITHead, Role.OperationalHead] },
    { label: 'Draft a New Budget', href: '/budget/draft', icon: FileText, roles: [Role.Finance, Role.Admin] },
    { label: 'View Financial Reports', href: '/reporting/variance', icon: LayoutDashboard, roles: [Role.Finance, Role.Admin, Role.OperationalHead, Role.CEO] },
  ];
  
  const relevantActions = actionLinks.filter(link => user && link.roles.some(role => user.role === role));

  return (
    <>
      <Head><title>Welcome | SentinelFi</title></Head>
      <PageContainer
        title={
          <>
            Welcome, <span className="text-brand-primary">{user?.email.split('@')[0]}</span>!
          </>
        }
        subtitle={
          <>
            You are logged in as a <span className="font-semibold text-brand-secondary">{user?.role}</span>.
          </>
        }
      >
        <h2 className="text-2xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">Quick Navigation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {relevantActions.map((action, index) => (
            <Link 
              key={index} 
              href={action.href}
              className="flex items-center space-x-4 p-6 bg-brand-dark rounded-lg shadow-md hover:bg-brand-dark/60 hover:border-brand-primary/50 transition duration-150 border border-gray-700"
            >
              <action.icon className="w-8 h-8 text-brand-primary" />
              <div>
                <p className="font-bold text-lg text-white">{action.label}</p>
                <p className="text-sm text-gray-400">Proceed to the dedicated module.</p>
              </div>
            </Link>
          ))}
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">Your Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Recent Activity" borderTopColor="secondary">
            <div className="space-y-3 text-gray-400">
              <p className="flex items-center"><Clock className="w-4 h-4 mr-2" /> Logged Expense for WBS 1.1.1 (₦12,500)</p>
              <p className="flex items-center"><Clock className="w-4 h-4 mr-2" /> Budget Draft 2.0.1 Approved</p>
              <p className="flex items-center"><Clock className="w-4 h-4 mr-2" /> System Update Applied</p>
              <Link href="#" className="text-brand-primary text-sm mt-2 block hover:underline">View All Activity</Link>
            </div>
          </Card>
          <Card title="Notifications Summary" borderTopColor="alert">
            <div className="space-y-3 text-gray-400">
              <p className="flex items-center"><Bell className="w-4 h-4 mr-2 text-alert-critical" /> 2 Major Variance Alerts</p>
              <p className="flex items-center"><Bell className="w-4 h-4 mr-2 text-alert-positive" /> 1 Budget Draft Approved</p>
              <Link href="#" className="text-brand-primary text-sm mt-2 block hover:underline">View All Notifications</Link>
            </div>
          </Card>
          <Card title="Key Stats (This Month)" borderTopColor="primary">
            <div className="space-y-3 text-gray-400">
              <p className="flex items-center"><BarChart2 className="w-4 h-4 mr-2" /> Total Expenses: ₦250,000</p>
              <p className="flex items-center"><BarChart2 className="w-4 h-4 mr-2" /> Pending Approvals: 3</p>
              <p className="flex items-center"><BarChart2 className="w-4 h-4 mr-2" /> Projects On Track: 85%</p>
            </div>
          </Card>
        </div>
        
        <p className="mt-8 text-sm text-gray-500">
          Use the left-hand sidebar to navigate to all other application features.
        </p>
      </PageContainer>
    </>
  );
};

export default DashboardHome;
