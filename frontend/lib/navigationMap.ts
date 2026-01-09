import {
  LayoutDashboard,
  Folders,
  ClipboardCheck,
  FileText,
  Users,
  Building,
  Settings,
  BarChart2, // Ensure BarChart2 is imported for the Budgeting parent and AI Draft
  DollarSign,
  LucideIcon,
  Crown, // NEW: Import Crown icon for SuperAdmin
} from 'lucide-react';
import { Role } from '../components/context/AuthContext';

export interface NavItem {
  name: string;
  icon: LucideIcon;
  path: string;
  roles: Role[]; // Roles that can see this link
  children?: NavItem[]; // For nested menus
  exactMatch?: boolean; // If true, path must be an exact match
}

const ALL_ROLES = Object.values(Role);

export const navigationMap: NavItem[] = [
  // --- General Section ---
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard/home',
    roles: ALL_ROLES,
    exactMatch: true,
  },
  {
    name: 'CEO Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard/ceo',
    roles: [Role.CEO, Role.Finance, Role.SuperAdmin], // Added SuperAdmin
    exactMatch: true,
  },
  {
    name: 'Project Portfolio',
    icon: Folders,
    path: '/projects',
    roles: ALL_ROLES,
    exactMatch: false,
  },
  // --- Budgeting & Financials Section ---
  {
    name: 'Budgeting',
    icon: BarChart2,
    path: '/budget',
    roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.Finance, Role.AssignedProjectUser, Role.SuperAdmin],
    children: [
        {
            name: 'WBS Manager',
            icon: FileText,
            path: '/wbs-manager',
            roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.SuperAdmin],
        },
        {
            name: 'Budget Management',
            icon: DollarSign,
            path: '/budget/manage',
            roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.Finance, Role.AssignedProjectUser, Role.SuperAdmin],
        },
        {
            name: 'Expense Management',
            icon: DollarSign,
            path: '/expense/manage',
            roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.Finance, Role.AssignedProjectUser, Role.SuperAdmin],
        },
        {
            name: 'AI Draft',
            icon: BarChart2,
            path: '/budget/ai-draft',
            roles: [Role.Admin, Role.Finance, Role.SuperAdmin],
        },
        {
            name: 'Manual Draft',
            icon: FileText,
            path: '/budget/draft',
            roles: [Role.Admin, Role.Finance, Role.AssignedProjectUser, Role.SuperAdmin],
        },
        {
            name: 'Operational Budgets',
            icon: DollarSign,
            path: '/operational-budgets/manage',
            roles: [Role.Admin, Role.CEO, Role.Finance, Role.SuperAdmin],
        },
    ]
  },
  {
    name: 'Expense Tracker',
    icon: DollarSign,
    path: '/expense/tracker',
    roles: ALL_ROLES,
  },
  {
    name: 'Approvals',
    icon: ClipboardCheck,
    path: '/approvals',
    roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.SuperAdmin],
  },
  {
    name: 'Reporting',
    icon: BarChart2,
    path: '/reporting',
    roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.SuperAdmin],
    children: [
        {
            name: 'Variance',
            icon: BarChart2,
            path: '/reporting/variance',
            roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.SuperAdmin],
        },
        {
            name: 'Schedule',
            icon: BarChart2,
            path: '/reporting/schedule',
            roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead, Role.SuperAdmin],
        }
    ]
  },
  // --- Super Admin Section (NEW) ---
  {
    name: 'Super Admin',
    icon: Crown,
    path: '/super', // Parent route for super admin functionalities
    roles: [Role.SuperAdmin], // Only SuperAdmin can see this section
    children: [
        {
            name: 'Tenant Management',
            icon: Building,
            path: '/super/tenants',
            roles: [Role.SuperAdmin],
        },
    ]
  },
  // --- Administration Section ---
  {
    name: 'Admin',
    icon: Building,
    path: '/admin',
    roles: [Role.Admin, Role.ITHead, Role.CEO, Role.SuperAdmin],
    children: [
        {
            name: 'User Management',
            icon: Users,
            path: '/admin/users',
            roles: [Role.Admin, Role.ITHead, Role.CEO, Role.SuperAdmin],
        },
        {
            name: 'Tenant Setup',
            icon: Building,
            path: '/admin/tenant-setup',
            roles: [Role.Admin, Role.ITHead, Role.SuperAdmin], // Added SuperAdmin
        },
        {
            name: 'Audit Log',
            icon: ClipboardCheck,
            path: '/admin/audit-log',
            roles: [Role.Admin, Role.ITHead, Role.SuperAdmin],
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