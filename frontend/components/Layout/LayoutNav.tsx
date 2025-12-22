import React from 'react';
import { useAuth, Role } from '../context/AuthContext';
import Link from 'next/link';
import Logo from '../common/Logo'; // <-- New Import

const LayoutNav: React.FC = () => {
  const { user, logout } = useAuth();

  // Define navigation links based on user role permissions (RBAC Matrix)
  const navLinks = [
    { 
      label: 'Dashboard', 
      href: '/dashboard/ceo', 
      roles: [Role.Admin, Role.ITHead, Role.Finance, Role.CEO, Role.OperationalHead] 
    },
    { 
      label: 'Expense Tracker', 
      href: '/expense/tracker', 
      roles: [Role.Admin, Role.AssignedProjectUser] 
    },
    { 
      label: 'Budget Drafting', 
      href: '/budget/draft', 
      roles: [Role.Admin, Role.Finance, Role.AssignedProjectUser] 
    },
    { 
      label: 'Reporting', 
      href: '/reporting/variance', 
      roles: [Role.Admin, Role.Finance, Role.OperationalHead] 
    },
  ];

  const visibleLinks = navLinks.filter(link => user && link.roles.includes(user.role));

  return (
    <nav className="bg-brand-dark p-4 shadow-lg fixed w-full z-10 top-0">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        
        {/* Logo and Brand Name */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-white text-xl font-bold tracking-wider flex items-center">
            {/* LOGO FIX: Use the Centralized Logo Component (sm size) */}
            <div className="mr-2">
              <Logo size="sm" />
            </div>
            SentinelFi
          </Link>
          
          {/* Role-Based Links */}
          <div className="hidden md:flex space-x-6">
            {visibleLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-gray-300 hover:text-brand-primary transition duration-150 text-sm font-medium">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* User Info and Logout */}
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{user?.email}</p>
            <p className="text-xs text-brand-primary/80">{user?.role}</p>
          </div>
          <button 
            onClick={logout}
            className="text-sm font-medium text-red-400 hover:text-red-300 transition duration-150"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default LayoutNav;
