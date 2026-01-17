import {
  LayoutDashboard,
  Folders,
  ClipboardCheck,
  FileText,
  Users,
  Building,
  Settings,
  BarChart2,
  DollarSign,
  LucideIcon,
  Crown,
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

// Manually define ALL_ROLES to avoid runtime issues with Object.values on enums
const ALL_ROLES: Role[] = [
    Role.Admin,
    Role.CEO,
    Role.Finance,
    Role.ITHead,
    Role.OperationalHead,
    Role.AssignedProjectUser,
    Role.SuperAdmin, // Even if SuperAdmin doesn't use this map, it's a valid role
];

export const navigationMap: NavItem[] = [
  // --- General Section ---
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard/home',
    roles: [Role.Admin, Role.CEO, Role.Finance, Role.ITHead, Role.OperationalHead, Role.AssignedProjectUser],
    exactMatch: true,
  },
  {
    name: 'CEO Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard/ceo',
    roles: [Role.CEO, Role.Finance],
    exactMatch: true,
  },
  {
    name: 'Project Portfolio',
    icon: Folders,
    path: '/projects',
    roles: [Role.Admin, Role.CEO, Role.Finance, Role.ITHead, Role.OperationalHead, Role.AssignedProjectUser],
    exactMatch: false,
  },
  // --- Budgeting & Financials Section ---
  {
    name: 'Budgeting',
    icon: BarChart2,
    path: '/budget',
    roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.Finance, Role.AssignedProjectUser],
    children: [
        {
            name: 'WBS Manager',
            icon: FileText,
            path: '/wbs-manager',
            roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead],
        },
        {
            name: 'Budget Management',
            icon: DollarSign,
            path: '/budget/manage',
            roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.Finance, Role.AssignedProjectUser],
        },
        {
            name: 'Expense Management',
            icon: DollarSign,
            path: '/expense/manage',
            roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.Finance, Role.AssignedProjectUser],
        },
        {
            name: 'AI Draft',
            icon: BarChart2,
            path: '/budget/ai-draft',
            roles: [Role.Admin, Role.Finance],
        },
        {
            name: 'Manual Draft',
            icon: FileText,
            path: '/budget/draft',
            roles: [Role.Admin, Role.Finance, Role.AssignedProjectUser],
        },
        {
            name: 'Operational Budgets',
            icon: DollarSign,
            path: '/operational-budgets/manage',
            roles: [Role.Admin, Role.CEO, Role.Finance],
        },
    ]
  },
  {
    name: 'Expense Tracker',
    icon: DollarSign,
    path: '/expense/tracker',
    roles: [Role.Admin, Role.CEO, Role.Finance, Role.ITHead, Role.OperationalHead, Role.AssignedProjectUser],
  },
  {
    name: 'Approvals',
    icon: ClipboardCheck,
    path: '/approvals',
    roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead],
  },
  {
    name: 'Reporting',
    icon: BarChart2,
    path: '/reporting',
    roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead],
    children: [
        {
            name: 'Variance',
            icon: BarChart2,
            path: '/reporting/variance',
            roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead],
        },
        {
            name: 'Schedule',
            icon: BarChart2,
            path: '/reporting/schedule',
            roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead],
        }
    ]
  },
  // --- Administration Section (Tenant Level) ---
  {
    name: 'Admin',
    icon: Building,
    path: '/admin',
    roles: [Role.Admin, Role.ITHead, Role.CEO],
    children: [
        {
            name: 'User Management',
            icon: Users,
            path: '/admin/users',
            roles: [Role.Admin, Role.ITHead, Role.CEO],
        },
        {
            name: 'Tenant Setup',
            icon: Building,
            path: '/admin/tenant-setup',
            roles: [Role.Admin, Role.ITHead],
        },
        {
            name: 'Audit Log',
            icon: ClipboardCheck,
            path: '/admin/audit-log',
            roles: [Role.Admin, Role.ITHead],
        }
    ]
  },
// --- User Section ---
  {
    name: 'Settings',
    icon: Settings,
    path: '/settings',
    roles: ALL_ROLES,
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
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/super',
    roles: [Role.SuperAdmin],
    exactMatch: true,
  },
  {
    name: 'Tenant Management',
    icon: Building,
    path: '/super/tenants',
    roles: [Role.SuperAdmin],
  },
  {
    name: 'Global Analytics',
    icon: BarChart2,
    path: '/super/analytics',
    roles: [Role.SuperAdmin],
  },
  {
    name: 'Platform Audit Logs',
    icon: ClipboardCheck,
    path: '/super/audit-log',
    roles: [Role.SuperAdmin],
  },
  {
    name: 'Billing',
    icon: DollarSign,
    path: '/super/billing',
    roles: [Role.SuperAdmin],
  },
  {
    name: 'System Settings',
    icon: Settings,
    path: '/super/settings',
    roles: [Role.SuperAdmin],
  }
];


/**
 * Filters the navigation map based on the user's role.
 * It recursively filters children and removes parent items that have no visible children.
 * @param role The role of the current user.
 * @returns A filtered array of NavItem objects.
 */
export const getNavItemsForRole = (role: Role): NavItem[] => {
    const filterItems = (items: NavItem[]): NavItem[] => {
        return items
            .filter(item => item.roles.includes(role))
            .map(item => ({
                ...item,
                children: item.children ? filterItems(item.children) : undefined
            }))
            // Filter out parent items that have no visible children after filtering
            .filter(item => !item.children || item.children.length > 0);
    };

    return filterItems(navigationMap);
}
