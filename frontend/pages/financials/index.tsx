import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../components/context/AuthContext';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Role } from '@shared/types/role.enum';
import {
  LayoutGrid, ShieldCheck, Folder, Banknote, TrendingUp, Calendar, CreditCard, ShoppingCart, CalendarClock,
} from 'lucide-react';

interface HubCard {
  label: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
  roles?: Role[];
}

const FinancialsHub: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const userRoles = user?.roles as unknown as Role[] | undefined;

  const can = (roles?: Role[]) => !roles || roles.some(r => userRoles?.includes(r));

  const cards: HubCard[] = [
    {
      label: 'Operations Ledger (OPEX)',
      subtitle: 'Operational expenditures, budget consumption, and correction.',
      href: '/financials/operations/manage',
      icon: LayoutGrid,
      roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.FinanceOfficer],
    },
    {
      label: 'OPEX Planning Matrix',
      subtitle: 'Period allocations per department and category.',
      href: '/financials/operations/planning',
      icon: CalendarClock,
      roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.FinanceOfficer],
    },
    {
      label: 'Project Hub (CAPEX)',
      subtitle: 'Projects, WBS, budgets, and project expenses.',
      href: '/financials/projects',
      icon: Folder,
      roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser],
    },
    {
      label: 'Governance Hub',
      subtitle: 'Pending budgets, overruns, requisitions, and expenses awaiting approval.',
      href: '/financials/approvals',
      icon: ShieldCheck,
      roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AdminManager],
    },
    {
      label: 'Financial Intelligence',
      subtitle: 'Burn-rate, exhaustion dates, and AI narratives.',
      href: '/financials/intelligence',
      icon: TrendingUp,
      roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager],
    },
    {
      label: 'P2P Procurement',
      subtitle: 'Requisitions, purchase orders, invoices, and payments.',
      href: '/financials/operations/procurement',
      icon: ShoppingCart,
      roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager],
    },
    {
      label: 'Payroll Desk',
      subtitle: 'Payroll runs, line items, and posting.',
      href: '/financials/operations/payroll',
      icon: CreditCard,
      roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.FinanceManager],
    },
    {
      label: 'Log Expenditure',
      subtitle: 'Record a CAPEX or OPEX expense.',
      href: '/financials/expenses/new',
      icon: Banknote,
      roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser],
    },
  ];

  const visible = cards.filter(c => can(c.roles));

  return (
    <>
      <Head>
        <title>Financials | SentinelFi</title>
      </Head>
      <PageContainer
        title="Financials"
        subtitle="Project CAPEX control, operational budgeting, procurement, and governance."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visible.map((card) => (
            <Card key={card.href} className="p-5 border-slate-800 hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-slate-800/50 rounded-lg">
                  <card.icon className="w-5 h-5 text-slate-400" />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(card.href)}
                  className="w-8 h-8 rounded p-0 text-slate-500 hover:text-white"
                >
                  <span className="sr-only">Open {card.label}</span>
                </Button>
              </div>
              <h3 className="text-base font-black text-white mb-1">{card.label}</h3>
              <p className="text-xs text-slate-400 mb-4">{card.subtitle}</p>
              <a
                href={card.href}
                className="inline-flex items-center gap-1 text-xs font-black text-brand-primary hover:text-brand-primary/80 uppercase tracking-[0.1em]"
              >
                Open <span aria-hidden="true">→</span>
              </a>
            </Card>
          ))}
          {visible.length === 0 && (
            <Card className="p-8 text-center border-slate-800">
              <p className="text-slate-400 text-sm">No financial modules available for your role.</p>
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
};

export default FinancialsHub;
