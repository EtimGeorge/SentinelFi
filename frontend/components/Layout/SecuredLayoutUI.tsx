import React from "react";
import { useRouter } from "next/router";
import LayoutNav from "./LayoutNav";
import Sidebar from "./Sidebar";
import useUIStore from "../../store/uiStore";
import SessionTimeoutWarning from "../auth/SessionTimeoutWarning";
import Breadcrumbs from "../common/Breadcrumbs";
import ChatWidget from "../messaging/ChatWidget";
import { useAuth } from "../context/AuthContext";
import { TourProvider } from "../../contexts/TourContext";
import { TourOverlay } from "../tutorial/TourOverlay";
import { TutorialFab } from "../tutorial/TutorialFab";

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
}

const SecuredLayoutContent: React.FC<SecuredLayoutContentProps> = ({ children }) => {
  const { isDesktopSidebarCollapsed, isMobileSidebarOpen, closeMobileSidebar, toggleMobileSidebar } =
    useUIStore();
  const router = useRouter();
  const pageKey = resolvePageKey(router.pathname);

  // Don't show tutorial FAB on the tutorial pages themselves
  const isTutorialPage = router.pathname.startsWith('/tutorial');

  return (
    <TourProvider>
      <div className="flex h-screen bg-brand-dark overflow-hidden print:h-auto print:overflow-visible print:bg-white text-gray-100 print:text-black">
        <div className="print:hidden shrink-0">
          <Sidebar />
        </div>

        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden print:hidden backdrop-blur-sm"
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
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto print:p-0 print:overflow-visible print:block">
            <div className="print:hidden">
              <Breadcrumbs />
            </div>
            {children}
          </main>
        </div>

        <SessionTimeoutWarning />
        <ChatWidget initialRecipientId="SYSTEM" initialRecipientName="SentinelFi Assistant" />

        {/* ── Tutorial System ───────────────────────────────────────── */}
        <TourOverlay />
        {!isTutorialPage && <TutorialFab pageKey={pageKey} />}
      </div>
    </TourProvider>
  );
};

export default SecuredLayoutContent;
