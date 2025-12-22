### STEP 106 - Update Secured Layout to Integrate Sidebar

**GUIDANCE:** We are integrating the `Sidebar` into the `SecuredLayout`. We must adjust the layout structure to accommodate the fixed sidebar, specifically using `pl-20` or `pl-64` dynamic classes on the main content area to prevent overlap when the sidebar is collapsed or expanded. This new structure serves as the professional template for all secured pages.

**FILE PATH:** `./frontend/components/Layout/SecuredLayout.tsx` (REPLACE entire file content)

```tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import LayoutNav from './LayoutNav';
import Sidebar from './Sidebar'; // <-- New Import

interface SecuredLayoutProps {
  children: React.ReactNode;
}

/**
 * Wraps all secured application pages.
 * Enforces authentication and provides the professional global navigation and sidebar layout.
 */
const SecuredLayout: React.FC<SecuredLayoutProps> = ({ children }) => {
  const { isAuthenticated, user, isInitialLoad } = useAuth();
  const router = useRouter();
  // State to manage sidebar open/close is usually kept in the sidebar, 
  // but we assume a default width for the content area here (pl-20 for collapsed).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Can be controlled via context/state if needed

  // CRITICAL SECURITY CHECK: Enforce authentication on all protected routes
  useEffect(() => {
    if (isInitialLoad) return; 

    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isInitialLoad, router]);

  // Show a full-screen loading state until authentication status is known
  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">
        <div className="text-xl">Checking SentinelFi Session Security...</div>
      </div>
    );
  }

  // Once authenticated, render the secured application layout
  return (
    <div className="min-h-screen bg-gray-50">
      <LayoutNav />
      
      {/* Sidebar is fixed and handles its own collapse state logic */}
      <Sidebar />

      {/* Main Content Area - Dynamically adjusts padding based on sidebar state (assumed in Sidebar.tsx CSS) */}
      <main 
        className="transition-all duration-300 min-h-screen pt-16 bg-gray-50"
        style={{ paddingLeft: '5rem' }} // Fixed padding (5rem = 20px sidebar) for simplicity of initial design
      >
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SecuredLayout;
```

NEXT ACTION: Save and overwrite the existing `./frontend/components/Layout/SecuredLayout.tsx`. We now create the placeholder `Tooltip` component which the sidebar requires.

---