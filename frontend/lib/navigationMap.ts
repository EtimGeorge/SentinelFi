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
  LucideIcon
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
    name: 'Projects',
    icon: Folders,
    path: '/projects',
    roles: ALL_ROLES,
  },
  // --- WBS & Financials Section ---
  {
    name: 'WBS Manager',
    icon: FileText,
    path: '/wbs-manager',
    roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead],
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
    roles: [Role.Admin, Role.CEO, Role.ITHead, Role.OperationalHead],
  },
  {
    name: 'Reporting',
    icon: BarChart2,
    path: '/reporting', // A parent route for reporting section
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
  // --- Administration Section ---
  {
    name: 'Admin',
    icon: Building,
    path: '/admin', // A parent route
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
