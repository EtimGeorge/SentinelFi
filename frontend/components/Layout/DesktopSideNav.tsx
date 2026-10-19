import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ChevronsRight, ChevronDown, ChevronUp } from 'lucide-react';
import { getStaticNavItemsForRole, superAdminNavigationMap, NavItem } from '../../lib/navigationMap';
import { getPrimaryRoleFromUser, loadUserFromStorage } from '../../lib/navigationUtils';
import useGlobalStore from '../../store/globalStore';

/**
 * ============================================================================
 * DesktopSideNav — Chrome-style side panel (desktop only, lg: / 1024px+)
 * ============================================================================
 *
 * Two-mode dynamic layout:
 *  - HOVER OVERLAY: mouse intent over the rail expands it to 240px as a fixed
 *    overlay (z-50). The layout space reserved for the rail stays 64px.
 *  - CLICK PUSH: clicking the Expand Tab pins the rail open at 240px IN FLOW
 *    via the wrapper (which transitions its reserved width in sync), actively
 *    pushing the main content.
 *
 * Debouncing: 150ms before declaring hover intent (enter), 200ms before
 * retracting (leave). While pinned, mouseleave is ignored entirely.
 * ============================================================================
 */

// Tunables (module-level so the timing contract lives in one place)
const HOVER_ENTER_DELAY_MS = 150;
const HOVER_LEAVE_DELAY_MS = 200;
const WIDTH_COLLAPSED = 64;   // w-16
const WIDTH_EXPANDED = 240;   // w-60

const widthStyle = (expanded: boolean) => ({
  width: `${expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED}px`,
  transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
});

// ─── Nav item rendering ───────────────────────────────────────────────────────

interface RailItemProps {
  item: NavItem;
  isExpanded: boolean;
}

/**
 * A single navigation entry. Collapsed = icon only; expanded = icon + label +
 * (for groups) an independently collapsible child list. Reuses the same
 * active-path semantics as the legacy sidebar (startsWith matching).
 */
const RailItem: React.FC<RailItemProps> = ({ item, isExpanded }) => {
  const router = useRouter();
  const currentPath = router.asPath.split('?')[0].split('#')[0];
  const itemPath = item.path.split('?')[0].split('#')[0];
  const isActive = item.exactMatch ? currentPath === itemPath : currentPath.startsWith(itemPath);

  const hasActiveChild = item.children?.some((child) => {
    const childPath = child.path.split('?')[0].split('#')[0];
    return currentPath === childPath || currentPath.startsWith(childPath);
  }) ?? false;
  const parentActive = isActive || hasActiveChild;

  const [childrenOpen, setChildrenOpen] = useState(false);
  // Auto-open the group that contains the active page.
  useEffect(() => {
    if (isExpanded && hasActiveChild) setChildrenOpen(true);
  }, [isExpanded, hasActiveChild]);

  const isGroup = (item.children?.length ?? 0) > 0;

  const handleClick = () => {
    if (!isGroup) return;
    setChildrenOpen((open) => !open);
  };

  const triggerClasses = `relative flex items-center w-full px-2.5 py-2 rounded-lg transition-colors duration-200 text-[13px] min-w-0 ${
    parentActive
      ? 'bg-brand-primary text-white font-semibold shadow-[0_0_12px_rgba(13,148,136,0.4)]'
      : 'text-gray-400 hover:bg-white/5 hover:text-white font-medium'
  } ${isExpanded ? '' : 'justify-center'}`;

  const triggerTitle = !isExpanded ? item.name : undefined;

  const TriggerContent = (
    <>
      {parentActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-white"
          aria-hidden="true"
        />
      )}
      <item.icon
        className={`${isExpanded ? 'mr-2.5' : 'mx-auto'} h-4 w-4 shrink-0`}
        strokeWidth={parentActive ? 2.25 : 2}
      />
      {/* Label lives in an overflow wrapper so text never re-wraps while the
          container width animates — it only fades. */}
      <span
        className={`flex-1 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${
          isExpanded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {item.name}
      </span>
      {isExpanded && isGroup && (
        childrenOpen
          ? <ChevronUp className="h-3.5 w-3.5 shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      )}
    </>
  );

  return (
    <li className="min-w-0">
      {isGroup ? (
        <div
          className={triggerClasses}
          onClick={handleClick}
          title={triggerTitle}
          aria-expanded={isExpanded ? childrenOpen : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          {TriggerContent}
        </div>
      ) : (
        <Link
          href={item.path}
          aria-current={isActive ? 'page' : undefined}
          className={triggerClasses}
          title={triggerTitle}
        >
          {TriggerContent}
        </Link>
      )}

      {isGroup && isExpanded && childrenOpen && (
        <ul className="ml-3 mt-1 mb-1 space-y-0.5 border-l border-white/10 pl-2">
          {item.children!.map((child) => {
            const childPath = child.path.split('?')[0].split('#')[0];
            const childActive = currentPath === childPath || currentPath.startsWith(childPath);
            return (
              <li key={child.name}>
                <Link
                  href={child.path}
                  aria-current={childActive ? 'page' : undefined}
                  className={`flex items-center px-2 py-1.5 rounded-md transition-colors duration-200 text-xs min-w-0 ${
                    childActive
                      ? 'bg-brand-primary/20 text-white font-semibold'
                      : 'text-gray-500 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <child.icon className="mr-2 h-3.5 w-3.5 shrink-0" strokeWidth={childActive ? 2.25 : 2} />
                  <span className="whitespace-nowrap overflow-hidden">{child.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};

// ─── Main rail component ──────────────────────────────────────────────────────

interface DesktopSideNavProps {
  /** Notifies the layout wrapper so push mode can expand the reserved space. */
  onPinnedChange?: (pinned: boolean) => void;
  /**
   * Nav source: 'workspace' (default) resolves the role-filtered tenant map;
   * 'superadmin' renders the dedicated platform-admin map (no workspace scope).
   */
  variant?: 'workspace' | 'superadmin';
}

const DesktopSideNav: React.FC<DesktopSideNavProps> = ({ onPinnedChange, variant = 'workspace' }) => {
  const router = useRouter();
  // ── nav items ──
  // workspace: role-filtered tenant map (same bootstrap contract as the legacy
  // Sidebar). superadmin: the dedicated platform-admin map, no role filtering.
  const isSuperAdmin = variant === 'superadmin';
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  // Two-mode state machine (per spec)
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExpanded = isPinned || isHovered;

  const workspaceProjectId = useGlobalStore((s) => s.selectedProjectId);

  // ── nav bootstrap ──
  useEffect(() => {
    if (isSuperAdmin) {
      setNavItems(superAdminNavigationMap);
      return;
    }
    try {
      const cachedUser = loadUserFromStorage();
      if (!cachedUser) return;
      const role = getPrimaryRoleFromUser(cachedUser);
      if (role) setNavItems(getStaticNavItemsForRole(role));
    } catch (error) {
      console.error('[DesktopSideNav] Failed to init nav:', error);
    }
  }, [isSuperAdmin]);

  // Multi-tab auth sync — mirrors the legacy Sidebar behaviour.
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('sentinelfi_auth_sync');
      channel.onmessage = (event) => {
        const type = event.data?.type;
        if (type === 'LOGIN' && event.data.user) {
          const role = getPrimaryRoleFromUser(event.data.user);
          if (role) setNavItems(getStaticNavItemsForRole(role));
        } else if (type === 'LOGOUT') {
          setNavItems([]);
        }
      };
    } catch (e) {
      console.warn('[DesktopSideNav] BroadcastChannel not supported');
    }
    return () => {
      if (channel) channel.close();
    };
  }, []);

  // Notify the layout wrapper about push-mode changes.
  useEffect(() => {
    onPinnedChange?.(isPinned);
  }, [isPinned, onPinnedChange]);

  // Clear timers on unmount.
  useEffect(() => () => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
  }, []);

  // ── Hover intent (150ms in / 200ms out; bypassed while pinned) ──
  const handleMouseEnter = useCallback(() => {
    if (isPinned) return; // Locked open — hover lifecycle fully bypassed.
    if (leaveTimerRef.current) {
      // Quick re-entry cancels a pending retraction.
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (enterTimerRef.current) return;
    enterTimerRef.current = setTimeout(() => {
      setIsHovered(true);
      enterTimerRef.current = null;
    }, HOVER_ENTER_DELAY_MS);
  }, [isPinned]);

  const handleMouseLeave = useCallback(() => {
    if (isPinned) return; // Spec: ignore mouseleave entirely while pinned.
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current); // Never reached hover intent.
      enterTimerRef.current = null;
    }
    if (leaveTimerRef.current) return;
    leaveTimerRef.current = setTimeout(() => {
      setIsHovered(false);
      leaveTimerRef.current = null;
    }, HOVER_LEAVE_DELAY_MS);
  }, [isPinned]);

  // Escape retracts the hover overlay (never interrupts the pinned state).
  useEffect(() => {
    if (!isHovered || isPinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsHovered(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isHovered, isPinned]);

  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      if (next) {
        // Pinning implies full expansion; cancel any pending retraction.
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
        setIsHovered(true);
      }
      return next;
    });
  }, []);

  // Section grouping for the expanded view (Chrome-style section labels).
  const workspaceLabel =
    workspaceProjectId === 'all' ? 'All Projects' : 'Project Workspace';

  // SuperAdmin console has no project-context footer.
  const sectionLabel = isSuperAdmin ? 'Platform' : 'Workspace';

  const groups = useMemo(() => {
    const isUtility = (item: NavItem) =>
      item.name === 'Documentation' || item.name === 'Settings';
    const nav = navItems.filter((i) => !isUtility(i));
    const utils = navItems.filter(isUtility);
    return [
      { id: 'modules', items: nav, label: sectionLabel },
      { id: 'utilities', items: utils, label: 'Utilities' },
    ].filter((g) => g.items.length > 0);
  }, [navItems, sectionLabel]);

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Workspace navigation"
      className={`hidden lg:flex flex-col fixed inset-y-0 left-0 bg-brand-dark/90 backdrop-blur-2xl border-r border-white/5 text-gray-300 shadow-[20px_0_40px_rgba(0,0,0,0.2)] overflow-hidden ${
        isHovered && !isPinned ? 'z-50' : 'z-30'
      }`}
      style={widthStyle(isExpanded)}
      data-pinned={isPinned}
    >
      <div className="flex flex-col h-full w-full">
        {/* ── Brand lockup ── */}
        <div className="flex h-14 shrink-0 items-center px-3">
          <div className="relative w-8 h-8 shrink-0 p-1 bg-brand-darker border border-white/10 rounded-lg">
            <Image
              src="/SentinelFi Logo Concept-bg-remv-logo-only.png"
              alt="SentinelFi"
              fill
              sizes="32px"
              className="object-contain p-0.5"
            />
          </div>
          <span
            className={`ml-2 text-sm font-black tracking-tighter text-white uppercase font-sora whitespace-nowrap transition-opacity duration-200 ${
              isExpanded ? 'opacity-100' : 'opacity-0 hidden'
            }`}
          >
            {isSuperAdmin ? (
              <span>Super Admin</span>
            ) : (
              <span>
                SENTINEL<span className="text-alert-critical">FI</span>
              </span>
            )}
          </span>
        </div>

        {/* ── Expand Tab header (h-16, Chrome-style) ── */}
        <div
          className={`flex h-16 shrink-0 items-center border-y border-white/5 px-2 ${
            isExpanded ? 'justify-between gap-2' : 'justify-center'
          }`}
        >
          {/* Left: fading workspace label */}
          <span
            className={`flex-1 min-w-0 overflow-hidden whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500 transition-opacity duration-200 ${
              isExpanded ? 'opacity-100' : 'opacity-0 hidden'
            }`}
          >
            {isSuperAdmin ? 'Platform Console' : workspaceLabel}
          </span>
          {/* Right (expanded) / centered (collapsed): chevron rotating to point
              back at the screen edge in expanded state (rotate-180). */}
          <button
            onClick={togglePin}
            data-tour="sidebar-toggle"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-label={isPinned ? 'Unpin navigation panel' : 'Pin navigation panel open'}
            aria-expanded={isExpanded}
          >
            <ChevronsRight
              className={`h-5 w-5 transition-transform ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isExpanded ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>
        </div>

        {/* ── Navigation groups ── */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          data-tour="sidebar-nav"
        >
          {groups.map((group, gi) => (
            <React.Fragment key={group.id}>
              {gi === 1 && <div className="my-3 h-px bg-white/10" aria-hidden="true" />}
              {/* Section label — fades like Chrome's panel headers */}
              <span
                className={`block px-2.5 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500 transition-opacity duration-200 ${
                  isExpanded ? 'opacity-100' : 'opacity-0 hidden'
                }`}
              >
                {group.label}
              </span>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <RailItem key={item.name} item={item} isExpanded={isExpanded} />
                ))}
              </ul>
            </React.Fragment>
          ))}
        </nav>

        {/* ── Footer: workspace scope hint (workspace variant only — the
            SuperAdmin console has no project context) ── */}
        {!isSuperAdmin && (
          <div className="shrink-0 border-t border-white/5 p-2">
            <button
              onClick={() => router.push('/financials/projects/budgets')}
              className={`flex h-10 w-full items-center rounded-lg px-2.5 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                isExpanded ? 'gap-2' : 'justify-center'
              }`}
            >
              <span className="w-2 h-2 shrink-0 rounded-full bg-brand-primary" aria-hidden="true" />
              <span
                className={`flex-1 overflow-hidden whitespace-nowrap font-semibold transition-opacity duration-200 ${
                  isExpanded ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {workspaceLabel}
              </span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DesktopSideNav;
