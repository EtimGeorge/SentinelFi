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
  
  // CRITICAL FIX: isSidebarOpen state is back and responsive
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 

  useEffect(() => {
    if (isInitialLoad) return; 
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isInitialLoad, router]);
  
  // Toggle function passed to the top nav (for mobile/desktop control)
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  
  // Dynamic Margins for Main Content
  // Mobile: No margin (Sidebar goes over content)
  // Desktop (lg+): Margin is 256px (w-64) if open, or 80px (w-20) if closed.
  const mainMarginClass = isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20';

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">
        <div className="text-xl">Checking SentinelFi Session Security...</div>
      </div>
    );
  }
  
  // FINAL THEME: Dark base for the entire application wrapper
  return (
    <div className="min-h-screen bg-brand-dark text-white font-sans">
      
      {/* 1. Top Header/Nav - Passes the toggle function */}
      <LayoutNav 
        isDarkTheme={true} 
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      /> 
      
      {/* 2. Left Sidebar - Passes state and setter */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        isDarkTheme={true} 
      /> 
      
      {/* 3. Main Content Area - Uses dynamic padding-left class for smooth transition */}
      <main 
        className={`transition-all duration-300 min-h-screen pt-16 bg-brand-dark text-white ${mainMarginClass}`}
        // Mobile view: Always pt-16, sidebar overlaps. Desktop: margin pushes content over.
      >
        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SecuredLayout;
