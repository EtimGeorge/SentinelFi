// /frontend/components/Layout/SuperAdminLayoutUI.tsx
import React from 'react';
import SuperAdminSidebar from './SuperAdminSidebar'; // Import the new sidebar
import LayoutNav from './LayoutNav'; // Re-use the existing header
import useUIStore from '../../store/uiStore';
import SessionTimeoutWarning from "../auth/SessionTimeoutWarning"; // Import SessionTimeoutWarning

interface SuperAdminLayoutUIProps {
  children: React.ReactNode;
}

const SuperAdminLayoutUI: React.FC<SuperAdminLayoutUIProps> = ({ children }) => {
  // Use the global zustand store for consistent UI state
  const {
    isDesktopSidebarCollapsed,
    toggleMobileSidebar,
    isMobileSidebarOpen,
    closeMobileSidebar,
  } = useUIStore();

  return (
    <div className="flex h-screen bg-brand-dark font-sans">
      <SuperAdminSidebar />

      {/* Backdrop for mobile sidebar - closes sidebar when clicked outside */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
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