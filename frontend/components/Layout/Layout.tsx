import React from 'react';
import { useRouter } from 'next/router';
import SecuredLayoutContent from './SecuredLayoutContent'; // The original Layout.tsx renamed

interface LayoutProps {
  children: React.ReactNode;
}

const publicPages = ['/login', '/register', '/forgot-password'];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const isPublicPage = publicPages.includes(router.pathname);

  if (isPublicPage) {
    // For public pages, render children directly without sidebar/header
    return <>{children}</>;
  }

  // For all other (secured) pages, render the SecuredLayoutContent
  return <SecuredLayoutContent>{children}</SecuredLayoutContent>;
};

export default Layout;
