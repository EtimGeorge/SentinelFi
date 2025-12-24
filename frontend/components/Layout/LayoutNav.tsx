import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Lock } from 'lucide-react';
import Tooltip from '../common/Tooltip';

interface LayoutNavProps {
  isDarkTheme: boolean;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const LayoutNav: React.FC<LayoutNavProps> = ({ isDarkTheme }) => {
  const { user, logout } = useAuth();

  // Dynamic classes based on theme
  const bgColor = isDarkTheme ? 'bg-brand-dark' : 'bg-white';
  const textColor = isDarkTheme ? 'text-white' : 'text-brand-dark';

  return (
    // Overhauled LayoutNav: Now a flex-item header, not fixed.
    <header className={`h-16 flex-shrink-0 p-4 shadow-md ${bgColor} ${textColor} border-b border-brand-charcoal/50`}>
      <div className="flex justify-between items-center max-w-full mx-auto">

        {/* Center Section: Search Bar */}
        <div className="flex items-center space-x-6">
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
              <button onClick={logout} className="text-sm font-medium text-red-400 hover:text-red-300 transition duration-150" aria-label="Logout">
                &rarr;
              </button>
            </div>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};

export default LayoutNav;
