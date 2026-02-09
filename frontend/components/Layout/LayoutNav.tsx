import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, Role } from '../context/AuthContext';
import { Search, Bell, Menu, User as UserIcon, LogOut } from 'lucide-react'; // Renamed User to avoid conflict
import Tooltip from '../common/Tooltip';
import { useSecuredApi } from '../hooks/useSecuredApi';
import useUIStore from '../../store/uiStore';
import { WbsBudget } from '../../../shared/types/wbs'; // CORRECTED IMPORT
import { User } from '../../../shared/types/user'; // CORRECTED IMPORT
import { LiveExpense } from '../../../shared/types/expense'; // CORRECTED IMPORT
import { CurrencySelector } from '../common/CurrencySelector'; // Currency Switcher

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

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 text-gray-300">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-gray-400 focus:outline-none md:hidden p-1 mr-2">
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative mx-2 md:mx-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-500" />
          </span>
          <input
            className="w-full py-1.5 pl-9 pr-4 text-xs text-gray-300 bg-brand-dark/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:bg-gray-900"
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {isSearchOpen && searchResults && (
            <div className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-md shadow-lg">
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

      <div className="flex items-center">
        <div className="mr-2">
          <CurrencySelector />
        </div>
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
  );
};

export default LayoutNav;