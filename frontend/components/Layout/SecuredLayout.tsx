import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import LayoutNav from './LayoutNav';
import Sidebar from './Sidebar';

interface SecuredLayoutProps {
  children: React.ReactNode;
}

const SecuredLayout: React.FC<SecuredLayoutProps> = ({ children }) => {
  const { isAuthenticated, isInitialLoad } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (isInitialLoad) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isInitialLoad, router]);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  if (isInitialLoad) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-brand-dark text-white">
        <div className="text-xl">Checking SentinelFi Session Security...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-brand-dark font-sans text-white">
      {/* 2. Left Sidebar - Now a direct flex child */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isDarkTheme={true}
      />

      {/* 3. Main Content Area - Takes remaining space */}
      <main className="flex-1 flex flex-col h-screen">
        {/* Header (LayoutNav) is now INSIDE the main content flex column */}
        <LayoutNav
          isDarkTheme={true}
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Scrollable content area for the page */}
        <div className="flex-1 overflow-y-auto p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SecuredLayout;
