// /frontend/components/Layout/SuperAdminSidebar.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import useUIStore from '../../store/uiStore';
import { superAdminNavigationMap, NavItem } from '../../lib/navigationMap';
import { X, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp } from 'lucide-react';

// Helper component for rendering nav items, handles nesting
const NavItemLink: React.FC<{ item: NavItem, isCollapsed: boolean }> = ({ item, isCollapsed }) => {
  const router = useRouter();
  
  // Clean paths for comparison
  const currentPath = router.asPath.split('?')[0].split('#')[0];
  const itemPath = item.path.split('?')[0].split('#')[0];

  const isActive = item.exactMatch ? currentPath === itemPath : currentPath.startsWith(itemPath);
  
  const [isExpanded, setIsExpanded] = React.useState(false); // State to manage expansion of children

  React.useEffect(() => {
    // Expand parent if one of its children is active
    if (item.children && item.children.some(child => currentPath === child.path || currentPath.startsWith(child.path))) {
      setIsExpanded(true);
    }
  }, [item, currentPath]);

  if (item.children && item.children.length > 0) {
    return (
      <li key={item.name}>
        <div
          className={`flex items-center p-2 rounded-md transition duration-200 cursor-pointer ${
            isActive ? 'bg-brand-primary text-white' : 'hover:bg-brand-primary/20'
          }`}
          onClick={() => setIsExpanded(!isExpanded)} // Toggle expansion
          title={isCollapsed ? item.name : ''}
        >
          <item.icon className={`${isCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
          <span className={`font-medium whitespace-nowrap overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            {item.name}
          </span>
          {!isCollapsed && (isExpanded ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />)}
        </div>
        {isExpanded && item.children.length > 0 && (
          <ul className={`ml-4 mt-1 space-y-1 ${isCollapsed ? 'hidden' : 'block'}`}>
            {item.children.map(child => (
              <li key={child.name}>
                <Link
                  href={child.path}
                  className={`flex items-center p-2 rounded-md transition duration-200 ${
                    currentPath === child.path
                      ? 'bg-brand-primary text-white'
                      : 'hover:bg-brand-primary/20'
                  }`}
                >
                  <child.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="font-medium whitespace-nowrap overflow-hidden">{child.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.path}
        className={`flex items-center p-2 rounded-md transition duration-200 ${
          isActive
            ? 'bg-brand-primary text-white'
            : 'hover:bg-brand-primary/20'
        }`}
        title={isCollapsed ? item.name : ''}
      >
        <item.icon className={`${isCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
        <span className={`font-medium whitespace-nowrap overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          {item.name}
        </span>
      </Link>
    </li>
  );
};


const SuperAdminSidebar: React.FC = () => {
  const {
    isMobileSidebarOpen, closeMobileSidebar,
    isDesktopSidebarCollapsed, toggleDesktopSidebar
  } = useUIStore();
  
  // Direct use of the superAdminNavigationMap
  const navItems = superAdminNavigationMap;

  // Close mobile sidebar on navigation
  const router = useRouter();
  React.useEffect(() => {
    if (isMobileSidebarOpen) {
      closeMobileSidebar();
    }
  }, [router.asPath, isMobileSidebarOpen, closeMobileSidebar]);


  return (
    <>
      {/* Mobile Overlay Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 bg-brand-dark text-white shadow-lg z-50 transition-transform duration-300 ease-in-out
                    ${isMobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
                    md:hidden`}
        aria-label="Mobile SuperAdmin Sidebar"
      >
        <div className="flex flex-col h-full w-full p-4">
          <div className="flex-shrink-0 mb-8 mt-2 flex items-center justify-between">
            <span className="text-xl font-bold text-white">SuperAdmin</span>
            <button
              onClick={closeMobileSidebar}
              className="text-white hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary p-2 rounded-md"
              aria-label="Close sidebar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map((item) => <NavItemLink key={item.name} item={item} isCollapsed={false} />)}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-screen bg-brand-dark text-gray-300 shadow-lg z-30 transition-all duration-300 ease-in-out
                    ${isDesktopSidebarCollapsed ? 'w-20' : 'w-64'}`}
        aria-label="Desktop SuperAdmin Sidebar"
      >
        <div className="flex flex-col h-full w-full p-4">
            <div className={`flex-shrink-0 mb-8 mt-2 flex flex-col items-center ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}>
              <h1 className={`text-xl text-white font-semibold transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-center
                      ${isDesktopSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                SuperAdmin
              </h1>
            </div>

          <nav className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <ul className="space-y-2">
              {navItems.map((item) => <NavItemLink key={item.name} item={item} isCollapsed={isDesktopSidebarCollapsed} />)}
            </ul>
          </nav>

          <div className="flex-shrink-0 mt-auto pt-4 border-t border-brand-primary/30">
            <button
              onClick={toggleDesktopSidebar}
              className="w-full flex items-center justify-center p-2 rounded-md text-gray-400 hover:bg-brand-primary/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label="Toggle sidebar collapse"
            >
              {isDesktopSidebarCollapsed ? <ChevronsRight className="h-6 w-6" /> : <ChevronsLeft className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;
