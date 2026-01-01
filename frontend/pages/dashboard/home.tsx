import React from 'react';
// import SecuredLayout from '../../components/Layout/SecuredLayout'; // Removed - layout is now handled by root Layout.tsx
import Head from 'next/head';
import { useAuth, Role } from '../../components/context/AuthContext';
import { LayoutDashboard, Zap, FileText } from 'lucide-react';
import Link from 'next/link';

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
    <> {/* Replaced SecuredLayout with React Fragment */}
      <Head><title>Welcome | SentinelFi</title></Head>
      {/* Main card container with correct dark theme styling */}
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border-t-4 border-brand-primary text-gray-300">
        
        <h1 className="text-4xl font-extrabold text-white mb-4">
          Welcome, <span className="text-brand-primary">{user?.email.split('@')[0]}</span>!
        </h1>
        <p className="text-lg text-gray-400 mb-8">
          You are logged in as a <span className="font-semibold text-brand-secondary">{user?.role}</span>.
        </p>

        <h2 className="text-2xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">Quick Navigation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        
        <p className="mt-8 text-sm text-gray-500">
          Use the left-hand sidebar to navigate to all other application features.
        </p>
      </div>
    </> // Replaced SecuredLayout with React Fragment
  );
};

export default DashboardHome;
