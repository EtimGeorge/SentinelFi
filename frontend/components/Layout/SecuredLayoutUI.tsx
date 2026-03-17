import React from "react";
import LayoutNav from "./LayoutNav";
import Sidebar from "./Sidebar";
import useUIStore from "../../store/uiStore";
import SessionTimeoutWarning from "../auth/SessionTimeoutWarning"; // Import SessionTimeoutWarning
import Breadcrumbs from "../common/Breadcrumbs"; // Breadcrumb navigation
import ChatWidget from "../messaging/ChatWidget";
import { useAuth } from "../context/AuthContext";

interface SecuredLayoutContentProps {
  children: React.ReactNode;
}

const SecuredLayoutContent: React.FC<SecuredLayoutContentProps> = ({ children }) => {
  const { isDesktopSidebarCollapsed, isMobileSidebarOpen, closeMobileSidebar, toggleMobileSidebar } =
    useUIStore();

  return (
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
      <SessionTimeoutWarning /> {/* Add SessionTimeoutWarning here */}
      <ChatWidget recipientId="SYSTEM" recipientName="SentinelFi Assistant" />
    </div>
  );
};

export default SecuredLayoutContent;
