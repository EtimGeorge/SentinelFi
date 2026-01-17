import React from "react";
import LayoutNav from "./LayoutNav";
import Sidebar from "./Sidebar";
import useUIStore from "../../store/uiStore";
import SessionTimeoutWarning from "../auth/SessionTimeoutWarning"; // Import SessionTimeoutWarning

interface SecuredLayoutContentProps {
  children: React.ReactNode;
}

const SecuredLayoutContent: React.FC<SecuredLayoutContentProps> = ({ children }) => {
  const { isDesktopSidebarCollapsed, isMobileSidebarOpen, closeMobileSidebar, toggleMobileSidebar } =
    useUIStore();

  return (
    <div className="flex h-screen bg-brand-dark overflow-hidden ">
      <Sidebar />

      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        ></div>
      )}

      <div
        className={`flex flex-col flex-1 transition-all duration-300 ease-in-out overflow-hidden`}
      >
        <LayoutNav toggleSidebar={toggleMobileSidebar} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
      <SessionTimeoutWarning /> {/* Add SessionTimeoutWarning here */}
    </div>
  );
};

export default SecuredLayoutContent;
