import React from 'react';
import { useAuth, Role } from '../context/AuthContext';
import Link from 'next/link';
import Logo from '../common/Logo';
import { Bell, Search, Lock, Menu, X } from 'lucide-react';
import Tooltip from '../common/Tooltip';

interface LayoutNavProps {
  isDarkTheme: boolean;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const LayoutNav: React.FC<LayoutNavProps> = ({ isDarkTheme, isSidebarOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  
  // Dynamic classes based on theme
  const bgColor = isDarkTheme ? 'bg-brand-dark' : 'bg-white';
  const textColor = isDarkTheme ? 'text-white' : 'text-brand-dark';
  const buttonColor = isDarkTheme ? 'hover:bg-brand-primary/20' : 'hover:bg-gray-100';

  return (
    <nav className={`p-4 shadow-lg fixed w-full z-30 top-0 ${bgColor} ${textColor}`}>
      <div className="flex justify-between items-center max-w-full mx-auto px-4 sm:px-0">
        
        {/* Left Section: Logo, Toggle, and Brand */}
        <div className="flex items-center space-x-4">
          
          {/* Hamburger/Toggle Button (Visible on mobile/desktop for collapse) */}
          <Tooltip content={isSidebarOpen ? 'Close Menu' : 'Open Menu'} position="bottom">
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-full transition duration-150 ${buttonColor} lg:hidden`}
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </Tooltip>

          <Link href="/" className="text-xl font-bold tracking-wider flex items-center">
            <div className="mr-2">
              <Logo size="sm" />
            </div>
            SentinelFi
          </Link>
          
        </div>

        {/* Center Section: Main Nav Links (Replaced by static links in the provided mockups) */}
        {/* Keeping only a clean search bar and security status for the top nav */}
        <div className="hidden md:flex items-center space-x-6">
          <div className="flex items-center bg-brand-dark/50 rounded-full px-4 py-2 border border-gray-700">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input 
                type="text" 
                placeholder="Search projects, WBS, users..." 
                className="bg-transparent text-sm focus:outline-none placeholder-gray-500 w-64"
            />
          </div>
        </div>

        {/* Right Section: Alerts, Secure Status, User Profile */}
        <div className="flex items-center space-x-4">
          
          {/* Secure Connection Status */}
          <div className="hidden sm:flex items-center text-xs font-medium text-alert-positive bg-green-900/50 p-2 rounded-full border border-alert-positive/30">
            <Lock className="w-3 h-3 mr-1" />
            Secure Connection Encrypted
          </div>

          {/* User Profile / Logout */}
          <Tooltip content={`Logged in as ${user?.email}`} position="bottom">
            <div className="flex items-center space-x-3 cursor-pointer">
              <span className="text-sm font-semibold">{user?.email.split('@')[0]}</span>
              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-sm font-bold border-2 border-white">
                {user?.email[0].toUpperCase()}
              </div>
              <button onClick={logout} className="text-sm font-medium text-red-400 hover:text-red-300 transition duration-150">
                &rarr;
              </button>
            </div>
          </Tooltip>
        </div>
      </div>
    </nav>
  );
};

export default LayoutNav;