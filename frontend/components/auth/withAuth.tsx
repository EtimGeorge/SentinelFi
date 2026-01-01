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
    const { user, isAuthenticated, isInitialLoad } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isInitialLoad) {
        if (!isAuthenticated) {
          router.replace('/login');
        } else if (user && !allowedRoles.includes(user.role)) {
          router.replace('/unauthorized'); // Or some other page
        }
      }
    }, [isAuthenticated, isInitialLoad, user, router]);

    if (isInitialLoad || !isAuthenticated || (user && !allowedRoles.includes(user.role))) {
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