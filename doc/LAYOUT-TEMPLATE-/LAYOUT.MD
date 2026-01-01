import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import useUIStore from "../store/uiStore"; // IMPORT UI STORE

const Layout: React.FC = () => {
  const { isDesktopSidebarCollapsed, isMobileSidebarOpen, closeMobileSidebar } =
    useUIStore(); // Get relevant states and functions

  // Calculate the dynamic margin-left for the main content area on desktop
  const mainContentMarginClass = `md:ml-${
    isDesktopSidebarCollapsed ? "20" : "64"
  }`;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden ">
      {/* Sidebar is rendered here, handles its own fixed/overlay positioning */}
      <Sidebar />

      {/* Backdrop for mobile sidebar - closes sidebar when clicked outside */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileSidebar} // Close sidebar when backdrop is clicked
          aria-hidden="true"
        ></div>
      )}

      {/* Main content area dynamically adjusts its left margin on desktop */}
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${mainContentMarginClass} overflow-hidden`}
      >
        <Header />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {" "}
          {/* Added overflow-y-auto for main content independent scrolling */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
