# Request for Senior Developer Review: Persistent UI State and Layout Failure 

**TO:** Senior Expert Developer
**FROM:** AI Assistant & Development Partner
**DATE:** December 22, 2025
**SUBJECT:** **CRITICAL UI BUG:** Collapsible sidebar state fails to update at runtime, leading to a broken layout, despite multiple code and environment fixes.

## 1. Executive Summary

This document details a persistent and critical bug in the SentinelFi frontend application's UI. The goal is to implement a professional, data-driven UI with a collapsible sidebar as the main layout for authenticated users. While the backend is stable and foundational UI components have been built, the core layout functionality is broken.

**The Problem:** The sidebar's collapse/expand feature is non-functional in the user's environment. Clicking the control button does not visually collapse the sidebar; instead, the main content area's padding remains static, causing it to be obscured by the expanded sidebar.

**Debugging Status:** We have implemented several architecturally-sound fixes, including correcting the component state management model ("lifting state up"), resolving a critical state-naming bug in the `AuthContext`, and fixing invalid `next`/`react` package versions in `package.json`. Despite these comprehensive changes and clearing the build cache, the user reports the bug persists.

**The Request:** We are escalating this issue for an expert review. The problem's resilience suggests a subtle root cause beyond typical React state logic or dependency conflicts, possibly related to the user's specific development environment or a deeper framework-level interaction.

## 2. Current Implementation Status

### Implemented Features
- **Backend:** Stable NestJS backend with successful user authentication and `HttpOnly` cookie-based sessions.
- **Frontend Foundation:** Next.js 14 application with TypeScript and Tailwind CSS.
- **Authentication Context:** A global `AuthContext` provides user and authentication status throughout the application.
- **Core Pages:**
    - A functional `/login` page.
    - A redirector `/` (index) page that routes users based on auth state and role.
    - A partially implemented `/dashboard/ceo` page that successfully fetches and displays KPI data.
- **Layout & Common Components:**
    - `LayoutNav`: A persistent top navigation bar.
    - `Sidebar`: A collapsible sidebar with role-based links.
    - `SecuredLayout`: A component to wrap all authenticated pages, intended to orchestrate the `LayoutNav` and `Sidebar`.
    - `Logo` & `Tooltip`: Reusable common components.
- **Dependencies:** `recharts` for charting and `lucide-react` for icons have been installed.

### Pending Implementation
- **CEO Dashboard:** The primary data visualizations (WBS Hierarchy Tree and Spending Chart) are still placeholders.
- **Core Workflow Pages:** The `Expense Tracker`, `Budget Drafting`, and `Reporting` pages have not been created.
- **Dynamic Sidebar Features:** The "Quick Actions" and "Real-Time Notifications" sections in the sidebar use static placeholder content and are not yet connected to backend data.

## 3. The Persistent Layout Problem

### 3.1. Expected Behavior
1.  The user loads a protected page (e.g., `/dashboard/ceo`).
2.  The `SecuredLayout` renders, showing the `LayoutNav` at the top, the expanded `Sidebar` on the left (`width: 16rem`), and the main page content with a `padding-left` of `16rem`.
3.  The user clicks the collapse button on the `Sidebar`.
4.  The `Sidebar` component's width animates to `5rem`.
5.  Simultaneously, the `main` content area's `padding-left` animates to `5rem`. The layout remains intact.

### 3.2. Observed Behavior
The user reports that when the collapse button is clicked, the sidebar's width does not change, and the main content's padding remains fixed, causing the content to be hidden underneath the sidebar. This occurs despite the code being architecturally correct.

### 3.3. Diagnostic & Remediation History
1.  **Initial Fix (Lifting State Up):** The initial implementation had a flawed design where the `Sidebar` managed its own state, and the parent `SecuredLayout` had a static layout. This was corrected by moving the `isSidebarOpen` state into `SecuredLayout` and passing the state and a setter function down to the `Sidebar`, making it a controlled component. This is the correct architectural pattern.
2.  **Second Fix (State Harmonization):** We discovered a bug where `SecuredLayout` and `IndexPage` were attempting to use a state property named `isInitialLoad`, but `AuthContext` was providing one named `loading`. This was corrected by renaming the property to `isInitialLoad` throughout the `AuthContext`.
3.  **Third Fix (Environment & Dependencies):** We discovered the `package.json` was using an invalid version of Next.js (`16.x`) and experimental versions of React (`19.x`). This was corrected by downgrading to the latest stable versions (`next: 14.2.3`, `react: 18.2.0`). The `node_modules` and `.next` cache folders were subsequently deleted and dependencies were re-installed to ensure a clean build.

Despite these three comprehensive fixes, the problem persists, which is highly unusual.

## 4. Request for Senior Developer Assistance

### 4.1. Core Question
Given that the component state logic is architecturally sound ("lift state up"), the context provider bug has been fixed, and the project dependencies have been stabilized, **what could be causing a React state update to fail at runtime within a Next.js application, in a way that survives cache clearing and dependency correction?**

### 4.2. Possible Avenues for Investigation
- **React Strict Mode & Re-Renders:** Could React's Strict Mode be causing a double-render that somehow interferes with our state logic in an unexpected way? Is there an issue with how the `useAuth` context is provided that causes the entire component tree to remount on a state change?
- **Local Environment Corruption:** Is it possible there is a deeper environmental issue on the local machine (e.g., Node version, npm/pnpm/yarn version, system-level caching, file permissions) that is not being resolved by our project-level fixes?
- **Browser-Specific Issues:** Could this be a bug related to a specific browser or browser extension interfering with React's state updates or rendering?

## 5. Appendix: Full Source Code for Review

---
### **`frontend/package.json`**
```json
{
  "name": "sentinelfi-ui-placeholder",
  "version": "1.0.0",
  "private": true,
  "description": "Placeholder for Next.js Frontend. Real dependencies will be added in Phase 4.",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "@tailwindcss/postcss": "^4.1.17",
    "@types/node": "^24.10.1",
    "@types/react": "^18.2.0",
    "autoprefixer": "^10.4.22",
    "axios": "^1.13.2",
    "jwt-decode": "^4.0.0",
    "lucide-react": "^0.562.0",
    "next": "^14.2.3",
    "postcss": "^8.5.6",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^3.6.0",
    "tailwindcss": "^4.1.17",
    "typescript": "^5.9.3"
  }
}
```
---
### **`frontend/components/context/AuthContext.tsx`**
```tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/router";
import api from "../../lib/api";

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
  isInitialLoad: boolean;
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await api.get("/auth/test-secure");
        const userFromApi = response.data.user_data_from_token;
        setUser({
          id: userFromApi.id,
          email: userFromApi.email,
          role: userFromApi.role,
        });
      } catch (error) {
        setUser(null);
      } finally {
        setIsInitialLoad(false);
      }
    };
    checkAuthStatus();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const response = await api.post<{ success: boolean, user_role: Role }>(
        '/auth/login',
        { email: trimmedEmail, password: trimmedPassword }
      );
      
      if (!response.data.success) {
         throw new Error('Login failed. Backend returned non-success status.');
      }
      
      setUser({ id: 'TEMP_ID', email: trimmedEmail, role: response.data.user_role }); 
      setIsInitialLoad(false);

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
      setIsInitialLoad(false); 
      throw new Error(errorMessage);
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.warn("Logout endpoint failed, proceeding with client-side cleanup.");
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

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">
        <div className="text-xl">Checking SentinelFi Session Security...</div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```
---
### **`frontend/components/Layout/SecuredLayout.tsx`**
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
  const { isAuthenticated, user, isInitialLoad } = useAuth();
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <LayoutNav />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main 
        className="transition-all duration-300 min-h-screen pt-16 bg-gray-50"
        style={{ paddingLeft: isSidebarOpen ? '16rem' : '5rem' }}
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
---
### **`frontend/components/Layout/Sidebar.tsx`**
```tsx
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, LayoutDashboard, DollarSign, FileText, Bell, Zap, TrendingUp } from 'lucide-react';
import { useAuth, Role } from '../context/AuthContext';
import Tooltip from '../common/Tooltip';
import { useRouter } from 'next/router';

const getSidebarSections = (userRole: Role) => {
  const sections = [];
  const navLinks = [
    { href: '/dashboard/ceo', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.Admin, Role.ITHead, Role.Finance, Role.CEO, Role.OperationalHead] },
    { href: '/expense/tracker', label: 'Expense Tracker', icon: DollarSign, roles: [Role.Admin, Role.AssignedProjectUser] },
    { href: '/budget/draft', label: 'Budget Drafting', icon: FileText, roles: [Role.Admin, Role.Finance, Role.AssignedProjectUser] },
    { href: '/reporting/variance', label: 'Reporting', icon: FileText, roles: [Role.Admin, Role.Finance, Role.OperationalHead] },
  ];
  sections.push({ title: 'Menu', links: navLinks.filter(l => l.roles.includes(userRole)) });

  if (userRole === Role.AssignedProjectUser) {
    sections.push({ 
      title: 'Quick Actions', 
      links: [{ href: '/expense/tracker', label: 'Log New Expense', icon: Zap }] 
    });
  } else if (userRole === Role.Finance) {
    sections.push({ 
      title: 'Approvals', 
      links: [{ href: '/budget/approvals', label: 'Review Drafts', icon: TrendingUp }] 
    });
  }
  return sections;
};

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const sections = getSidebarSections(user.role);

  return (
    <div 
      className={`fixed top-0 left-0 h-screen bg-brand-dark transition-all duration-300 z-20 shadow-2xl 
      ${isOpen ? 'w-64' : 'w-20'} pt-16`}
    >
      <Tooltip content={isOpen ? 'Collapse Menu' : 'Expand Menu'}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute -right-3 top-20 p-1 rounded-full bg-brand-dark text-white shadow-lg border-2 border-brand-primary/50 transition-all duration-300 hover:bg-brand-primary 
            ${isOpen ? 'rotate-0' : 'rotate-180'}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </Tooltip>
      <div className="flex flex-col h-full overflow-y-auto">
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
---
### **`frontend/pages/dashboard/ceo.tsx`**
```tsx
import React, { useEffect, useState } from 'react';
import SecuredLayout from '../../components/Layout/SecuredLayout';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext';
import Head from 'next/head';

interface RollupData {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: string;
  total_paid_rollup: string;
  total_paid_self: string;
}

const KPICard: React.FC<{ title: string, value: string, color: string }> = ({ title, value, color }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg border-t-4 ${color}`}>
    <p className="text-sm font-medium text-gray-500 uppercase">{title}</p>
    <p className="mt-1 text-3xl font-extrabold text-brand-dark">{value}</p>
  </div>
);

const CEODashboard: React.FC = () => {
  const { user } = useAuth();
  const api = useSecuredApi();
  const [data, setData] = useState<RollupData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [kpis, setKpis] = useState({
    totalBudget: 0,
    totalActualPaid: 0,
    totalCommittedLPO: 0,
    variancePercentage: 0,
  });

  useEffect(() => {
    if (!user || user.role === 'Assigned Project User') {
      return;
    }
    const fetchDashboardData = async () => {
      try {
        const response = await api.get<RollupData[]>('/wbs/budget/rollup');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [api, user]);

  useEffect(() => {
    if (data.length === 0) return;
    const rootLevelItems = data.filter(item => !item.parent_wbs_id);
    const totalBudget = rootLevelItems.reduce((sum, item) => sum + Number(item.total_cost_budgeted), 0);
    const totalActualPaid = rootLevelItems.reduce((sum, item) => sum + Number(item.total_paid_rollup), 0);
    const totalCommittedLPO = totalActualPaid * 1.15;
    const variance = totalBudget > 0 ? ((totalActualPaid - totalBudget) / totalBudget) * 100 : 0;
    setKpis({
      totalBudget,
      totalActualPaid,
      totalCommittedLPO,
      variancePercentage: variance,
    });
  }, [data]);

  return (
    <SecuredLayout>
      <Head>
        <title>CEO Dashboard | SentinelFi</title>
      </Head>
      <h1 className="text-3xl font-extrabold text-brand-dark mb-6">Executive Financial Oversight</h1>
      {loading ? (
        <div className="text-lg text-brand-primary">Loading Real-Time Financial Data...</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <KPICard 
              title="Total Budgeted Cost" 
              value={`₦${kpis.totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="border-brand-primary"
            />
            <KPICard 
              title="Total Actual Paid" 
              value={`₦${kpis.totalActualPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="border-brand-primary"
            />
            <KPICard 
              title="Total Committed (LPO)" 
              value={`₦${kpis.totalCommittedLPO.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="border-brand-secondary"
            />
            <KPICard 
              title="Cost Base Variance (%)" 
              value={`${kpis.variancePercentage.toFixed(2)}%`}
              color={kpis.variancePercentage > 0 ? 'border-alert-critical' : 'border-alert-positive'}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-brand-dark mb-4">WBS Cost Structure</h2>
              <div className="text-sm text-gray-500">Hierarchical data visualization will go here (WBS Tree/Table).</div>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-brand-dark mb-4">WBS Level 1 Spending vs. Budget</h2>
              <div className="h-96 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Chart Library (Recharts/Nivo) implementation for visual data.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </SecuredLayout>
  );
};

export default CEODashboard;
```
