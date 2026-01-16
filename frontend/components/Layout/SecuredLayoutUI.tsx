import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import useUIStore from "../../store/uiStore";

interface SecuredLayoutContentProps {
  children: React.ReactNode;
}

const SecuredLayoutContent: React.FC<SecuredLayoutContentProps> = ({ children }) => {
  const { isDesktopSidebarCollapsed, isMobileSidebarOpen, closeMobileSidebar } =
    useUIStore();

  const mainContentMarginClass = `md:ml-${
    isDesktopSidebarCollapsed ? "20" : "64"
  }`;

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
        className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${mainContentMarginClass} overflow-hidden`}
      >
        <Header />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SecuredLayoutContent;
