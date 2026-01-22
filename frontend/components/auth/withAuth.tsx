import { useRouter } from 'next/router';
import React, { ComponentType, useEffect } from 'react';
import { useAuth, Role } from '../context/AuthContext';

interface WithAuthProps {
  // You can add any additional props you want to pass to the wrapped component
}

const withAuth = <P extends object>(
  WrappedComponent: ComponentType<P>,
  allowedRoles: Role[]
): React.FC<P & WithAuthProps> => {
  const WithAuth: React.FC<P & WithAuthProps> = (props) => {
    const { user, isAuthenticated, isInitialLoad, hasAnyRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isInitialLoad) {
        if (!isAuthenticated) {
          router.replace('/login');
        } else if (user && !hasAnyRole(allowedRoles)) {
          router.replace('/unauthorized'); // Or some other page
        }
      }
    }, [isAuthenticated, isInitialLoad, user, router, hasAnyRole, allowedRoles]);

    if (isInitialLoad || !isAuthenticated || (user && !hasAnyRole(allowedRoles))) {
      // You can return a loading spinner or some other placeholder component here
      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">
          <div className="text-xl">Loading...</div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };

  return WithAuth;
};

export default withAuth;