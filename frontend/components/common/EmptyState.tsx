import React from 'react';
import { Loader2, Package, BarChart2, FileText, Users, AlertTriangle, CheckCircle, XCircle, TrendingUp, ShoppingCart, Zap, Briefcase, Building2, Settings, Search, Filter, Plus, BrainCircuit, Inbox, Wallet, Activity } from 'lucide-react';

interface EmptyStateConfig {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  illustration?: React.ReactNode;
}

const ROUTE_EMPTY_STATES: Record<string, EmptyStateConfig> = {
  '/financials/intelligence': {
    icon: <BarChart2 className="w-16 h-16 text-brand-primary/50" />, title: 'No Financial Intelligence Data', subtitle: 'Connect projects and budgets to see CAPEX/OPEX analytics, variance analysis, and predictive forecasting.', primaryAction: { label: 'Go to WBS Manager', href: '/financials/projects/wbs', variant: 'primary' }, secondaryAction: { label: 'Create First Budget', href: '/financials/projects/budgets' },
  },
  '/financials/projects/wbs': {
    icon: <Package className="w-16 h-16 text-brand-secondary/50" />, title: 'WBS Structure Empty', subtitle: 'Build your hierarchical cost structure by adding top-level elements and nested children.', primaryAction: { label: 'Add First WBS Element', onClick: () => {}, variant: 'primary' }, secondaryAction: { label: 'Apply Industry Template', onClick: () => {} },
  },
  '/financials/projects/budgets': {
    icon: <Wallet className="w-16 h-16 text-alert-positive/50" />, title: 'No Budget Items', subtitle: 'Create budget drafts in the WBS Manager, then submit them for approval to see them here.', primaryAction: { label: 'Open WBS Manager', href: '/financials/projects/wbs', variant: 'primary' }, secondaryAction: { label: 'Draft New Budget', href: '/budget/draft' },
  },
  '/financials/projects/expenses': {
    icon: <Activity className="w-16 h-16 text-alert-critical/50" />, title: 'No Live Expenses', subtitle: 'Log expenses against approved WBS items to track actual spend and variance in real-time.', primaryAction: { label: 'Log New Expense', href: '/financials/expenses/new', variant: 'primary' }, secondaryAction: { label: 'View WBS Items', href: '/financials/projects/wbs' },
  },
  '/financials/operations/procurement': {
    icon: <ShoppingCart className="w-16 h-16 text-brand-primary/50" />, title: 'P2P Desk Empty', subtitle: 'Initiate requisitions to start the procure-to-pay cycle. Approved requisitions become purchase orders.', primaryAction: { label: 'Create Requisition', onClick: () => {}, variant: 'primary' }, secondaryAction: { label: 'Configure Cost Centers', href: '/financials/operations/setup' },
  },
  '/financials/approvals': {
    icon: <Inbox className="w-16 h-16 text-brand-secondary/50" />, title: 'Clean Slate', subtitle: 'No pending approvals requiring your directive. All budget drafts, requisitions, and overruns are cleared.', primaryAction: { label: 'View All Budgets', href: '/financials/projects/budgets', variant: 'secondary' }, secondaryAction: { label: 'View All Requisitions', href: '/financials/operations/procurement' },
  },
  '/financials/expenses/new': {
    icon: <Zap className="w-16 h-16 text-alert-critical/50" />, title: 'Ready to Log Expense', subtitle: 'Select a project and WBS item, then enter the expense details to record actual spend.', primaryAction: { label: 'Select Project', href: '/financials/projects', variant: 'primary' }, secondaryAction: { label: 'View WBS Structure', href: '/financials/projects/wbs' },
  },
  '/reporting': {
    icon: <FileText className="w-16 h-16 text-brand-primary/50" />, title: 'No Reports Available', subtitle: 'Generate variance analysis, CAPEX performance, and OPEX efficiency reports once you have budget and expense data.', primaryAction: { label: 'Go to Financial Intelligence', href: '/financials/intelligence', variant: 'primary' }, secondaryAction: { label: 'View Projects', href: '/financials/projects' },
  },
  '/projects': {
    icon: <Briefcase className="w-16 h-16 text-brand-primary/50" />, title: 'No Projects Yet', subtitle: 'Create your first project to start tracking budgets, expenses, and financial performance.', primaryAction: { label: 'Create Project', onClick: () => {}, variant: 'primary' }, secondaryAction: { label: 'Import from Template', onClick: () => {} },
  },
  '/dashboard/home': {
    icon: <TrendingUp className="w-16 h-16 text-brand-primary/50" />, title: 'Dashboard Empty', subtitle: 'Your financial dashboard will populate once you have projects, budgets, and expenses configured.', primaryAction: { label: 'Create First Project', href: '/projects', variant: 'primary' }, secondaryAction: { label: 'Explore WBS Manager', href: '/financials/projects/wbs' },
  },
  '/wbs': {
    icon: <Package className="w-16 h-16 text-brand-secondary/50" />, title: 'WBS Structure Empty', subtitle: 'Build your hierarchical cost structure by adding top-level elements and nested children.', primaryAction: { label: 'Add First WBS Element', onClick: () => {}, variant: 'primary' }, secondaryAction: { label: 'Apply Industry Template', onClick: () => {} },
  },
  'default': {
    icon: <Package className="w-16 h-16 text-gray-600" />, title: 'No Data Available', subtitle: 'There are no records matching your current filters or this section has not been configured yet.', primaryAction: { label: 'Refresh', onClick: () => window.location.reload(), variant: 'outline' },
  },
};

export function getEmptyStateForRoute(pathname: string): EmptyStateConfig {
  const cleanPath = pathname.split('?')[0];
  return ROUTE_EMPTY_STATES[cleanPath] || ROUTE_EMPTY_STATES['default'];
}

import Button from './Button';

interface EmptyStateProps {
  config?: EmptyStateConfig;
  pathname?: string;
  className?: string;
  onPrimaryAction?: () => void;
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  primaryAction?: EmptyStateConfig['primaryAction'];
  secondaryAction?: EmptyStateConfig['secondaryAction'];
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  config, pathname, className = '', onPrimaryAction, icon, title, subtitle, primaryAction, secondaryAction,
}) => {
  const routeConfig = config || (pathname ? getEmptyStateForRoute(pathname) : getEmptyStateForRoute('default'));
  const emptyConfig = {
    icon: icon || routeConfig.icon, title: title || routeConfig.title, subtitle: subtitle || routeConfig.subtitle, primaryAction: primaryAction || routeConfig.primaryAction, secondaryAction: secondaryAction || routeConfig.secondaryAction, illustration: routeConfig.illustration,
  };

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-24 h-24 rounded-2xl bg-brand-dark/50 border border-gray-800 flex items-center justify-center mb-6">
        {emptyConfig.illustration || emptyConfig.icon}
      </div>
      <h3 className="text-xl font-black text-white mb-2">{emptyConfig.title}</h3>
      <p className="text-gray-500 max-w-md mb-8">{emptyConfig.subtitle}</p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        {emptyConfig.primaryAction && (
          <Button
            variant={emptyConfig.primaryAction.variant || 'primary'}
            className="w-full sm:w-auto"
            onClick={emptyConfig.primaryAction.onClick || onPrimaryAction}
          >
            {emptyConfig.primaryAction.href ? (
              <a href={emptyConfig.primaryAction.href}>{emptyConfig.primaryAction.label}</a>
            ) : (
              emptyConfig.primaryAction.label
            )}
          </Button>
        )}
        {emptyConfig.secondaryAction && (
          <Button variant="ghost" className="w-full sm:w-auto">
            {emptyConfig.secondaryAction.href ? (
              <a href={emptyConfig.secondaryAction.href}>{emptyConfig.secondaryAction.label}</a>
            ) : (
              <button onClick={emptyConfig.secondaryAction.onClick}>{emptyConfig.secondaryAction.label}</button>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;