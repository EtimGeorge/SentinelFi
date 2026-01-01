import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import LayoutNav from './LayoutNav';
import Sidebar from './Sidebar';
import useUIStore from '../../store/uiStore'; // Import the global UI store

interface SecuredLayoutProps {
  children: React.ReactNode;
}

const SecuredLayout: React.FC<SecuredLayoutProps> = ({ children }) => {
  const { isAuthenticated, isInitialLoad } = useAuth();
  const router = useRouter();
  // ---- STATE MANAGEMENT REFACTORED ----
  // Remove local state: const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Use the global zustand store instead
  const {
    isDesktopSidebarCollapsed,
    toggleMobileSidebar,
    isMobileSidebarOpen,
    closeMobileSidebar,
  } = useUIStore();
  // ---- END REFACTOR ----

  const [searchTerm, setSearchTerm] = useState(''); // Keep search term local for now

  useEffect(() => {
    if (isInitialLoad) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isInitialLoad, router]);

  if (isInitialLoad) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-brand-dark text-white">
        <div className="text-xl">Checking SentinelFi Session Security...</div>
      </div>
    );
  }

  // Calculate the dynamic margin-left for the main content area on desktop
  const mainContentMarginClass = `md:ml-${
    isDesktopSidebarCollapsed ? '20' : '64'
  }`;

  return (
    <div className="flex h-screen bg-brand-dark font-sans">
      {/* Sidebar no longer needs props for state management, it's self-contained with the store */}
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
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${mainContentMarginClass}`}
      >
        {/* Pass the correct toggle function from the store to the Nav */}
        <LayoutNav toggleSidebar={toggleMobileSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-dark p-6">
          {/* Removed cloning props for searchTerm as it's not a scalable pattern */}
          {/* If child components need search term, it should be in a shared context/store */}
          {children}
        </main>
      </div>
    </div>
  );
};

export default SecuredLayout;
