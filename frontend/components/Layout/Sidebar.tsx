import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import useUIStore from '../../store/uiStore';
import { useAuth } from '../../components/context/AuthContext';
import { getNavItemsForRole, NavItem } from '../../lib/navigationMap'; // CORRECT: Import new map
import { X, ChevronsLeft, ChevronsRight } from 'lucide-react'; // CORRECT: Use lucide-react icons

// Helper component for rendering nav items, handles nesting
const NavItemLink: React.FC<{ item: NavItem, isCollapsed: boolean }> = ({ item, isCollapsed }) => {
  const router = useRouter();
  const isActive = item.exactMatch ? router.asPath === item.path : router.asPath.startsWith(item.path);

  // For now, render parent items as non-interactive headers
  if (item.children && item.children.length > 0) {
    return (
      <li className={`mt-4 mb-2 ${isCollapsed ? 'px-2' : 'px-1'}`}>
        <span className={`text-xs font-bold uppercase text-gray-500 tracking-wider ${isCollapsed ? 'hidden' : 'block'}`}>
          {item.name}
        </span>
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


const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const {
    isMobileSidebarOpen, closeMobileSidebar,
    isDesktopSidebarCollapsed, toggleDesktopSidebar
  } = useUIStore();
  
  // CORRECT: Generate nav items from the centralized map
  const navItems = user ? getNavItemsForRole(user.role) : [];

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
        aria-label="Mobile Sidebar"
      >
        <div className="flex flex-col h-full w-full p-4">
          <div className="flex-shrink-0 mb-8 mt-2 flex items-center justify-between">
            <Image height={40} width={160} src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="SentinelFi Logo" />
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
        aria-label="Desktop Sidebar"
      >
        <div className="flex flex-col h-full w-full p-4">
            <div className={`flex-shrink-0 mb-8 mt-2 flex flex-col items-center ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}>
              <Image
                height={40}
                width={160}
                className={`transition-opacity duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}
                src="/SentinelFi Logo Concept-bg-remv-logo-only.png"
                alt="SentinelFi Logo"
              />
              <h1 className={`text-xl text-white font-semibold transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-center
                      ${isDesktopSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                SentinelFi
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

export default Sidebar;
