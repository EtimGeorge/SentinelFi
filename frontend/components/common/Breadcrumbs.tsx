import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronRight, Home, ChevronDown, LucideIcon } from 'lucide-react';
import { navigationMap, superAdminNavigationMap, NavItem } from '../../lib/navigationMap';
import { useAuth, Role } from '../context/AuthContext';
import { useBreadcrumbs } from '../context/BreadcrumbContext';

interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
  item?: NavItem;
}

const Breadcrumbs: React.FC = () => {
  const router = useRouter();
  const { labels } = useBreadcrumbs();
  const { hasRole } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const pathSegments = useMemo(() => {
    const rawSegments = router.asPath.split('?')[0].split('/').filter(Boolean);
    return rawSegments;
  }, [router.asPath]);

  const breadcrumbs = useMemo(() => {
    const isSuperAdmin = hasRole(Role.SuperAdmin);
    const activeMap = isSuperAdmin ? superAdminNavigationMap : navigationMap;

    const items: BreadcrumbItem[] = [];

    // Always add home/dashboard as root
    const rootPath = isSuperAdmin ? '/super' : '/dashboard/home';
    items.push({
      label: 'Home',
      path: rootPath,
      isLast: pathSegments.length === 0
    });

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      // 1. Resolve label from Context (ID matching)
      let label = labels[segment] || labels[currentPath];

      // 2. Resolve from Navigation Map
      let navItem: NavItem | undefined;
      const findInMap = (map: NavItem[]): NavItem | undefined => {
        for (const item of map) {
          if (item.path === currentPath || item.path === `/${segment}`) return item;
          if (item.children) {
            const found = findInMap(item.children);
            if (found) return found;
          }
        }
        return undefined;
      };

      if (!label) {
        navItem = findInMap(activeMap);
        if (navItem) label = navItem.name;
      }

      // 3. Fallback to formatting segment
      if (!label) {
        // Detect UUID
        if (segment.length > 20 && segment.includes('-')) {
          label = `ID: ${segment.substring(0, 8)}...`;
        } else {
          label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        }
      }

      items.push({
        label,
        path: currentPath,
        isLast,
        item: navItem
      });
    });

    return items;
  }, [pathSegments, labels, hasRole]);

  if (breadcrumbs.length <= 1 && pathSegments.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-6 overflow-x-auto no-scrollbar py-1 px-1" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.path}>
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />}

          <div className="relative flex items-center group">
            {crumb.isLast ? (
              <span className="font-bold text-white px-2 py-1 rounded bg-gray-800/50 border border-gray-700/50 whitespace-nowrap">
                {crumb.label}
              </span>
            ) : (
              <div className="flex items-center">
                <Link
                  href={crumb.path}
                  className="hover:text-brand-primary transition-colors duration-200 px-2 py-1 rounded hover:bg-brand-primary/10 whitespace-nowrap flex items-center"
                >
                  {index === 0 && <Home className="w-3.5 h-3.5 mr-1.5" />}
                  {crumb.label}
                </Link>

                {/* Sibling Jump Dropdown */}
                {crumb.item?.children && crumb.item.children.length > 0 && (
                  <button
                    onMouseEnter={() => setOpenDropdown(crumb.path)}
                    className="ml-0.5 p-0.5 hover:text-white transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}

                {openDropdown === crumb.path && crumb.item?.children && (
                  <div
                    className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-1"
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    {crumb.item.children.map(child => (
                      <Link
                        key={child.path}
                        href={child.path}
                        className="flex items-center px-3 py-2 text-xs text-gray-300 hover:bg-brand-primary hover:text-white rounded-md transition"
                      >
                        <child.icon className="w-3.5 h-3.5 mr-2" />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
