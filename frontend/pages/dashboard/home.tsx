import React from 'react';
import SecuredLayout from '../../components/Layout/SecuredLayout';
import Head from 'next/head';
import { useAuth, Role } from '../../components/context/AuthContext';
import { LayoutDashboard, Zap, FileText } from 'lucide-react';

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  
  // Suggest links based on the user's highest access level
  const actionLinks = [
    { label: 'View Executive Dashboard', href: '/dashboard/ceo', icon: LayoutDashboard, roles: [Role.CEO, Role.Finance, Role.Admin, Role.ITHead, Role.OperationalHead] },
    { label: 'Log New Expense', href: '/expense/tracker', icon: Zap, roles: [Role.AssignedProjectUser, Role.Admin] },
    { label: 'Draft a New Budget', href: '/budget/draft', icon: FileText, roles: [Role.Finance, Role.Admin] },
    { label: 'View Financial Reports', href: '/reporting/variance', icon: LayoutDashboard, roles: [Role.Finance, Role.Admin, Role.OperationalHead] },
  ];
  
  const relevantActions = actionLinks.filter(link => user && link.roles.some(role => user.role === role));

  return (
    <SecuredLayout>
      <Head><title>Welcome | SentinelFi</title></Head>
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-brand-primary">
        
        <h1 className="text-4xl font-extrabold text-brand-dark mb-4">
          Welcome, {user?.email.split('@')[0]}!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          You are logged in as a <span className="font-semibold text-brand-secondary">{user?.role}</span>.
        </p>

        <h2 className="text-2xl font-semibold text-brand-dark mb-6 border-b pb-2">Quick Navigation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {relevantActions.map((action, index) => (
            <a key={index} href={action.href} className="flex items-center space-x-4 p-6 bg-gray-50 rounded-lg shadow-md hover:bg-brand-primary/10 transition duration-150">
              <action.icon className="w-8 h-8 text-brand-primary" />
              <div>
                <p className="font-bold text-lg text-brand-dark">{action.label}</p>
                <p className="text-sm text-gray-500">Go to your primary work area.</p>
              </div>
            </a>
          ))}
        </div>
        
        <p className="mt-8 text-sm text-gray-500">
          Use the left-hand sidebar to navigate all financial control functions.
        </p>
      </div>
    </SecuredLayout>
  );
};

export default DashboardHome;
