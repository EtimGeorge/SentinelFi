import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import useUIStore from '../../store/uiStore';
import { getStaticNavItemsForRole, NavItem } from '../../lib/navigationMap';
import { getPrimaryRoleFromUser, loadUserFromStorage } from '../../lib/navigationUtils';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

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

  const hasActiveChild = item.children?.some(child => currentPath === child.path || currentPath.startsWith(child.path)) ?? false;
  const parentActive = isActive || hasActiveChild;

  if (item.children && item.children.length > 0) {
    return (
      <li key={item.name}>
        <div
          className={`relative flex items-center justify-center px-1 py-2 rounded-lg transition duration-200 cursor-pointer text-[13px] ${parentActive ? 'bg-brand-primary text-white font-semibold shadow-[0_0_12px_rgba(13,148,136,0.4)]' : 'text-gray-400 hover:bg-white/5 hover:text-white font-medium'
            }`}
          onClick={() => setIsExpanded(!isExpanded)} // Toggle expansion
          title={isCollapsed ? item.name : ''}
          aria-expanded={isExpanded}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } }}
        >
          {parentActive && !isCollapsed && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-white" aria-hidden="true" />
          )}
          <item.icon className={`${isCollapsed ? 'mx-auto' : 'mr-2.5'} h-4 w-4 flex-shrink-0`} strokeWidth={parentActive ? 2.25 : 2} />
          <span className={`whitespace-nowrap overflow-hidden ${isCollapsed ? 'hidden' : 'w-auto opacity-100'}`}>
            {item.name}
          </span>
          {!isCollapsed && (isExpanded ? <ChevronUp className="ml-auto h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0" />)}
        </div>
        {isExpanded && item.children.length > 0 && (
          <ul className={`ml-3 mt-1 space-y-0.5 border-l border-white/10 pl-2 ${isCollapsed ? 'hidden' : 'block'}`}>
            {item.children.map(child => {
              const childActive = currentPath === child.path || currentPath.startsWith(child.path);
              return (
              <li key={child.name}>
                <Link
                  href={child.path}
                  aria-current={childActive ? 'page' : undefined}
                  className={`flex items-center px-2 py-1.5 rounded-md transition duration-200 text-xs ${childActive
                    ? 'bg-brand-primary/20 text-white font-semibold'
                    : 'text-gray-500 hover:bg-white/5 hover:text-white font-normal'
                    }`}
                >
                  <child.icon className="mr-2 h-3.5 w-3.5 flex-shrink-0" strokeWidth={childActive ? 2.25 : 2} />
                  <span className="whitespace-nowrap overflow-hidden truncate">{child.name}</span>
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.path}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex items-center justify-center px-1 py-2 rounded-lg transition duration-200 text-[13px] ${isActive
          ? 'bg-brand-primary text-white font-semibold shadow-[0_0_12px_rgba(13,148,136,0.4)]'
          : 'text-gray-400 hover:bg-white/5 hover:text-white font-medium'
          }`}
        title={isCollapsed ? item.name : ''}
      >
        {isActive && !isCollapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-white" aria-hidden="true" />
        )}
        <item.icon className={`${isCollapsed ? 'mx-auto' : 'mr-2.5'} h-4 w-4 flex-shrink-0`} strokeWidth={isActive ? 2.25 : 2} />
        <span className={`whitespace-nowrap overflow-hidden ${isCollapsed ? 'hidden' : 'w-auto opacity-100'}`}>
          {item.name}
        </span>
      </Link>
    </li>
  );
};


import useGlobalStore from '../../store/globalStore';
import { useCurrency } from '../../components/context/CurrencyContext';
import { ProjectContextSelector } from '../common/ProjectContextSelector';

const Sidebar: React.FC = () => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isNavReady, setIsNavReady] = useState(false);

  const {
    isMobileSidebarOpen, closeMobileSidebar
  } = useUIStore();

  const { userCurrency, availableCurrencies, setUserCurrencyCode } = useCurrency();

  // Initialize navigation items (projects come from the shared directory
  // inside ProjectContextSelector — one cached request serves all mounts).
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
      } catch (error) {
        console.error('[Sidebar] Failed to init nav:', error);
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
        className={`fixed inset-y-0 left-0 bg-brand-dark/95 backdrop-blur-3xl border-r border-white/5 text-white elev-lg z-[60] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${isMobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
                    lg:hidden`}
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
                  sizes="40px"
                  className="object-contain p-1 elev-lg"
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

          <nav className="flex-1 overflow-y-auto" data-tour="sidebar-nav">
            <ul className="space-y-2">
              {navItems.map((item) => <NavItemLink key={item.name} item={item} isCollapsed={false} />)}
            </ul>
          </nav>

          {/* Workspace context (project + currency) - mobile drawer only; desktop keeps header pickers */}
          <div className="flex-shrink-0 mt-auto pt-4 border-t border-brand-primary/30">
            <div className="flex items-center gap-3 mb-3" aria-hidden="true">
              <span className="text-xs font-bold  text-gray-500 whitespace-nowrap">Workspace</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="space-y-2">
              <label className="block">
                <span className="text-xs font-bold  text-gray-500">Active Project</span>
                <div className="mt-1">
                  <ProjectContextSelector variant="drawer" className="w-full" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-bold  text-gray-500">Currency</span>
                <select
                  value={userCurrency?.code || ''}
                  onChange={(e) => { setUserCurrencyCode(e.target.value); closeMobileSidebar(); }}
                  className="mt-1 w-full bg-brand-darker border border-gray-700 rounded-lg py-2 px-2 text-xs text-brand-primary font-bold focus:border-brand-primary outline-none transition cursor-pointer"
                  aria-label="Display Currency"
                >
                  {availableCurrencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </aside>

      
    </>
  );
};

export default Sidebar;