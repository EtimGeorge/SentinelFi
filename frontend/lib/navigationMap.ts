import {
  LayoutDashboard, LayoutGrid, Folders, ShieldCheck, TrendingUp, LineChart, PieChart, BarChart2, BarChart3, Wallet, Receipt, Files, ClipboardList, ClipboardCheck, ScrollText, Network, Banknote, Briefcase, CalendarClock, ShoppingCart, CreditCard, Gauge, Cog, Crown, Contact, Eye, TrendingDown, Newspaper, Settings, Code2, Wrench, Globe,
  // probe-globe
  TentTree, Gavel, Building2, Building, Users, Presentation, Scale, CircleDollarSign, Archive, Command, LifeBuoy, LucideIcon, Shield, DollarSign, FileText,
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
  // --- General Section ---
  {
    name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/home', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser], exactMatch: true,
  },
  {
    name: 'Governance Hub', icon: ShieldCheck, path: '/financials/approvals', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AdminManager], exactMatch: true,
  },
  {
    name: 'Project Portfolio', icon: Folders, path: '/projects', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser], exactMatch: false,
  },
  {
    name: 'Financial Intelligence', icon: TrendingUp, path: '/financials/intelligence', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager, Role.TechnicalDirector, Role.OperationalDirector], exactMatch: false,
  },
  // --- Expenses Section (Consolidated CAPEX/OPEX) ---
  {

    name: 'Expenses', icon: Wallet, path: '/financials/expenses', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser], children: [
      {
        name: 'Log Expense', icon: Banknote, path: '/financials/expenses/new', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser], exactMatch: true,
      },
      {
        name: 'Project Ledger (CAPEX)', icon: Files, path: '/financials/projects/expenses', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser],
      },
      {
        name: 'Operations Ledger (OPEX)', icon: Banknote, path: '/financials/operations/manage', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.FinanceManager],
      },
    ]
  },
  // --- Global Financial Control Section ---
  {
    name: 'Project Financials', icon: LayoutGrid, path: '/financials/projects', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager, Role.AssignedProjectUser], children: [
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
    ]
  },
  {
    name: 'Corporate Operations', icon: Briefcase, path: '/financials/operations', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager], children: [
        {
                name: 'OPEX Planning', icon: CalendarClock, path: '/financials/operations/planning', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager],
        },
        {
            name: 'P2P Procurement', icon: ShoppingCart, path: '/financials/operations/procurement', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.OperationalDirector, Role.FinanceManager],
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
    ]
  },
  {
    name: 'Reporting', icon: Presentation, path: '/reporting', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector], children: [
      {
        name: 'Intelligence Hub', icon: LineChart, path: '/reporting', roles: [Role.CEO, Role.CFO, Role.AdminDirector, Role.TechnicalDirector, Role.OperationalDirector], exactMatch: true,
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
  // --- Administration Section (Tenant Level) ---
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
// --- User Section ---
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
    name: 'Global Analytics', icon: BarChart3, path: '/super/analytics', roles: [Role.SuperAdmin],
  },
  {
    name: 'Platform Audit Logs', icon: ScrollText, path: '/super/audit-log', roles: [Role.SuperAdmin],
  },
  {
    name: 'Billing', icon: DollarSign, path: '/super/billing', roles: [Role.SuperAdmin],
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
