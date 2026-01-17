// /frontend/components/Layout/SuperAdminLayout.tsx (New version: Logic wrapper)
import React from 'react';
import SuperAdminLayoutUI from './SuperAdminLayoutUI'; // Import the presentational component

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ children }) => {
  return <SuperAdminLayoutUI>{children}</SuperAdminLayoutUI>;
};

export default SuperAdminLayout;
