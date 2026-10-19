import React from "react";
import { useRouter } from "next/router";
import LayoutNav from "./LayoutNav";
import Sidebar from "./Sidebar";
import DesktopSideNav from "./DesktopSideNav";
import BottomTabBar from "./BottomTabBar";
import useUIStore from "../../store/uiStore";
import SessionTimeoutWarning from "../auth/SessionTimeoutWarning";
import Breadcrumbs from "../common/Breadcrumbs";
import ChatWidget from "../messaging/ChatWidget";
import FreeTierAdBanner from "../ads/FreeTierAdBanner";
import { TourOverlay } from "../tutorial/TourOverlay";
import { TutorialFab } from "../tutorial/TutorialFab";
import Head from "next/head";

// Route path → tutorial pageKey mapping
function resolvePageKey(pathname: string): string {
  if (pathname.includes('/wbs') || pathname.includes('/projects')) return 'wbs';
  if (pathname.includes('/capex')) return 'capex-dashboard';
  if (pathname.includes('/opex')) return 'opex-dashboard';
  if (pathname.includes('/reporting')) return 'reporting';
  if (pathname.includes('/billing')) return 'billing';
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/dashboard')) return 'dashboard';
  if (pathname.includes('/budget')) return 'wbs';
  return 'default';
}

interface SecuredLayoutContentProps {
  children: React.ReactNode;
  title?: string;
}

// Reserved rail widths — must stay in sync with DesktopSideNav's tunables so
// the "push" mode animates in perfect lockstep with the panel expansion.
const RAIL_COLLAPSED_PX = 64;
const RAIL_EXPANDED_PX = 240;

const SecuredLayoutContent: React.FC<SecuredLayoutContentProps> = ({ children, title }) => {
  const { isMobileSidebarOpen, closeMobileSidebar, toggleMobileSidebar } =
    useUIStore();
  const router = useRouter();
  const pageKey = resolvePageKey(router.pathname);
  const [isRailPinned, setIsRailPinned] = React.useState(false);

  // Don't show tutorial FAB on the tutorial pages themselves
  const isTutorialPage = router.pathname.startsWith('/tutorial');

  // Chrome "push" mode: the spacer that reserves the rail's layout space
  // expands to 240px in sync with the pinned panel (200ms cubic-bezier).
  const railSpacerStyle: React.CSSProperties = {
    width: `${isRailPinned ? RAIL_EXPANDED_PX : RAIL_COLLAPSED_PX}px`,
    transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
  };

  return (
    <>
      {title && (
        <Head>
          <title>{title}</title>
        </Head>
      )}
      <div className="flex h-screen bg-brand-dark overflow-hidden print:h-auto print:overflow-visible print:bg-white text-gray-100 print:text-black">
        {/* Spacer reserving the rail's flow space (lg+). Hover-overlay mode
            leaves it at 64px; pinned push mode transitions it to 240px. */}
        <div
          className="print:hidden hidden lg:block shrink-0"
          style={railSpacerStyle}
          aria-hidden="true"
        />

        {/* Chrome-style desktop side panel (lg+ only; hover overlay / pin push) */}
        <DesktopSideNav onPinnedChange={setIsRailPinned} />

        {/* Mobile drawer (<lg) — hamburger in LayoutNav toggles it */}
        <Sidebar />

        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden print:hidden backdrop-blur-sm"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          ></div>
        )}

        <div
          className={`flex flex-col flex-1 transition-all duration-300 ease-in-out overflow-hidden print:overflow-visible print:block`}
        >
          <div className="print:hidden">
            <LayoutNav toggleSidebar={toggleMobileSidebar} />
          </div>
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto print:p-0 print:overflow-visible print:block pb-20 md:pb-0">
            <div className="print:hidden">
              <Breadcrumbs />
            </div>
            {/* Free-tier monetization slot, self-hides for paid/trial tenants */}
            <div className="print:hidden">
              <FreeTierAdBanner />
            </div>
            {children}
          </main>
        </div>

        <SessionTimeoutWarning />
        <ChatWidget />
        <BottomTabBar />

        {/* ── Tutorial System ───────────────────────────────────────── */}
        <TourOverlay />
        {!isTutorialPage && <TutorialFab pageKey={pageKey} />}
      </div>
    </>
  );
};

export default SecuredLayoutContent;
