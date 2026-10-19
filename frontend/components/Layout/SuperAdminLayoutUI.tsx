// /frontend/components/Layout/SuperAdminLayoutUI.tsx
import React from 'react';
import SuperAdminSidebar from './SuperAdminSidebar'; // Mobile drawer (<lg)
import DesktopSideNav from './DesktopSideNav'; // Chrome-style rail (lg+)
import LayoutNav from './LayoutNav'; // Re-use the existing header
import useUIStore from '../../store/uiStore';
import SessionTimeoutWarning from "../auth/SessionTimeoutWarning"; // Import SessionTimeoutWarning

interface SuperAdminLayoutUIProps {
  children: React.ReactNode;
}

// Reserved rail widths — must stay in sync with DesktopSideNav's tunables so
// the "push" mode animates in lockstep with the panel expansion.
const RAIL_COLLAPSED_PX = 64;
const RAIL_EXPANDED_PX = 240;

const SuperAdminLayoutUI: React.FC<SuperAdminLayoutUIProps> = ({ children }) => {
  // Use the global zustand store for consistent UI state
  const {
    toggleMobileSidebar, isMobileSidebarOpen, closeMobileSidebar,
  } = useUIStore();
  const [isRailPinned, setIsRailPinned] = React.useState(false);

  // Chrome "push" mode: spacer reserves the rail's flow space (64 ↔ 240px).
  const railSpacerStyle: React.CSSProperties = {
    width: `${isRailPinned ? RAIL_EXPANDED_PX : RAIL_COLLAPSED_PX}px`,
    transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
  };

  return (
    <div className="flex h-screen bg-brand-dark font-sans">
      {/* Spacer reserving the rail's flow space (lg+) */}
      <div
        className="hidden lg:block shrink-0"
        style={railSpacerStyle}
        aria-hidden="true"
      />

      {/* Chrome-style desktop side panel (lg+ only) */}
      <DesktopSideNav
        variant="superadmin"
        onPinnedChange={setIsRailPinned}
      />

      <SuperAdminSidebar />

      {/* Backdrop for mobile sidebar - closes sidebar when clicked outside */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        ></div>
      )}

      {/* Main content area */}
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}
      >
        <LayoutNav toggleSidebar={toggleMobileSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-dark p-6">
          {children}
        </main>
      </div>
      <SessionTimeoutWarning /> {/* Add SessionTimeoutWarning here */}
    </div>
  );
};

export default SuperAdminLayoutUI;