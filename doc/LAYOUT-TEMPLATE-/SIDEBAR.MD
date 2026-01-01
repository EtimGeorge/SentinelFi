import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaFileAlt, FaFolder, FaArchive, FaUsers, FaCog, FaUpload, FaBuilding, FaThList, FaClipboardList,
  FaTimes, FaAngleDoubleLeft, FaAngleDoubleRight, FaBell, FaGraduationCap,
  FaShareAlt
} from 'react-icons/fa';
import { IconType } from 'react-icons';
import useAuthStore from '../store/authStore';
import IconWrapper from './IconWrapper';
import useUIStore from '../store/uiStore';

interface NavItem {
  name: string;
  icon: IconType;
  path: string;
}

const getNavItems = (role: string): NavItem[] => {
  const baseItems = [
    { name: 'Dashboard', icon: FaCog, path: '/dashboard' },
    { name: 'My Documents', icon: FaFileAlt, path: '/dashboard/my-documents' },
    { name: 'Shared with Me', icon: FaFolder, path: '/dashboard/shared' },
     { name: 'My Shared Documents', icon: FaShareAlt, path: '/dashboard/my-sent-shares' },
    { name: 'Upload Document', icon: FaUpload, path: '/dashboard/upload' },
    { name: 'Archived Documents', icon: FaArchive, path: '/dashboard/archive' },
    { name: 'Notifications', icon: FaBell, path: '/dashboard/notifications' },
    { name: 'Training', icon: FaGraduationCap, path: '/dashboard/training' },
  ];

  if (role === 'admin' || role === 'it' || role === 'ceo') {
    baseItems.push(
      { name: 'Department Management', icon: FaBuilding, path: '/dashboard/admin/departments' },
      { name: 'Shelf Management', icon: FaThList, path: '/dashboard/admin/shelves' },
      { name: 'Folder Management', icon: FaFolder, path: '/dashboard/admin/folders' },
      { name: 'User Management', icon: FaUsers, path: '/dashboard/admin/users' },
      { name: 'Audit Logs', icon: FaClipboardList, path: '/dashboard/admin/audit-logs' }
    );
  } else if (role === 'manager') {
    baseItems.push(
      { name: 'User Management', icon: FaUsers, path: '/dashboard/admin/users' }
    )
     } else if (role === 'auditor') { // Auditors have read-only access to audit logs
      baseItems.push(
        { name: 'Audit Logs', icon: FaClipboardList, path: '/dashboard/admin/audit-logs' }
      );
  }

  return baseItems;
};


const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const {
    isMobileSidebarOpen, closeMobileSidebar,
    isDesktopSidebarCollapsed, toggleDesktopSidebar
  } = useUIStore();
  const location = useLocation();

  const navItems = user ? getNavItems(user.role) : [];

  // Close mobile sidebar on navigation
  React.useEffect(() => {
    if (isMobileSidebarOpen && window.innerWidth < 768) {
      closeMobileSidebar();
    }
  }, [location.pathname]); 


  return (
    <>
      {/* Mobile Overlay Sidebar (fixed) */}
      <aside
        className={`fixed inset-y-0 left-0 bg-seeslBlue text-white shadow-lg z-50 transition-transform duration-300 ease-in-out
                    ${isMobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
                    md:hidden`} // Hide this on medium+ screens
        aria-label="Mobile Sidebar"
      >
        <div className="flex flex-col h-full w-full p-4"> {/* Inner padding for content */}
          <div className="flex-shrink-0 mb-8 mt-2 flex items-center justify-between">
            <img className="h-10 w-auto" src="/seesl_logo.png" alt="SEESL Logo" />
            <button
              onClick={closeMobileSidebar}
              className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white p-2 rounded-md"
              aria-label="Close sidebar"
            >
              <IconWrapper icon={FaTimes as React.ComponentType<any>} className="text-xl" />
            </button>
          </div>
          
          <nav className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center p-2 rounded-md transition duration-200
                      ${location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                        ? 'bg-seeslLightBlue text-white'
                        : 'hover:bg-seeslLightBlue hover:text-white'}`}
                    onClick={closeMobileSidebar}
                  >
                    <IconWrapper icon={item.icon as React.ComponentType<any>} className="mr-3 text-lg flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Desktop Collapsible Sidebar (fixed) */}
      <aside
        className={`hidden md:flex flex-col h-screen bg-seeslBlue text-white shadow-lg z-30 transition-all duration-300 ease-in-out
                    ${isDesktopSidebarCollapsed ? 'w-20' : 'w-64'}`}
        aria-label="Desktop Sidebar"
      >
        <div className="flex flex-col h-full w-full p-4"> {/* Inner padding for content */}
          {/* Top section: Logo and App Name */}
            <div className={`flex-shrink-0 mb-8 mt-2 flex flex-col items-center ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}>
            <img
              className={`h-10 w-auto transition-opacity duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}
              src="/seesl_logo.png"
              alt="SEESL Logo"
            />
            <h1 className={`text-xl font-semibold transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-center
                    ${isDesktopSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              CertiDocs SEESL(client)
            </h1>
            </div>

          {/* Navigation links */}
          
          <nav className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center p-2 rounded-md transition duration-200
                      ${location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                        ? 'bg-seeslLightBlue text-white'
                        : 'hover:bg-seeslLightBlue hover:text-white'}`}
                    title={isDesktopSidebarCollapsed ? item.name : ''}
                  >
                    <IconWrapper icon={item.icon as React.ComponentType<any>} className={`${isDesktopSidebarCollapsed ? 'mx-auto' : 'mr-3'} text-lg flex-shrink-0`} />
                    <span className={`font-medium whitespace-nowrap overflow-hidden ${isDesktopSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-shrink-0 mt-auto pt-4 border-t border-seeslLightBlue/30">
            <div className={`flex flex-col items-center justify-center mb-4 transition-opacity duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
              <img src="/CertiDocs Primary Logo-and-text.jpg" alt="CertiDocs Logo" className="h-8 w-auto mb-2" />
              <p className="text-xs text-gray-300">&copy; {new Date().getFullYear()} CertiDocs</p>
            </div>
            <button
              onClick={toggleDesktopSidebar}
              className="w-full flex items-center justify-center p-2 rounded-md text-white hover:bg-seeslLightBlue focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Toggle sidebar collapse"
            >
              <IconWrapper
                icon={
                  (isDesktopSidebarCollapsed ? FaAngleDoubleRight : FaAngleDoubleLeft) as React.ComponentType<any>
                }
                className="text-xl"
              />
              <span className={`ml-2 transition-opacity duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                {isDesktopSidebarCollapsed ? '' : 'Collapse'}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
