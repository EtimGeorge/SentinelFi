import {
  LayoutDashboard, LayoutGrid, Folders, ShieldCheck, TrendingUp, LineChart, PieChart, BarChart2, BarChart3, Receipt, Files, ClipboardList, ClipboardCheck, ScrollText, Network, Banknote, Briefcase, CalendarClock, ShoppingCart, CreditCard, Gauge, Cog, Crown, Contact, Eye, TrendingDown, Newspaper, Settings, Code2, Wrench, Globe, Activity,
  // probe-globe
  TentTree, Gavel, Building2, Building, Users, Presentation, Scale, CircleDollarSign, Archive, Command, LifeBuoy, LucideIcon, Shield, DollarSign, FileText, Satellite, BookOpen,
} from 'lucide-react';
import { Role } from '@shared/types/role.enum'; // Corrected import

export interface NavItem {
  name: string;
  icon: LucideIcon;
  path: string;
  roles: Role[]; // Roles that can see this link
  children?: NavItem[]; // For nested menus
  exactMatch?: boolean; // If true, path must be an exact match
}

// Manually define ALL_TENANT_ROLES to avoid runtime issues with Object.values on enums
const ALL_TENANT_ROLES: Role[] = [
    Role.CEO, Role.CFO, Role.AdminDirector, Role.OperationalDirector, Role.TechnicalDirector, Role.FinanceManager, Role.AdminManager, Role.ProjectManager, Role.FinanceOfficer, Role.AdminOfficer, Role.AssignedProjectUser,
];

const ALL_ROLES: Role[] = [
    Role.SuperAdmin,
    ...ALL_TENANT_ROLES,
];

export const navigationMap: NavItem[] = [
  // ── Overview ────────────────────────────────────────────────────────────────
  {
    name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/home', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser], exactMatch: true,
  },
  {
    name: 'Financials Hub', icon: LayoutGrid, path: '/financials', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.FinanceOfficer, Role.AssignedProjectUser], exactMatch: true,
  },
  {
    name: 'Governance Hub', icon: ShieldCheck, path: '/financials/approvals', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AdminManager], exactMatch: true,
  },
  // ── Projects: portfolio + per-project financial control (merged
  //    "Project Portfolio" and "Project Financials" — they described the same
  //    domain from two doors) ─────────────────────────────────────────────────
  {
    name: 'Projects', icon: Folders, path: '/projects', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser], children: [
      {
        name: 'Portfolio Overview', icon: Folders, path: '/projects', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser], exactMatch: true,
      },
      {
        name: 'Project Hub', icon: Command, path: '/financials/projects', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser], exactMatch: true,
      },
      {
        name: 'WBS Designer', icon: Network, path: '/financials/projects/wbs', roles: [Role.CEO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector],
      },
      {
        name: 'Project Budgets', icon: Banknote, path: '/financials/projects/budgets', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser],
      },
      {
        name: 'Project Analytics', icon: BarChart3, path: '/financials/projects/analytics', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager],
      },
      {
        name: 'Project Ledger (CAPEX)', icon: Files, path: '/financials/projects/expenses', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser],
      },
      {
        name: 'Log Expense', icon: Banknote, path: '/financials/expenses/new', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser], exactMatch: true,
      },
    ]
  },
  // ── Insights & Reporting: merged "Financial Intelligence" (CAPEX dashboard)
  //    with the Reporting section so analysis lives under one roof ────────────
  {
    name: 'Insights & Reporting', icon: LineChart, path: '/reporting', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector], children: [
      {
        name: 'Reporting Hub', icon: Presentation, path: '/reporting', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector], exactMatch: true,
      },
  {
    name: 'Financial Intelligence', icon: TrendingUp, path: '/financials/intelligence', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager, Role.TechnicalDirector, Role.OperationalDirector],
  },
  {
    name: 'Cash Flow Forecasting', icon: Activity, path: '/financials/intelligence/cash-flow', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager, Role.TechnicalDirector, Role.OperationalDirector],
  },
      {
        name: 'Variance Analysis', icon: Scale, path: '/reporting/variance', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector],
      },
      {
        name: 'CAPEX Performance', icon: CircleDollarSign, path: '/reporting/capex', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector],
      },
      {
        name: 'OPEX Efficiency', icon: PieChart, path: '/reporting/opex', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector],
      },
      {
        name: 'Document Archive', icon: Archive, path: '/reporting/archive', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector],
      }
    ]
  },
  // ── Corporate Operations: OPEX lifecycle (absorbed "Operations Ledger (OPEX)"
  //    from the old Expenses group) ────────────────────────────────────────────
  {
    name: 'Corporate Operations', icon: Briefcase, path: '/financials/operations', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager], children: [
        {
                name: 'Operations Ledger (OPEX)', icon: Banknote, path: '/financials/operations/manage', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager],
        },
        {
                name: 'OPEX Planning', icon: CalendarClock, path: '/financials/operations/planning', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager],
        },
        {
            name: 'P2P Procurement', icon: ShoppingCart, path: '/financials/operations/procurement', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager],
        },
        {
            name: 'Vendor Master', icon: Building2, path: '/financials/operations/vendors', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager],
        },
        {
            name: 'Payroll Desk', icon: CreditCard, path: '/financials/operations/payroll', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.FinanceManager],
        },
        {
            name: 'Corporate Analytics', icon: Gauge, path: '/financials/operations/analytics', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.OperationalDirector, Role.TechnicalDirector, Role.FinanceManager],
        },
        {
            name: 'Fiscal Setup', icon: Wrench, path: '/financials/operations/setup', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.FinanceManager],
        },
        {
            name: 'Chart of Accounts', icon: BookOpen, path: '/financials/operations/chart-of-accounts', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager, Role.AdminManager],
        },
        {
            name: 'Bank Accounts', icon: Banknote, path: '/financials/operations/bank-accounts', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.FinanceManager],
        },
        {
            name: 'Bank Reconciliation', icon: ShieldCheck, path: '/financials/operations/bank-reconciliation', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.FinanceManager],
        },
        {
            name: 'Budget Virements', icon: TrendingUp, path: '/financials/operations/virement', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.FinanceManager],
        },
        {
            name: 'Trial Balance', icon: Scale, path: '/financials/operations/trial-balance', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager],
        },
        {
            name: 'Account Ledger', icon: BookOpen, path: '/financials/operations/account-ledger', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager],
        },
        {
            name: 'Journal Entries', icon: BookOpen, path: '/financials/operations/journal-entries', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager],
        },
        {
            name: 'Balance Sheet', icon: Scale, path: '/financials/operations/balance-sheet', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager],
        },
        {
            name: 'Income Statement', icon: TrendingUp, path: '/financials/operations/income-statement', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager],
        },
    ]
  },
  // ── Administration (Tenant Level) ───────────────────────────────────────────
  {
    name: 'Admin', icon: Crown, path: '/admin', roles: [Role.CEO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector], children: [
        {
            name: 'Command Center', icon: LifeBuoy, path: '/admin', roles: [Role.CEO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector], exactMatch: true,
        },
        {
            name: 'Team Management', icon: Users, path: '/admin/users', roles: [Role.CEO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector],
        },
        {
            name: 'Client Infrastructure', icon: Building2, path: '/admin/clients', roles: [Role.CEO, Role.AdminDirector, Role.AdminManager, Role.CFO],
        },
        {
            name: 'Security Audit Log', icon: ScrollText, path: '/admin/audit-log', roles: [Role.CEO, Role.AdminDirector, Role.TechnicalDirector],
        },
        {
            name: 'Landlord Support', icon: LifeBuoy, path: '/admin/support', roles: [Role.CEO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector],
        }
    ]
  },
  // ── Utilities (bottom of the rail) ──────────────────────────────────────────
  {
    name: 'Documentation', icon: FileText, path: '/docs', roles: ALL_ROLES, exactMatch: false,
  },
  {
    name: 'Settings', icon: Settings, path: '/settings', roles: ALL_ROLES,
  },
];



/**
 * =================================================================
 * SUPER ADMIN NAVIGATION MAP
 * A dedicated, comprehensive, and scalable navigation structure for the SuperAdmin interface.
 * =================================================================
 */
export const superAdminNavigationMap: NavItem[] = [
  {
    name: 'Dashboard', icon: LayoutDashboard, path: '/super', roles: [Role.SuperAdmin], exactMatch: true,
  },
  {
    name: 'Tenant Management', icon: Building2, path: '/super/tenants', roles: [Role.SuperAdmin],
  },
  {
    name: 'Archive', icon: Archive, path: '/super/archive', roles: [Role.SuperAdmin], exactMatch: true,
  },
  {
    name: 'Global Analytics', icon: BarChart3, path: '/super/analytics', roles: [Role.SuperAdmin],
  },
  {
    name: 'Platform Audit Logs', icon: ScrollText, path: '/super/audit-log', roles: [Role.SuperAdmin],
  },
  {
    name: 'Billing', icon: DollarSign, path: '/super/billing', roles: [Role.SuperAdmin],
  },
  {
    name: 'Provisioning Ops', icon: Satellite, path: '/super/provisioning', roles: [Role.SuperAdmin], exactMatch: true,
  },
  {
    name: 'System Settings', icon: Settings, path: '/super/settings', roles: [Role.SuperAdmin],
  },
  {
    name: 'Documentation', icon: FileText, path: '/docs', roles: [Role.SuperAdmin], exactMatch: false,
  }
];


// ============================================================================
// NAVIGATION CACHE - Prevent recomputation of navigation items
// ============================================================================

/**
 * Cache for computed navigation maps per role
 * This prevents expensive filtering operations on every render
 */
const navigationCache = new Map<Role, NavItem[]>();

/**
 * Runtime mapping for legacy roles that may still exist in user JWT tokens
 * until the database migration script is executed.
 * After running `yarn db:migrate-roles:execute`, this can be safely removed.
 */
const LEGACY_ROLE_MAP: Record<string, Role> = {
  'Admin': Role.AdminDirector,
  'Finance': Role.FinanceManager,
  'IT Head': Role.TechnicalDirector,
};

/**
 * Filters the navigation map based on the user's role.
 * It recursively filters children and removes parent items that have no visible children.
 * Handles legacy role translation for backward compatibility.
 * @param role The role of the current user.
 * @returns A filtered array of NavItem objects.
 */
export const getNavItemsForRole = (role: Role): NavItem[] => {
    // If SuperAdmin, return the dedicated map
    if (role === Role.SuperAdmin) {
        return superAdminNavigationMap;
    }

    // Translate legacy role to Enterprise equivalent if needed
    const effectiveRole = LEGACY_ROLE_MAP[role as string] || role;

    const filterItems = (items: NavItem[]): NavItem[] => {
        return items
            .filter(item => item.roles.includes(effectiveRole))
            .map(item => ({
                ...item, children: item.children ? filterItems(item.children) : undefined
            }))
            // Filter out parent items that have no visible children after filtering
            .filter(item => !item.children || item.children.length > 0);
    };

    return filterItems(navigationMap);
}

/**
 * Get navigation items with caching for optimal performance
 * Use this function instead of getNavItemsForRole when performance matters
 * @param role The role of the current user
 * @returns Cached navigation items for the role
 */
export const getStaticNavItemsForRole = (role: Role): NavItem[] => {
    // Return from cache if exists
    if (navigationCache.has(role)) {
        return navigationCache.get(role)!;
    }

    // Compute and cache
    const items = getNavItemsForRole(role);
    navigationCache.set(role, items);
    
    return items;
}

/**
 * Clear the navigation cache
 * Call this when navigation structure changes at runtime
 */
export const clearNavigationCache = (): void => {
    navigationCache.clear();
}
