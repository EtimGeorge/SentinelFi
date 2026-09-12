import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, TrendingUp, BarChart2, ShoppingBag, FileText, MoreHorizontal, LayoutDashboard } from 'lucide-react';
import { useAuth, Role } from '../../components/context/AuthContext';
import { ROLE_CONFIG } from '../../components/context/AuthContext';

const BOTTOM_TABS: Record<Role, { path: string; icon: React.ElementType; label: string }[]> = {
  [Role.SuperAdmin]: [
    { path: '/super', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/super/tenants', icon: BarChart2, label: 'Tenants' },
    { path: '/super/analytics', icon: TrendingUp, label: 'Analytics' },
    { path: '/super/audit-log', icon: FileText, label: 'Audit' },
    { path: '/super/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.CEO]: [
    { path: '/dashboard/home', icon: Home, label: 'Dashboard' },
    { path: '/financials/intelligence', icon: TrendingUp, label: 'Finance' },
    { path: '/reporting', icon: FileText, label: 'Reports' },
    { path: '/financials/approvals', icon: BarChart2, label: 'Approvals' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.CFO]: [
    { path: '/financials/intelligence', icon: TrendingUp, label: 'Finance' },
    { path: '/dashboard/home', icon: Home, label: 'Dashboard' },
    { path: '/reporting', icon: FileText, label: 'Reports' },
    { path: '/financials/approvals', icon: BarChart2, label: 'Approvals' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.AdminDirector]: [
    { path: '/dashboard/home', icon: Home, label: 'Dashboard' },
    { path: '/financials/intelligence', icon: TrendingUp, label: 'Finance' },
    { path: '/reporting', icon: FileText, label: 'Reports' },
    { path: '/admin', icon: BarChart2, label: 'Admin' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.FinanceManager]: [
    { path: '/financials/projects/wbs', icon: BarChart2, label: 'WBS' },
    { path: '/financials/projects/budgets', icon: FileText, label: 'Budgets' },
    { path: '/financials/approvals', icon: TrendingUp, label: 'Approvals' },
    { path: '/dashboard/home', icon: Home, label: 'Dashboard' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.OperationalDirector]: [
    { path: '/financials/operations/procurement', icon: ShoppingBag, label: 'Procurement' },
    { path: '/financials/operations/payroll', icon: BarChart2, label: 'Payroll' },
    { path: '/financials/operations/manage', icon: FileText, label: 'OPEX' },
    { path: '/financials/projects', icon: Home, label: 'Projects' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.TechnicalDirector]: [
    { path: '/dashboard/home', icon: Home, label: 'Dashboard' },
    { path: '/financials/intelligence', icon: TrendingUp, label: 'Finance' },
    { path: '/financials/projects', icon: BarChart2, label: 'Projects' },
    { path: '/financials/operations', icon: ShoppingBag, label: 'Operations' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.AdminManager]: [
    { path: '/dashboard/home', icon: Home, label: 'Dashboard' },
    { path: '/admin', icon: BarChart2, label: 'Admin' },
    { path: '/financials/projects', icon: FileText, label: 'Projects' },
    { path: '/admin/clients', icon: ShoppingBag, label: 'Clients' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.ProjectManager]: [
    { path: '/dashboard/home', icon: Home, label: 'Dashboard' },
    { path: '/financials/projects', icon: BarChart2, label: 'Projects' },
    { path: '/financials/projects/wbs', icon: FileText, label: 'WBS' },
    { path: '/financials/projects/budgets', icon: TrendingUp, label: 'Budgets' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.FinanceOfficer]: [
    { path: '/financials/projects/wbs', icon: BarChart2, label: 'WBS' },
    { path: '/financials/projects/budgets', icon: FileText, label: 'Budgets' },
    { path: '/financials/approvals', icon: TrendingUp, label: 'Approvals' },
    { path: '/financials/projects/expenses', icon: ShoppingBag, label: 'Expenses' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.AdminOfficer]: [
    { path: '/dashboard/home', icon: Home, label: 'Dashboard' },
    { path: '/financials/projects', icon: BarChart2, label: 'Projects' },
    { path: '/admin/clients', icon: FileText, label: 'Clients' },
    { path: '/financials/operations/manage', icon: ShoppingBag, label: 'OPEX' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
  [Role.AssignedProjectUser]: [
    { path: '/financials/expenses/new', icon: ShoppingBag, label: 'Log Expense' },
    { path: '/financials/projects/expenses', icon: FileText, label: 'My Expenses' },
    { path: '/financials/projects/wbs', icon: BarChart2, label: 'WBS' },
    { path: '/dashboard/home', icon: Home, label: 'Dashboard' },
    { path: '/settings', icon: MoreHorizontal, label: 'More' },
  ],
};

const defaultTabs = [
  { path: '/dashboard/home', icon: Home, label: 'Dashboard' },
  { path: '/financials/intelligence', icon: TrendingUp, label: 'Finance' },
  { path: '/financials/projects/wbs', icon: BarChart2, label: 'WBS' },
  { path: '/financials/operations/procurement', icon: ShoppingBag, label: 'Procurement' },
  { path: '/settings', icon: MoreHorizontal, label: 'More' },
];

export const BottomTabBar: React.FC = () => {
  const router = useRouter();
  const { user, getPrimaryRole } = useAuth();
  const primaryRole = getPrimaryRole();
  
  const tabs = primaryRole ? (BOTTOM_TABS[primaryRole] || defaultTabs) : defaultTabs;
  
  const currentPath = router.asPath.split('?')[0];
  
  if (!user) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden bg-brand-dark/95 backdrop-blur-3xl border-t border-white/5 z-[70]"
      aria-label="Mobile bottom navigation"
      role="navigation"
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {tabs.map((tab, index) => {
          const tabPath = tab.path.split('?')[0];
          const isActive = currentPath === tabPath || currentPath.startsWith(tabPath + '/');
          const Icon = tab.icon;
          
          return (
            <Link
              key={index}
              href={tab.path}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-brand-primary/20 text-brand-primary'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={2} />
              <span className="text-xs font-bold r">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;