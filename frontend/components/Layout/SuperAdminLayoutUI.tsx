// /frontend/components/Layout/SuperAdminLayout.tsx
import React, { useEffect } from 'react';
import { useAuth, Role } from '../context/AuthContext';
import { useRouter } from 'next/router';
import SuperAdminSidebar from './SuperAdminSidebar'; // Import the new sidebar
import LayoutNav from './LayoutNav'; // Re-use the existing header
import useUIStore from '../../store/uiStore';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ children }) => {
  const { user, isInitialLoad } = useAuth();
  const router = useRouter();

  // Use the global zustand store for consistent UI state
  const {
    isDesktopSidebarCollapsed,
    toggleMobileSidebar,
    isMobileSidebarOpen,
    closeMobileSidebar,
  } = useUIStore();

  useEffect(() => {
    if (isInitialLoad) return;

    // This layout is strictly for authenticated SuperAdmins.
    if (!user || user.role !== Role.SuperAdmin) {
      router.replace('/login'); // Redirect to login if not a SuperAdmin
    }
  }, [user, isInitialLoad, router]);

  // Display a loading state while auth status is being determined.
  if (isInitialLoad || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-brand-dark text-white">
        <div className="text-xl">Verifying SuperAdmin Session...</div>
      </div>
    );
  }

  // Calculate the dynamic margin-left for the main content area on desktop
  // This is a bit of a trick with Tailwind JIT compilation.
  // We explicitly list the classes so Tailwind can find them.
  // md:ml-20 md:ml-64
  const mainContentMarginClass = isDesktopSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';

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

      {/* Main content area dynamically adjusts its left margin on desktop */}
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${mainContentMarginClass}`}
      >
        <LayoutNav toggleSidebar={toggleMobileSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-dark p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;