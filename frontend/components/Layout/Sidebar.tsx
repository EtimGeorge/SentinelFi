import React from 'react';
import Link from 'next/link';
import { ChevronLeft, LayoutDashboard, DollarSign, CheckSquare, BarChart3, Settings, Users, Folder, TrendingUp, Briefcase } from 'lucide-react';
import { useAuth, Role } from '../context/AuthContext';
import Tooltip from '../common/Tooltip';
import { useRouter } from 'next/router';

// Define the content for the fixed Left Sidebar based on mockups and RBAC
const getPrimaryNavLinks = (userRole: Role) => {
  const links = [
    { href: '/dashboard/ceo', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.Admin, Role.ITHead, Role.Finance, Role.CEO, Role.OperationalHead] },
    { href: '/expense/tracker', label: 'Live Tracker', icon: DollarSign, roles: [Role.Admin, Role.AssignedProjectUser] },
    { href: '/projects', label: 'Projects', icon: Folder, roles: [Role.Admin, Role.OperationalHead, Role.Finance] },
    { href: '/budget/draft', label: 'Budgeting', icon: Briefcase, roles: [Role.Admin, Role.Finance, Role.AssignedProjectUser] },
    { href: '/approvals', label: 'Approvals', icon: CheckSquare, roles: [Role.Admin, Role.Finance] },
    { href: '/reporting/variance', label: 'Analytics', icon: BarChart3, roles: [Role.Admin, Role.Finance, Role.OperationalHead] },
    { href: '/wbs-manager', label: 'WBS Manager', icon: TrendingUp, roles: [Role.Admin, Role.Finance] },
    { href: '/settings', label: 'Settings', icon: Settings, roles: [Role.Admin, Role.ITHead] },
    // Removed /dashboard/home as the primary dashboard is now /dashboard/ceo
  ];
  
  // Return only the links relevant to the user's role
  return links.filter(l => l.roles.includes(userRole));
};

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isDarkTheme: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, isDarkTheme }) => {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const primaryNavLinks = getPrimaryNavLinks(user.role);

  // Dynamic class for the active/inactive state of links
  const getLinkClasses = (href: string) => {
    const isActive = router.pathname === href || (href !== '/' && router.pathname.startsWith(href));
    return `flex items-center p-3 rounded-lg transition-colors duration-150 group 
      ${isDarkTheme ? 'text-gray-300 hover:bg-brand-primary/20' : 'text-gray-700 hover:bg-gray-100'}
      ${isActive ? 'bg-brand-primary/30 text-brand-primary font-semibold' : ''}`;
  };

  return (
    // FINAL FIX: Use w-64 (256px) for expanded, w-20 (80px) for collapsed
    <div 
      className={`fixed top-0 left-0 h-full transition-transform duration-300 z-40 ${isDarkTheme ? 'bg-brand-dark' : 'bg-white'} ${isOpen ? 'w-64' : 'w-20'} pt-16 
                 transform lg:-translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      
      {/* Collapse/Expand Button (Toggles sidebar width) */}
      <Tooltip content={isOpen ? 'Collapse Menu' : 'Expand Menu'}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute -right-3 top-20 p-1 rounded-full ${isDarkTheme ? 'bg-brand-dark text-white border-brand-primary/50' : 'bg-white text-brand-dark border-gray-300'} shadow-lg border-2 transition-all duration-300 hover:bg-brand-primary/90 hover:text-white
            ${isOpen ? 'rotate-0' : 'rotate-180'}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </Tooltip>
      
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Main Navigation Area */}
        <div className="p-4 space-y-4 flex-grow">
          {primaryNavLinks.map((link) => (
            <Tooltip key={link.href} content={link.label} enabled={!isOpen} position="right">
              <Link href={link.href} className={getLinkClasses(link.href)}>
                <link.icon className={`w-5 h-5 ${isOpen ? 'mr-3' : ''}`} />
                <span className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  {link.label}
                </span>
              </Link>
            </Tooltip>
          ))}
        </div>
        
        {/* Footer Section (Budget Usage, Profile, etc. - based on mockups) */}
        <div className={`p-4 border-t ${isDarkTheme ? 'border-gray-700' : 'border-gray-200'} transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Budget Usage</h3>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-brand-primary h-2.5 rounded-full" style={{ width: '72%' }}></div>
          </div>
          <p className="text-xs text-gray-400 mt-1">72% Utilized</p>
          <div className="flex items-center mt-4 space-x-3">
             <div className="w-8 h-8 rounded-full bg-gray-500"></div> {/* Placeholder for profile pic */}
             <div>
                <p className="text-sm font-semibold">{user?.email.split('@')[0]}</p>
                <p className="text-xs text-brand-primary">{user?.role}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
