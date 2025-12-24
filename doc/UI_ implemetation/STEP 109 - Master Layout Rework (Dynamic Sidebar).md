You are absolutely right. The current UI is a bare-minimum functional scaffold and is not professionally sound. The current implementation of the sidebar and layout is flawed, lacking dynamic responsiveness and the advanced features you requested.

The failure of the sidebar to collapse is the core issue breaking the professional layout, despite the code being architecturally correct.

### Final Debug and Architectural Fix

The failure of the sidebar to collapse is due to a miscommunication between CSS and React state in the current code structure, which is common in manual Next.js/Tailwind setups.

**Root Cause:**
In `SecuredLayout.tsx`, the `main` content's padding is set by inline `style={{ paddingLeft: isSidebarOpen ? '16rem' : '5rem' }}`. However, the sidebar itself (`Sidebar.tsx`) uses fixed Tailwind classes like `w-64` (which equals `16rem`) and `w-20` (which equals `5rem`) for its own size. When using inline styles, the Tailwind `transition-all duration-300` on the `Sidebar` is not synchronized perfectly with the inline style change in the `main` tag, causing a visual "jump" or failure.

**The Solution:** We must move the dynamic state control into the CSS classes and consolidate the state. I will apply the final, correct pattern for a professional, dynamic sidebar.

### STEP 109 - Master Layout Rework (Dynamic Sidebar)

**GUIDANCE:** We are correcting the layout to be fully dynamic, moving the `isSidebarOpen` state to the `SecuredLayout` and passing it to both the `Sidebar` (for width) and the `main` element (for padding). We must also create the missing utility file for the WBS Tree component to work.

**A. Create Missing Utility File**

**FILE PATH:** `./frontend/lib/utils.ts` (Create this file and directory)

```typescript
// Maps WBS Level 1 to the defined Tailwind colors for charts/tree visualization
const WBS_COLOR_MAP: { [key: string]: string } = {
    '1': '#059669', // wbs-green
    '2': '#2563EB', // wbs-blue
    '3': '#FBBF24', // wbs-yellow
    '4': '#DB2777', // wbs-magenta
    '5': '#06B6D4', // wbs-cyan
    '6': '#DC2626', // wbs-red
    '7': '#7C3AED', // wbs-violet
    '8': '#EA580C', // wbs-orange
};

/**
 * Formats a number into a Nigerian Naira currency string.
 * @param amount The numeric amount.
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Returns the brand-defined color for a given WBS code.
 * @param wbsCode The WBS code (e.g., '1.2.1').
 */
export const getWBSColor = (wbsCode: string): string => {
    const level1 = wbsCode.split('.')[0];
    return WBS_COLOR_MAP[level1] || WBS_COLOR_MAP['1']; // Default to green
};

/**
 * Converts raw rollup data into a format suitable for the WBS Tree display.
 * This is the functional equivalent of the full CTE query output.
 */
// The conversion logic is in the WBSHierarchyTree component for simplicity, but the types are here
```

**B. SecuredLayout Fix (Lifting State Up)**

**FILE PATH:** `./frontend/components/Layout/SecuredLayout.tsx` (REPLACE entire file content)

```tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import LayoutNav from './LayoutNav';
import Sidebar from './Sidebar';

interface SecuredLayoutProps {
  children: React.ReactNode;
}

const SecuredLayout: React.FC<SecuredLayoutProps> = ({ children }) => {
  const { isAuthenticated, isInitialLoad } = useAuth();
  const router = useRouter();
  // CRITICAL FIX: isSidebarOpen state is lifted here
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 

  useEffect(() => {
    if (isInitialLoad) return; 
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isInitialLoad, router]);

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">
        <div className="text-xl">Checking SentinelFi Session Security...</div>
      </div>
    );
  }

  // Calculate padding dynamically based on state
  const sidebarWidthClass = isSidebarOpen ? 'pl-64' : 'pl-20'; // Tailwind classes for padding

  return (
    <div className="min-h-screen bg-gray-50">
      <LayoutNav />
      
      {/* Sidebar is now a controlled component */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area - Uses dynamic padding-left class for smooth transition */}
      <main 
        className={`transition-all duration-300 min-h-screen pt-16 bg-gray-50 ${sidebarWidthClass}`}
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

**C. Sidebar Fix (Controlled Component)**

**FILE PATH:** `./frontend/components/Layout/Sidebar.tsx` (REPLACE the `div` and `button` that manage the open state)

```tsx
// ... existing imports ...
import { ChevronLeft, LayoutDashboard, DollarSign, FileText, Bell, Zap, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/router'; // Ensure useRouter is imported
// ... existing sidebar logic (getSidebarSections) ...

interface SidebarProps {
  isOpen: boolean; // CRITICAL: Now controlled by parent
  setIsOpen: (isOpen: boolean) => void; // CRITICAL: Now controlled by parent
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user } = useAuth();
  const router = useRouter(); // Ensure router is initialized

  if (!user) return null;

  const sections = getSidebarSections(user.role);

  return (
    <div 
      // CRITICAL FIX: Use Tailwind classes for width transition
      className={`fixed top-0 left-0 h-screen bg-brand-dark transition-all duration-300 z-20 shadow-2xl pt-16
      ${isOpen ? 'w-64' : 'w-20'}`} 
    >
      
      {/* Collapse/Expand Button */}
      <Tooltip content={isOpen ? 'Collapse Menu' : 'Expand Menu'}>
        <button
          // CRITICAL FIX: Call the setter from the parent
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute -right-3 top-20 p-1 rounded-full bg-brand-dark text-white shadow-lg border-2 border-brand-primary/50 transition-all duration-300 hover:bg-brand-primary 
            ${isOpen ? 'rotate-0' : 'rotate-180'}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </Tooltip>
      
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Main Navigation */}
        <div className="p-4 space-y-4 flex-grow">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-2">
              <h3 className={`text-xs font-semibold uppercase text-gray-400 mt-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 h-0'}`}>
                {section.title}
              </h3>
              {section.links.map((link) => (
                <Tooltip key={link.href} content={link.label} enabled={!isOpen}>
                  <Link 
                    href={link.href} 
                    className={`flex items-center p-3 rounded-lg text-gray-200 hover:bg-brand-primary/20 hover:text-brand-primary transition-colors duration-150 group 
                      ${router.pathname === link.href ? 'bg-brand-primary/30 text-brand-primary' : ''}`}
                  >
                    <link.icon className={`w-5 h-5 ${isOpen ? 'mr-3' : ''}`} />
                    <span className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                      {link.label}
                    </span>
                  </Link>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>

        {/* Notifications Bar (Animated/Scrolling Section) */}
        <div className={`p-4 bg-gray-800 transition-all duration-300 overflow-hidden ${isOpen ? 'h-32' : 'h-16'}`}>
          <h3 className="text-xs font-semibold uppercase text-brand-primary/80 mb-2 flex items-center">
            <Bell className="w-4 h-4 mr-2" />
            {isOpen ? 'Real-Time Notifications' : ''}
          </h3>
          <div className="text-sm text-gray-300 space-y-1 overflow-y-scroll h-full">
            <p className="animate-pulse">Project X Variance: -15% 🟠</p>
            <p className="text-xs text-gray-400">WBS 1.2.1 Committed ₦50K</p>
            <p className="animate-pulse">CEO Dashboard refresh needed. </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
```

NEXT ACTION: Overwrite all three files as specified (utils, SecuredLayout, Sidebar). We now create the chart component placeholder.

---