import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, Menu, User as UserIcon, LogOut } from 'lucide-react'; // Renamed User to avoid conflict
import Tooltip from '../common/Tooltip';
import { useSecuredApi } from '../hooks/useSecuredApi';
import { WbsBudget } from '../../../shared/types/wbs'; // CORRECTED IMPORT
import { User } from '../../../shared/types/user'; // CORRECTED IMPORT
import { LiveExpense } from '../../../shared/types/expense'; // CORRECTED IMPORT

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
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{
    wbsItems: WbsBudget[]; // Use shared type
    users: User[]; // Use shared type
    expenses: LiveExpense[]; // Use shared type
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const api = useSecuredApi();

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
    <header className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 text-gray-300">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-gray-400 focus:outline-none md:hidden">
          <Menu className="h-6 w-6" />
        </button>
        <div className="relative mx-4 md:mx-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-500" />
          </span>
          <input
            className="w-full py-2 pl-10 pr-4 text-gray-300 bg-brand-dark/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:bg-gray-900"
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
                    {expense.item_description}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center">
        <Tooltip content="Notifications" position="bottom">
          <button className="flex items-center mx-4 text-gray-400 focus:outline-none">
            <Bell className="h-6 w-6" />
          </button>
        </Tooltip>

        <div className="relative">
          <Tooltip content="Profile" position="bottom">
            <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} className="relative block w-8 h-8 overflow-hidden rounded-full shadow focus:outline-none">
              <div className="w-full h-full bg-brand-primary flex items-center justify-center text-sm font-bold text-white">
                {user?.email[0].toUpperCase()}
              </div>
            </button>
          </Tooltip>
          
          {isUserDropdownOpen && (
            <div 
              onMouseLeave={() => setIsUserDropdownOpen(false)}
              className="absolute right-0 z-10 w-48 mt-2 overflow-hidden bg-gray-800 border border-gray-700 rounded-md shadow-xl"
            >
              <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-primary hover:text-white">
                <UserIcon className="inline-block w-4 h-4 mr-2" />
                Profile
              </a>
              <a onClick={logout} href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-primary hover:text-white">
                <LogOut className="inline-block w-4 h-4 mr-2" />
                Logout
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default LayoutNav;