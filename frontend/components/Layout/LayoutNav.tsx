import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, Role } from '../context/AuthContext';
import { Search, Bell, Menu, User as UserIcon, LogOut, Sparkles, Shield } from 'lucide-react'; // Renamed User to avoid conflict
import Tooltip from '../common/Tooltip';
import { useSecuredApi } from '../hooks/useSecuredApi';
import useUIStore from '../../store/uiStore';
import { WbsBudget } from '../../../shared/types/wbs'; // CORRECTED IMPORT
import { User } from '../../../shared/types/user'; // CORRECTED IMPORT
import { LiveExpense } from '../../../shared/types/expense'; // CORRECTED IMPORT
import { CurrencySelector } from '../common/CurrencySelector'; // Currency Switcher
import useGlobalStore from '../../store/globalStore';
import SubscriptionBanner from '../Billing/SubscriptionBanner';

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void;
};

interface LayoutNavProps {
  toggleSidebar: () => void;
}

const LayoutNav: React.FC<LayoutNavProps> = ({ toggleSidebar }) => {
  const { user, logout, hasRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{
    wbsItems: WbsBudget[]; // Use shared type
    users: User[]; // Use shared type
    expenses: LiveExpense[]; // Use shared type
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const api = useSecuredApi();
  const unreadNotificationsCount = useUIStore((state) => state.unreadNotificationsCount);
  const toggleAiAssistant = useUIStore((state) => state.toggleAiAssistant);
  const { selectedProjectId, setSelectedProjectId } = useGlobalStore();
  const [projects, setProjects] = useState<{ project_id: string; project_name: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects?limit=100');
        setProjects(res.data.projects || []);
      } catch (error) {
        // Ignore aborts
      }
    };
    fetchProjects();
  }, [api, user]);

  const performSearch = useCallback(async (term: string) => {
    if (term.length > 2) {
      try {
        const response = await api.get('/search', { params: { query: term } });
        setSearchResults(response.data);
        setIsSearchOpen(true);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      setSearchResults(null);
      setIsSearchOpen(false);
    }
  }, [api]);

  // The linter gives a false positive here because it cannot inspect the dependencies of the debounced function.
  // The dependency array is correct as `performSearch` is stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(debounce(performSearch, 500), [performSearch]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  // State for user dropdown
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const hasMissingProfile = user && (!user.first_name || !user.last_name);

  return (
    <div className="flex flex-col w-full sticky top-0 z-40 overflow-visible">
      {/* PROFILE COMPLETION BANNER (For Legacy Users) */}
      {hasMissingProfile && (
        <div className="bg-gradient-to-r from-indigo-600 to-brand-primary text-white px-6 py-1.5 flex items-center justify-between text-[11px] font-bold tracking-tight shadow-lg border-b border-white/10 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2 text-white">
            <div className="bg-white/20 p-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>PRODUCTION READINESS: Your profile is missing name data. Please complete it to unlock full auditing capabilities.</span>
          </div>
          <Link href="/settings" className="bg-white text-brand-primary px-3 py-0.5 rounded-full hover:bg-gray-100 transition-all font-black uppercase text-[10px] shrink-0">
            Complete Now
          </Link>
        </div>
      )}
      
      <header className="flex items-center justify-between px-6 py-3 bg-brand-dark/80 backdrop-blur-xl border-b border-white/5 text-gray-300 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="flex items-center">
        <button 
          onClick={toggleSidebar} 
          className="text-gray-400 focus:outline-none md:hidden p-1.5 mr-2 hover:bg-white/5 active:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="relative mx-2 md:mx-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-500" />
          </span>
          <input
            className="w-full py-2 pl-10 pr-4 text-xs font-medium text-white bg-white/5 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary focus:bg-white/10 transition-all placeholder-gray-500 shadow-inner"
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {isSearchOpen && searchResults && (
            <div className="absolute z-50 w-full mt-2 bg-brand-dark/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="py-1">
                {searchResults.wbsItems.length > 0 && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">WBS Items</div>
                )}
                {searchResults.wbsItems.map(item => (
                  <a href="#" key={item.wbs_id} className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-primary hover:text-white">
                    {item.wbs_code} - {item.description}
                  </a>
                ))}
                {searchResults.users.length > 0 && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Users</div>
                )}
                {searchResults.users.map(userResult => (
                  <a href="#" key={userResult.id} className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-primary hover:text-white">
                    {userResult.email}
                  </a>
                ))}
                {searchResults.expenses.length > 0 && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Expenses</div>
                )}
                {searchResults.expenses.map(expense => (
                  <a href="#" key={expense.expense_id} className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-primary hover:text-white">
                    {expense.description}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Countdown Banner — shows when trial/subscription is expiring */}
      <div className="flex-1 flex justify-center px-4 hidden md:flex">
        <SubscriptionBanner />
      </div>

      <div className="flex items-center">
        {/* Project Selector */}
        <div className="mr-1 sm:mr-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-brand-dark/80 border border-gray-700 rounded-lg py-1.5 px-2 text-[10px] sm:text-xs text-brand-primary font-bold focus:border-brand-primary outline-none transition cursor-pointer max-w-[100px] sm:max-w-[150px] truncate"
            title="Active Project Context"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
            ))}
          </select>
        </div>

        <div className="mr-1 sm:mr-2">
          <CurrencySelector />
        </div>

        {/* AI Assistant Toggle Button */}
        <Tooltip content="SentinelFi AI Assistant" position="bottom">
          <button
            onClick={toggleAiAssistant}
            data-tour="ai-assistant-toggle"
            className="relative flex items-center mx-1 sm:mx-2 text-indigo-400 focus:outline-none hover:text-indigo-300 hover:bg-indigo-900/40 p-1.5 rounded-md transition-colors"
            aria-label="Toggle AI Assistant"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        </Tooltip>

        <Tooltip content="Notifications" position="bottom">
          <button className="relative flex items-center mx-2 text-gray-400 focus:outline-none hover:text-white transition p-1">
            <Bell className="h-5 w-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center h-3.5 w-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full border border-gray-800">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </Tooltip>

        <div className="relative ml-2">
          <Tooltip content="Profile" position="bottom">
            <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} className="relative block w-7 h-7 overflow-hidden rounded-full shadow focus:outline-none border border-gray-700">
              <div className="w-full h-full bg-brand-primary flex items-center justify-center text-xs font-bold text-white">
                {user?.email[0].toUpperCase()}
              </div>
            </button>
          </Tooltip>

          {isUserDropdownOpen && (
            <div
              onMouseLeave={() => setIsUserDropdownOpen(false)}
              className="absolute right-0 z-10 w-48 mt-2 overflow-hidden bg-gray-800 border-b-2 border-brand-primary rounded-md shadow-xl"
            >
              <Link
                href={hasRole(Role.SuperAdmin) ? "/super/settings" : "/settings"}
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-primary hover:text-white border-b border-gray-700/50"
              >
                <UserIcon className="inline-block w-4 h-4 mr-2" />
                Profile Settings
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  logout();
                }}
                className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-brand-primary hover:text-white"
              >
                <LogOut className="inline-block w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    </div>
  );
};

export default LayoutNav;