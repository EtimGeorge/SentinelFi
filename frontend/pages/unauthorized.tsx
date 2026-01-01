import React from 'react';
import Link from 'next/link';
import { useAuth } from '../components/context/AuthContext';
import { Role } from '../components/context/AuthContext';

const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case Role.CEO:
      case Role.Finance:
        return '/dashboard/ceo';
      case Role.AssignedProjectUser:
        return '/expense/tracker';
      default:
        return '/dashboard/home';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-alert-critical mb-4">Access Denied</h1>
        <p className="text-gray-300 mb-6">
          You do not have the necessary permissions to view this page.
        </p>
        <Link 
          href={getDashboardLink()} 
          className="px-6 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primary/90"
        >
          Return to Your Dashboard
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;