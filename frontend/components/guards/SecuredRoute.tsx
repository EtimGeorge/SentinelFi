
import React from 'react';
import { useRoleGuard, RoleEnum } from '../../hooks/useAuthHooks';
import AppLoadingFallback from '../common/AppLoadingFallback';

interface SecuredRouteProps {
  children: React.ReactNode;
  requiredRoles?: RoleEnum[];
  requiredPermissions?: string[];
  fallbackPath?: string;
}

const SecuredRoute: React.FC<SecuredRouteProps> = ({
  children,
  requiredRoles,
  requiredPermissions,
  fallbackPath,
}) => {
  const { isAuthorized, isChecking } = useRoleGuard({
    requiredRoles,
    requiredPermissions,
    fallbackPath,
  });

  if (isChecking) {
    return <AppLoadingFallback isAuthenticating={true} />;
  }

  if (!isAuthorized) {
    // The useRoleGuard hook handles the redirection.
    // We render null here to prevent any rendering of children before the redirect happens.
    return null;
  }

  return <>{children}</>;
};

export default SecuredRoute;
