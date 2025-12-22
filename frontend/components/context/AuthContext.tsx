import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/router";
import api from "../../lib/api"; //

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
  role: Role;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  // The 'token' property is removed because it is now HttpOnly
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // New loading state for initial check
  const router = useRouter();

  // CRITICAL: New initial check. We need a secure API call to see if a valid cookie exists.
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log("checkAuthStatus: started"); // Added log
      try {
        console.log("checkAuthStatus: making API call to /auth/test-secure"); // Added log
        // Hitting a secured endpoint forces the cookie to be sent. If valid, user data returns.
        const response = await api.get("/auth/test-secure");
        console.log("checkAuthStatus: API call successful", response.status); // Added log

        // Use a dummy decode to get the user data for context display without exposing the token
        const userFromApi = response.data.user_data_from_token;
        setUser({
          id: userFromApi.id,
          email: userFromApi.email,
          role: userFromApi.role,
        });
      } catch (error) {
        console.error("checkAuthStatus: API call failed", error); // Added log
        // 401/403 (token expired/invalid) or network error
        setUser(null); // This is good, clears any old user state
      } finally {
        console.log(
          "checkAuthStatus: finally block executed, setting isInitialLoad to false"
        ); // Added log
        setIsInitialLoad(false); // THIS SHOULD BE CALLED!
      }
    };
    checkAuthStatus();
  }, []);

  // 2. Secure Login Function (Receives role, sets cookie on backend)
const login = useCallback(async (email, password) => {
    try {
      // CRITICAL FIX: Trim whitespace from user input for final validation stability
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      // 1. POST sends credentials, backend sets HttpOnly cookie, response returns only the role
      const response = await api.post<{ success: boolean, user_role: Role }>(
        '/auth/login',
        { email: trimmedEmail, password: trimmedPassword } // Use trimmed credentials
      );
      
      if (!response.data.success) {
         throw new Error('Login failed. Backend returned non-success status.');
      }
      
      // CRITICAL: Trust the backend's 200 OK status. Set minimal user data for UI immediacy.
      setUser({ id: 'TEMP_ID', email: trimmedEmail, role: response.data.user_role }); 
      setIsInitialLoad(false);

      // 2. Manual Redirection Logic based on the returned role
      const role = response.data.user_role;

      if (role === Role.CEO || role === Role.Finance) {
        router.push('/dashboard/ceo');
      } else if (role === Role.AssignedProjectUser) {
        router.push('/expense/tracker');
      } else {
        router.push('/dashboard/home'); 
      }
      
    } catch (error) {
      const errorMessage = (error as any).response?.data?.message || 'Login failed. Invalid credentials.';
      console.error('Final Diagnosis Login Error:', errorMessage);
      setIsInitialLoad(false); 
      throw new Error(errorMessage);
    }
}, [router]);

  // CRITICAL: New logout endpoint to clear the HttpOnly cookie (endpoint to be created next)
  const logout = useCallback(async () => {
    try {
      // Call a backend endpoint to clear the cookie
      await api.post("/auth/logout");
    } catch (e) {
      console.warn(
        "Logout endpoint failed, proceeding with client-side cleanup."
      );
    } finally {
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isInitialLoad,
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
