import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/router";
import api from "../../lib/api";

// Define the roles from the backend (must match backend/src/auth/enums/role.enum.ts)
// The role enum should ideally be imported from a shared constants file or a backend API client
// For now, we define it here for clarity.
export enum Role {
  Admin = "Admin",
  ITHead = "IT Head",
  Finance = "Finance",
  OperationalHead = "Operational Head",
  CEO = "CEO",
  AssignedProjectUser = "Assigned Project User",
}

interface User {
  id: string;
  email: string;
  username: string; // Added for display in UI components
  role: Role;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isInitialLoad: boolean;
  hasRole: (roles: Role[]) => boolean;
  // The 'token' property is removed because it is now HttpOnly
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const router = useRouter();

  // Centralized Redirect Logic
  useEffect(() => {
    // Don't redirect until the initial auth check is complete.
    if (isInitialLoad) {
      return;
    }

    const isAuthPage = ['/login', '/register', '/forgot-password'].includes(
      router.pathname
    );

    let targetPath = null;

    if (user) {
      // User is authenticated
      if (isAuthPage) {
        // If on an auth page, redirect to the appropriate dashboard
        if (
          user.role === Role.CEO ||
          user.role === Role.Finance ||
          user.role === Role.Admin ||
          user.role === Role.ITHead
        ) {
          targetPath = '/dashboard/ceo';
        } else if (user.role === Role.AssignedProjectUser) {
          targetPath = '/expense/tracker';
        } else {
          targetPath = '/dashboard/home'; // Fallback
        }
      }
    } else {
      // User is not authenticated
      if (!isAuthPage && router.pathname !== '/') {
        // If on a protected page (and not the root redirector), send to login
        targetPath = '/login';
      }
    }

    if (targetPath && router.pathname !== targetPath) { // NEW: Only navigate if targetPath is different
      router.replace(targetPath);
    }
  }, [user, isInitialLoad, router]);

  // CRITICAL: New initial check. We need a secure API call to see if a valid cookie exists.
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Hitting a secured endpoint forces the cookie to be sent. If valid, user data returns.
        const response = await api.get('/auth/test-secure');

        // Use a dummy decode to get the user data for context display without exposing the token
        const userFromApi = response.data.user_data_from_token;
        setUser({
          id: userFromApi.id,
          email: userFromApi.email,
          username: userFromApi.username || userFromApi.email, // Assume username is provided, fallback to email
          role: userFromApi.role,
        });
      } catch (error) {
        console.error('checkAuthStatus: API call failed', error); // Keeping this for actual errors
        // 401/403 (token expired/invalid) or network error
        setUser(null); // This is good, clears any old user state
      } finally {
        setIsInitialLoad(false); // THIS SHOULD BE CALLED!
      }
    };
    checkAuthStatus();
  }, []);

  const hasRole = (roles: Role[]) => {
    if (user) {
      return roles.includes(user.role);
    }
    return false;
  };

  // 2. Secure Login Function (Receives role, sets cookie on backend)
  const login = useCallback(
    async (email, password, rememberMe) => {
      try {
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        // 1. POST sends credentials, backend sets HttpOnly cookie, and now returns the full user object
        const response = await api.post<{ success: boolean; user: User }>(
          '/auth/login',
          { email: trimmedEmail, password: trimmedPassword, rememberMe }
        );

        if (!response.data.success || !response.data.user) {
          throw new Error('Login failed. Invalid response from server.');
        }

        // 2. Set the REAL user object from the API response
        const userFromApi = response.data.user;
        setUser({
          ...userFromApi,
          // Derive username if not explicitly provided by backend
          username: (userFromApi as any).username || userFromApi.email,
        });
        setIsInitialLoad(false); // Explicitly set loading to false after login

      } catch (error) {
        const errorMessage =
          (error as any).response?.data?.message ||
          'Login failed. Invalid credentials.';
        console.error('Final Diagnosis Login Error:', errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  // CRITICAL: New logout endpoint to clear the HttpOnly cookie (endpoint to be created next)
  const logout = useCallback(async () => {
    try {
      // Call a backend endpoint to clear the cookie
      await api.post('/auth/logout');
    } catch (e) {
      console.warn(
        'Logout endpoint failed, proceeding with client-side cleanup.'
      );
    } finally {
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isInitialLoad,
    hasRole,
  };

  // Show a full page loading screen during the initial check
  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">
        <div className="text-xl">Checking SentinelFi Session Security...</div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
