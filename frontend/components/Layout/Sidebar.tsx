import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import useUIStore from '../../store/uiStore';
import { getStaticNavItemsForRole, NavItem } from '../../lib/navigationMap';
import { getPrimaryRoleFromUser, loadUserFromStorage } from '../../lib/navigationUtils';
import { X, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, Shield } from 'lucide-react';

// Helper component for rendering nav items, handles nesting
const NavItemLink: React.FC<{ item: NavItem, isCollapsed: boolean }> = ({ item, isCollapsed }) => {
  const router = useRouter();

  // Clean paths for comparison
  const currentPath = router.asPath.split('?')[0].split('#')[0];
  const itemPath = item.path.split('?')[0].split('#')[0];

  const isActive = item.exactMatch ? currentPath === itemPath : currentPath.startsWith(itemPath);

  const [isExpanded, setIsExpanded] = useState(false); // State to manage expansion of children

  useEffect(() => {
    // Expand parent if one of its children is active
    if (item.children && item.children.some(child => currentPath === child.path || currentPath.startsWith(child.path))) {
      setIsExpanded(true);
    }
  }, [item, currentPath]);

  if (item.children && item.children.length > 0) {
    return (
      <li key={item.name}>
        <div
          className={`flex items-center p-3 rounded-xl transition duration-300 cursor-pointer ${isActive ? 'bg-brand-primary/90 text-white shadow-[0_0_15px_rgba(13,148,136,0.3)]' : 'hover:bg-white/5 hover:text-white'
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
                  className={`flex items-center p-2 rounded-md transition duration-200 ${currentPath === child.path
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
        className={`flex items-center p-3 rounded-xl transition duration-300 ${isActive
          ? 'bg-brand-primary/90 text-white shadow-[0_0_15px_rgba(13,148,136,0.3)]'
          : 'hover:bg-white/5 hover:text-white'
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


import useGlobalStore from '../../store/globalStore';
import { useCurrency } from '../../components/context/CurrencyContext';
import api from '../../lib/api';

const Sidebar: React.FC = () => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isNavReady, setIsNavReady] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  const {
    isMobileSidebarOpen, closeMobileSidebar,
    isDesktopSidebarCollapsed, toggleDesktopSidebar
  } = useUIStore();

  const { selectedProjectId, setSelectedProjectId } = useGlobalStore();
  const { userCurrency, availableCurrencies, setUserCurrencyCode } = useCurrency();

  // Initialize navigation items and fetch projects
  useEffect(() => {
    const initializeSidebar = async () => {
      try {
        const cachedUser = loadUserFromStorage();
        if (cachedUser) {
          const role = getPrimaryRoleFromUser(cachedUser);
          if (role) {
            const items = getStaticNavItemsForRole(role);
            setNavItems(items);
            setIsNavReady(true);
          }
        }

        // Fetch projects for global selector
        const res = await api.get('/projects?limit=100');
        setProjects(res.data.projects || []);
      } catch (error) {
        console.error('[Sidebar] Failed to initialize:', error);
      }
    };

    initializeSidebar();
  }, []);

  // ============================================================================
  // ADVANCED: Multi-tab synchronization for navigation
  // Update navigation when user logs in/out in another tab
  // ============================================================================
  useEffect(() => {
    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel('sentinelfi_auth_sync');

      channel.onmessage = (event) => {
        const type = event.data?.type;

        if (type === 'LOGIN') {
          // User logged in another tab - update navigation
          const newUser = event.data.user;
          if (newUser) {
            const role = getPrimaryRoleFromUser(newUser);
            if (role) {
              const items = getStaticNavItemsForRole(role);
              setNavItems(items);
              console.log('[Sidebar] Navigation updated from multi-tab login');
            }
          }
        } else if (type === 'LOGOUT') {
          // User logged out in another tab - clear navigation
          setNavItems([]);
          console.log('[Sidebar] Navigation cleared from multi-tab logout');
        }
      };
    } catch (e) {
      // BroadcastChannel not supported, graceful degradation
      console.warn('[Sidebar] BroadcastChannel not supported for multi-tab sync');
    }

    return () => {
      if (channel) channel.close();
    };
  }, []); // ZERO DEPENDENCIES - permanent listener

  // Close mobile sidebar on navigation
  const router = useRouter();
  React.useEffect(() => {
    const handleRouteChange = () => {
      closeMobileSidebar();
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, closeMobileSidebar]);


  return (
    <>
      {/* Mobile Overlay Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 bg-brand-dark/95 backdrop-blur-3xl border-r border-white/5 text-white shadow-2xl z-[60] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${isMobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
                    md:hidden`}
        aria-label="Mobile Sidebar"
        aria-modal="true"
        role="dialog"
      >
        <div className="flex flex-col h-full w-full p-4">
          <div className="flex-shrink-0 mb-8 mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 p-1.5 bg-brand-darker border border-white/10 rounded-xl">
                <Image 
                  src="/SentinelFi Logo Concept-bg-remv-logo-only.png" 
                  alt="SentinelFi Logo" 
                  fill
                  className="object-contain p-1 shadow-2xl"
                />
              </div>
              <span className="text-xl font-black tracking-tighter text-white uppercase font-sora">
                SENTINEL<span className="text-alert-critical">FI</span>
              </span>
            </div>
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
        className={`hidden md:flex flex-col h-screen bg-brand-dark/90 backdrop-blur-2xl border-r border-white/5 text-gray-300 shadow-[20px_0_40px_rgba(0,0,0,0.2)] z-30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${isDesktopSidebarCollapsed ? 'w-20' : 'w-64'}`}
        aria-label="Desktop Sidebar"
      >
        <div className="flex flex-col h-full w-full p-4">
          <div className={`flex-shrink-0 mb-8 mt-2 flex flex-col items-center ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}>
            {!isDesktopSidebarCollapsed && (
              <div className="flex items-center gap-3 animate-in fade-in duration-500">
                <div className="relative w-10 h-10 p-1.5 bg-brand-darker border border-white/10 rounded-xl transition-all duration-500 hover:border-brand-primary/50 shadow-2xl">
                  <Image 
                    src="/SentinelFi Logo Concept-bg-remv-logo-only.png" 
                    alt="SentinelFi Logo" 
                    fill
                    className="object-contain p-1"
                  />
                </div>
                {!isDesktopSidebarCollapsed && (
                  <span className="text-xl font-black tracking-tighter text-white uppercase font-sora">
                    SENTINEL<span className="text-alert-critical">FI</span>
                  </span>
                )}
              </div>
            )}
            {isDesktopSidebarCollapsed && (
              <div className="p-2 bg-brand-primary rounded-lg animate-in zoom-in duration-300">
                <Shield className="w-6 h-6 text-white" />
              </div>
            )}
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