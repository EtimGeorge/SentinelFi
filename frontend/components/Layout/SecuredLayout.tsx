import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import LayoutNav from './LayoutNav';
import Sidebar from './Sidebar';

interface SecuredLayoutProps {
  children: React.ReactNode;
}

const SecuredLayout: React.FC<SecuredLayoutProps> = ({ children }) => {
  const { isAuthenticated, user, isInitialLoad } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ======================= DEBUGGING LOG =======================
  console.log(`%c--- SecuredLayout Render ---`, 'color: orange; font-weight: bold;');
  console.log(`State: isSidebarOpen = ${isSidebarOpen}`);
  console.log(`Auth: isAuthenticated = ${isAuthenticated}, isInitialLoad = ${isInitialLoad}`);
  // =============================================================

  useEffect(() => {
    // ======================= DEBUGGING LOG =======================
    console.log('%cLayout Effect Triggered', 'color: cyan;');
    // =============================================================
    if (isInitialLoad) {
      console.log('Effect: Auth is loading, returning.');
      return;
    } 

    if (!isAuthenticated) {
      console.log('Effect: Not authenticated, redirecting to login.');
      router.push('/login');
    } else {
      console.log('Effect: Authenticated, user is secure.');
    }
  }, [isAuthenticated, isInitialLoad, router]);

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">
        <div className="text-xl">Checking SentinelFi Session Security...</div>
      </div>
    );
  }

  const handleSetSidebarOpen = (newState: boolean) => {
    // ======================= DEBUGGING LOG =======================
    console.log(`%cSetting sidebar state to: ${newState}`, 'color: lightgreen; font-weight: bold;');
    // =============================================================
    setIsSidebarOpen(newState);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LayoutNav />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={handleSetSidebarOpen} />
      <main 
        className="transition-all duration-300 min-h-screen pt-16 bg-gray-50"
        style={{ paddingLeft: isSidebarOpen ? '16rem' : '5rem' }}
      >
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SecuredLayout;
