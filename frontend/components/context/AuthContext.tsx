import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/router";
import api from "../../lib/api";
import type { User } from "shared/types/user";
import { Role } from "shared/types/role.enum";
import { toast } from 'react-hot-toast';

export { Role };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isInitialLoad: boolean;
  hasRole: (roles: Role[]) => boolean;
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

  const logout = useCallback(async (redirect = true) => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout endpoint failed, proceeding with client-side cleanup.');
    } finally {
      setUser(null);
      if (redirect) {
        window.location.href = '/login';
      }
    }
  }, []);

  // Setup interceptors on initial load
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && window.location.pathname !== '/login') {
          toast.error('Session expired. Please log in again.');
          logout();
        }
        return Promise.reject(error);
      }
    );

    // Eject the interceptor when the component unmounts
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await api.get('/auth/test-secure');
        setUser(response.data.user_data_from_token);
      } catch (error) {
        setUser(null);
      } finally {
        setIsInitialLoad(false);
      }
    };
    checkAuthStatus();
  }, []);

  // Centralized Redirect Logic
  useEffect(() => {
    if (isInitialLoad) return;
    const isAuthenticated = !!user;
    const isAuthPage = ['/login', '/register', '/forgot-password'].includes(router.pathname);

    if (isAuthenticated) {
      if (user.isSuperAdmin) {
        if (router.pathname !== '/super/tenants') router.replace('/super/tenants');
      } else if (isAuthPage || router.pathname.startsWith('/super')) { // If SuperAdmin pages are accessed by non-SuperAdmin
        router.replace('/dashboard/home');
      }
    } else {
      if (!isAuthPage) router.replace('/login');
    }
  }, [user, isInitialLoad, router]);

  const hasRole = (roles: Role[]) => !!user && roles.includes(user.role);

  const login = useCallback(async (email, password, rememberMe) => {
    try {
      const response = await api.post('/auth/login', { email, password, rememberMe });
      if (!response.data.success || !response.data.user) throw new Error('Login failed.');
      setUser(response.data.user);
      setIsInitialLoad(false);
    } catch (error) {
      const errorMessage = (error as any).response?.data?.message || 'Login failed.';
      throw new Error(errorMessage);
    }
  }, []);

  const value = { user, isAuthenticated: !!user, login, logout, isInitialLoad, hasRole };

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-xl animate-pulse">Initializing SentinelFi Session...</div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
