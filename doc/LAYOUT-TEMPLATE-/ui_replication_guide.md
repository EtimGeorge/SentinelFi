# UI Replication Guide: Layout, Header, Sidebar, and Login Page (Revised)

This document provides a precise strategy for replicating the core UI layout, including the Header, Sidebar, and Login Page, from your existing CertiDocs application into a new React project. It incorporates the actual code structure, styling, and logic from your provided `Header.tsx`, `Sidebar.tsx`, `Layout.tsx`, and `uiStore.ts` files, and addresses the specific issues you observed.

**Key Principles Adopted in Your Application:**
*   **Component-Based Architecture:** Leveraging React for modular and reusable UI components.
*   **Tailwind CSS for Styling:** Utilizing a utility-first CSS framework for rapid and consistent styling, promoting responsive design.
*   **Zustand for State Management:** A lightweight and efficient solution for global state, especially for UI concerns like sidebar state and notifications.
*   **Responsive Design:** Adapting seamlessly across various screen sizes (mobile, tablet, desktop).
*   **Consistent Spacing & Layout:** Standardized spacing scale for uniform margins, paddings, and element placement.

---

### **Addressing Video-Demonstrated Issues with Current Codebase:**

**1. "Blank space" and Header/Main Content Shifting:**

*   **Your Observation:** In the video, you showed a `<<` button in the header that, when clicked, caused the header's content to shift left, leaving a large empty space, while the blue sidebar remained fully open. You then expressed that the toggle button should be in the sidebar, and there shouldn't be a space between the sidebar and the main content when the sidebar is open.
*   **Analysis of Provided Code:** The `Header.tsx` file you've provided **does not contain a desktop `<<` toggle button**. It only has a `FaBars` icon which is `md:hidden` (for mobile sidebar toggle). Crucially, the `Sidebar.tsx` file **does contain the desktop toggle button** (`FaAngleDoubleLeft`/`FaAngleDoubleRight`) in its footer, which calls `toggleDesktopSidebar`.
*   **Conclusion based on Provided Code:** The behavior you showed in the video seems to be from an older or different UI implementation. With the current `Header.tsx`, `Sidebar.tsx`, and `Layout.tsx` code, the layout is designed to work as follows:
    *   **Desktop:** The `Sidebar` is correctly positioned as either fully open (`w-64`) or collapsed (`w-20`). The `Layout` component applies `md:ml-64` or `md:ml-20` to the main content area. This ensures the main content precisely aligns with the sidebar, **preventing any blank space between the sidebar and the main content**. The desktop toggle button is correctly located *within the sidebar's footer*.
*   **Recommendation:** If you still observe a "blank space" issue with the currently provided code, please ensure your local development server is running the absolute latest version of the code (`npm start` in the `frontend` directory after clearing browser cache). The existing code should visually resolve this.

**2. Mobile Sidebar Not Opening on Click:**

*   **Your Observation:** In the video, clicking the `FaBars` icon on mobile did not open the sidebar.
*   **Analysis of Provided Code:**
    *   `Header.tsx`: The mobile hamburger button (`FaBars`) correctly calls `toggleMobileSidebar()` from `useUIStore`.
    *   `uiStore.ts`: The `toggleMobileSidebar` function correctly toggles the `isMobileSidebarOpen` state.
    *   `Sidebar.tsx`: The mobile sidebar's visibility is correctly controlled by the `isMobileSidebarOpen` state via `translate-x-0` (open) or `-translate-x-full` (closed). It's positioned with a high `z-50` to appear as an overlay.
*   **Conclusion:** The code logic for opening and closing the mobile sidebar is correctly implemented. If it's not opening in your environment, it strongly suggests a runtime issue:
    *   **Stale Build/Cache:** Your browser or local `npm start` server might be serving an older version of the JavaScript or CSS, or your browser cache needs clearing.
    *   **JavaScript Error:** A JavaScript error might be occurring elsewhere on the page, preventing the `onClick` event from firing or the state update from rendering the change.
*   **Recommendation:**
    1.  **Hard Refresh:** Clear your browser's cache (e.g., Ctrl+Shift+R or Cmd+Shift+R).
    2.  **Restart Development Server:** Stop your frontend development server (`Ctrl+C`) and restart it (`npm start`).
    3.  **Check Browser Console:** Open your browser's developer console (F12) and check for any JavaScript errors when clicking the mobile menu button.

---

## 1. Project Setup for New Application

To replicate the UI, you'll need a basic React project set up with Tailwind CSS.

**1.1. Initialize React Project (e.g., with Vite or Create React App):**

```bash
# Using Yarn (as per user preference)
yarn create vite my-new-app --template react-ts
cd my-new-app
yarn install
```

**1.2. Install and Configure Tailwind CSS:**

```bash
yarn add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**`tailwind.config.js` (Example Configuration with Your Current App's Brand Colors and Extended Spacing):**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Your current application's specific brand colors for reference.
        // For your new app, replace these with your new brand identity colors.
        seeslBlue: '#1a3a6d',       // Current app's dark blue
        seeslLightBlue: '#00c49a', // Current app's vibrant green
        // Define your new application's brand colors here:
        primary: '#4F46E5',         // Example new primary color (e.g., a vibrant blue/purple)
        'primary-dark': '#4338CA',  // Darker shade for hover states
        secondary: '#10B981',       // Example new secondary color (e.g., a friendly green)
        accent: '#F59E0B',          // Example new accent color (e.g., a warm orange)
        background: '#F9FAFB',      // General page background
        text: '#1F2937',            // Dark gray for primary text
        'text-light': '#6B7280',    // Lighter gray for secondary text
      },
      spacing: {
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
        '20': '5rem',     // 80px (used for collapsed sidebar width)
        '64': '16rem',    // 256px (used for expanded sidebar width)
        // Add more units as needed for a comprehensive spacing scale
      },
      // Add other theme extensions like typography, borderRadius, etc.
    },
  },
  plugins: [],
}
```

**`src/index.css` (or `src/App.css`):**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Add any global base styles here, but prefer Tailwind utilities */
body {
  font-family: 'Inter', sans-serif; /* Example font */
  @apply text-text bg-background; /* Apply global text and background colors defined in tailwind.config.js */
}
```

---

## 2. Global UI State Management (`uiStore.ts`)

Your application uses Zustand (`src/store/uiStore.ts`) for managing global UI states, specifically for controlling sidebar visibility/collapse and unread notification counts. This is a robust pattern for sharing state across components without prop-drilling.

**`src/store/uiStore.ts` (Actual Code):**

```typescript
import { create } from 'zustand';
import { getUnreadNotificationCount } from '../api/adminService';

interface UIState {
  isMobileSidebarOpen: boolean;
  isDesktopSidebarCollapsed: boolean;
  unreadNotificationsCount: number; // NEW: State for unread count

  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleDesktopSidebar: () => void;
  setUnreadNotificationsCount: (count: number) => void; // NEW: Setter for count
  fetchUnreadNotificationsCount: () => Promise<void>; // NEW: Function to fetch count from API
}

const useUIStore = create<UIState>((set, get) => ({ // get function needed for fetchUnreadNotificationsCount
  isMobileSidebarOpen: false,
  isDesktopSidebarCollapsed: false,
  unreadNotificationsCount: 0, // Initialize to 0

  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),
  toggleDesktopSidebar: () => set((state) => ({ isDesktopSidebarCollapsed: !state.isDesktopSidebarCollapsed })),
  setUnreadNotificationsCount: (count) => set({ unreadNotificationsCount: count }),

  fetchUnreadNotificationsCount: async () => {
    try {
      // Check if authenticated before fetching
      const token = localStorage.getItem('token');
      if (!token) {
        get().setUnreadNotificationsCount(0); // Reset if not authenticated
        return;
      }
      const response = await getUnreadNotificationCount();
      get().setUnreadNotificationsCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to fetch unread notification count:', error);
      get().setUnreadNotificationsCount(0); // Reset on error
    }
  },
}));

export default useUIStore;
```

**Key Learnings from `uiStore.ts`:**
*   **`isMobileSidebarOpen`:** Controls the visibility of the mobile overlay sidebar.
*   **`isDesktopSidebarCollapsed`:** Controls whether the desktop sidebar is in its narrow (`w-20`) or wide (`w-64`) state.
*   **`toggleMobileSidebar` / `closeMobileSidebar` / `toggleDesktopSidebar`:** Functions used by other components to update these states.
*   **`unreadNotificationsCount`:** Manages the count for the notification badge in the header, fetched via `fetchUnreadNotificationsCount`.

---

## 3. Main Layout Component (`Layout.tsx`)

This `Layout` component (`src/components/Layout.tsx`) orchestrates the overall structure, placing the `Header`, `Sidebar`, and managing the dynamic main content area.

**`src/components/Layout.tsx` (Actual Code):**

```typescript
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import useUIStore from "../store/uiStore";

const Layout: React.FC = () => {
  const { isDesktopSidebarCollapsed, isMobileSidebarOpen, closeMobileSidebar } =
    useUIStore();

  // Calculate the dynamic margin-left for the main content area on desktop
  const mainContentMarginClass = `md:ml-${
    isDesktopSidebarCollapsed ? "20" : "64"
  }`;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden ">
      {/* Sidebar is rendered here, handles its own fixed/overlay positioning */}
      <Sidebar />

      {/* Backdrop for mobile sidebar - closes sidebar when clicked outside */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        ></div>
      )}

      {/* Main content area dynamically adjusts its left margin on desktop */}
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${mainContentMarginClass} overflow-hidden`}
      >
        <Header />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet /> {/* Renders child routes here */}
        </main>
      </div>
    </div>
  );
};

export default Layout;
```

**Styling & Responsiveness Details:**
*   `flex h-screen bg-gray-100 overflow-hidden`: Establishes a flex container that spans the full viewport height, with a light gray background and hides any global overflow.
*   **Dynamic `mainContentMarginClass`:** This is a core part of the desktop layout's responsiveness.
    *   `md:ml-64`: When `isDesktopSidebarCollapsed` is `false` (sidebar expanded), the main content starts 16rem (256px) from the left, precisely matching the `w-64` of the expanded desktop sidebar.
    *   `md:ml-20`: When `isDesktopSidebarCollapsed` is `true` (sidebar collapsed), the main content starts 5rem (80px) from the left, matching the `w-20` of the collapsed desktop sidebar.
    *   **This implementation directly addresses and resolves the "blank space" issue** by ensuring the main content area always aligns directly next to the desktop sidebar, whether expanded or collapsed.
*   **Mobile Backdrop:** `fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden` creates a semi-transparent overlay that covers the main content when the mobile sidebar is open, and calls `closeMobileSidebar` when clicked, improving mobile UX.
*   `main` element uses `flex-1 p-4 sm:p-6 overflow-y-auto`: Allows the main content itself to scroll independently if its content exceeds the viewport height.

**Advanced Features & Improvements:**
*   **Theming Integration:** The `bg-gray-100` could be dynamically sourced from a global theme context to easily support light/dark modes or custom user themes.
*   **Customizable Content Width:** For better readability on very large screens, you might want to introduce a `max-w-7xl` or similar within the `<main>` element's `<div>` to constrain text line length, rather than `max-w-full`.

---

## 4. Header Component (`Header.tsx`)

The `Header` component (`src/components/Header.tsx`) is the top bar of your application, providing branding, user information, notification access, and the mobile sidebar toggle.

**`src/components/Header.tsx` (Actual Code):**

```typescript
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { FaUserCircle, FaSignOutAlt, FaBars, FaBell } from "react-icons/fa";
import Button from "./common/Button";
import IconWrapper from "./IconWrapper";
import useUIStore from "../store/uiStore";

const Header: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const {
    toggleMobileSidebar,
    unreadNotificationsCount,
    fetchUnreadNotificationsCount,
  } = useUIStore();
  const navigate = useNavigate();

  // Fetch unread count on mount and every few minutes (polling)
  useEffect(() => {
    fetchUnreadNotificationsCount(); // Initial fetch
    const interval = setInterval(fetchUnreadNotificationsCount, 60 * 1000); // Poll every 1 minute
    return () => clearInterval(interval); // Cleanup on unmount
  }, [fetchUnreadNotificationsCount]);

  const handleLogout = () => {
    clearAuth();
    useUIStore.getState().setUnreadNotificationsCount(0); // Clear unread count on logout
    navigate("/login");
  };

  const handleNotificationsClick = () => {
    navigate("/dashboard/notifications"); // Navigate to the notifications page
  };

  return (
    <header className="bg-white shadow-sm p-4 flex items-center justify-between z-30 sticky top-0">
      <div className="flex items-center">
        {/* Hamburger menu button for mobile (hidden on md and up) */}
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden text-seeslBlue hover:text-seeslLightBlue focus:outline-none focus:ring-2 focus:ring-seeslBlue p-2 rounded-md mr-4"
          aria-label="Open sidebar"
        >
          <IconWrapper
            icon={FaBars as React.ComponentType<any>}
            className="text-xl"
          />
        </button>
        <Link to="/dashboard" className="flex items-center space-x-2">
          <img src="/CertiDocs Primary Logo.jpg" alt="CertiDocs Logo" className="h-12 w-auto" />
          <span className="text-xl font-bold text-seeslBlue">CertiDocs SEESL <span className="text-sm">(client)</span></span>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notification Bell Icon with Badge */}
        <button
          onClick={handleNotificationsClick}
          className="relative p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-seeslBlue"
          aria-label="Notifications"
        >
          <IconWrapper
            icon={FaBell as React.ComponentType<any>}
            className="text-xl"
          />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {user && (
          <span className="text-gray-700 flex items-center text-sm sm:text-base">
            <IconWrapper
              icon={FaUserCircle as React.ComponentType<any>}
              className="mr-2 text-xl text-seeslLightBlue"
            />
            <span className="font-medium hidden sm:inline">
              {user.username}
            </span>
            <span className="capitalize text-xs sm:text-sm hidden md:inline">
              {" "}
              ({user.role})
            </span>
          </span>
        )}
        <Button
          onClick={handleLogout}
          variant="secondary"
          size="sm"
          className="flex items-center space-x-1 px-2 py-1 text-xs"
        >
          <IconWrapper
            icon={FaSignOutAlt as React.ComponentType<any>}
            className="text-sm"
          />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
```

**Styling & Responsiveness Details:**
*   `bg-white shadow-sm p-4 flex items-center justify-between z-30 sticky top-0`: Provides a clean, slightly elevated header that sticks to the top during scroll.
*   **Mobile Hamburger:** The `FaBars` button is correctly marked `md:hidden`, ensuring it only appears on screens smaller than `md` (768px). Its `onClick` directly calls `toggleMobileSidebar`.
*   **Branding:** Displays `/CertiDocs Primary Logo.jpg` and the text "CertiDocs SEESL (client)" using your `text-seeslBlue` brand color.
*   **Notification Bell:** Uses the `FaBell` icon. A red badge with `unreadNotificationsCount` dynamically appears if there are unread notifications. Notification count polling is handled by `useEffect` and `fetchUnreadNotificationsCount`.
*   User information (`user.username`, `user.role`) is displayed, with responsive classes to adjust visibility on different screen sizes.

**Advanced Features & Improvements:**
*   **Accessibility:** Ensure all interactive elements have appropriate `aria-labels` and keyboard navigation support.
*   **Search Bar:** Integrate a global search bar into the header for quick access to documents or users.
*   **User Dropdown:** Expand the user info (`FaUserCircle`) into a dropdown menu for profile settings, account management, etc.

---

## 5. Sidebar Component (`Sidebar.tsx`)

The `Sidebar` component (`src/components/Sidebar.tsx`) provides the main application navigation, adapting its behavior for desktop (collapsible) and mobile (overlay).

**`src/components/Sidebar.tsx` (Actual Code):**

```typescript
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaFileAlt, FaFolder, FaArchive, FaUsers, FaCog, FaUpload, FaBuilding, FaThList, FaClipboardList,
  FaTimes, FaAngleDoubleLeft, FaAngleDoubleRight, FaBell, FaGraduationCap,
  FaShareAlt
} from 'react-icons/fa';
import { IconType } from 'react-icons';
import useAuthStore from '../store/authStore';
import IconWrapper from './IconWrapper';
import useUIStore from '../store/uiStore';

interface NavItem {
  name: string;
  icon: IconType;
  path: string;
}

const getNavItems = (role: string): NavItem[] => {
  const baseItems = [
    { name: 'Dashboard', icon: FaCog, path: '/dashboard' },
    { name: 'My Documents', icon: FaFileAlt, path: '/dashboard/my-documents' },
    { name: 'Shared with Me', icon: FaFolder, path: '/dashboard/shared' },
     { name: 'My Shared Documents', icon: FaShareAlt, path: '/dashboard/my-sent-shares' },
    { name: 'Upload Document', icon: FaUpload, path: '/dashboard/upload' },
    { name: 'Archived Documents', icon: FaArchive, path: '/dashboard/archive' },
    { name: 'Notifications', icon: FaBell, path: '/dashboard/notifications' },
    { name: 'Training', icon: FaGraduationCap, path: '/dashboard/training' },
  ];

  if (role === 'admin' || role === 'it' || role === 'ceo') {
    baseItems.push(
      { name: 'Department Management', icon: FaBuilding, path: '/dashboard/admin/departments' },
      { name: 'Shelf Management', icon: FaThList, path: '/dashboard/admin/shelves' },
      { name: 'Folder Management', icon: FaFolder, path: '/dashboard/admin/folders' },
      { name: 'User Management', icon: FaUsers, path: '/dashboard/admin/users' },
      { name: 'Audit Logs', icon: FaClipboardList, path: '/dashboard/admin/audit-logs' }
    );
  } else if (role === 'manager') {
    baseItems.push(
      { name: 'User Management', icon: FaUsers, path: '/dashboard/admin/users' }
    )
     } else if (role === 'auditor') { // Auditors have read-only access to audit logs
      baseItems.push(
        { name: 'Audit Logs', icon: FaClipboardList, path: '/dashboard/admin/audit-logs' }
      );
  }

  return baseItems;
};


const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const {
    isMobileSidebarOpen, closeMobileSidebar,
    isDesktopSidebarCollapsed, toggleDesktopSidebar
  } = useUIStore();
  const location = useLocation();

  const navItems = user ? getNavItems(user.role) : [];

  // Close mobile sidebar on navigation
  React.useEffect(() => {
    if (isMobileSidebarOpen && window.innerWidth < 768) { // Only close if it's a mobile view
      closeMobileSidebar();
    }
  }, [location.pathname, isMobileSidebarOpen, closeMobileSidebar]); // Added dependencies for useEffect

  return (
    <>
      {/* Mobile Overlay Sidebar (fixed) */}
      <aside
        className={`fixed inset-y-0 left-0 bg-seeslBlue text-white shadow-lg z-50 transition-transform duration-300 ease-in-out
                    ${isMobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
                    md:hidden`} // Hide this on medium+ screens
        aria-label="Mobile Sidebar"
      >
        <div className="flex flex-col h-full w-full p-4"> {/* Inner padding for content */}
          <div className="flex-shrink-0 mb-8 mt-2 flex items-center justify-between">
            <img className="h-10 w-auto" src="/seesl_logo.png" alt="SEESL Logo" />
            <button
              onClick={closeMobileSidebar}
              className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white p-2 rounded-md"
              aria-label="Close sidebar"
            >
              <IconWrapper icon={FaTimes as React.ComponentType<any>} className="text-xl" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center p-2 rounded-md transition duration-200
                      ${location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                        ? 'bg-seeslLightBlue text-white'
                        : 'hover:bg-seeslLightBlue hover:text-white'}`}
                    onClick={closeMobileSidebar}
                  >
                    <IconWrapper icon={item.icon as React.ComponentType<any>} className="mr-3 text-lg flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Desktop Collapsible Sidebar (fixed) */}
      <aside
        className={`hidden md:flex flex-col h-screen bg-seeslBlue text-white shadow-lg z-30 transition-all duration-300 ease-in-out
                    ${isDesktopSidebarCollapsed ? 'w-20' : 'w-64'}`}
        aria-label="Desktop Sidebar"
      >
        <div className="flex flex-col h-full w-full p-4">
          {/* Top section: Logo and App Name */}
            <div className={`flex-shrink-0 mb-8 mt-2 flex flex-col items-center ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}>
            <img
              className={`h-10 w-auto transition-opacity duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}
              src="/seesl_logo.png"
              alt="SEESL Logo"
            />
            <h1 className={`text-xl font-semibold transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-center
                    ${isDesktopSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              CertiDocs SEESL(client)
            </h1>
            </div>

          {/* Navigation links */}

          <nav className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center p-2 rounded-md transition duration-200
                      ${location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                        ? 'bg-seeslLightBlue text-white'
                        : 'hover:bg-seeslLightBlue hover:text-white'}`}
                    title={isDesktopSidebarCollapsed ? item.name : ''}
                  >
                    <IconWrapper icon={item.icon as React.ComponentType<any>} className={`${isDesktopSidebarCollapsed ? 'mx-auto' : 'mr-3'} text-lg flex-shrink-0`} />
                    <span className={`font-medium whitespace-nowrap overflow-hidden ${isDesktopSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-shrink-0 mt-auto pt-4 border-t border-seeslLightBlue/30">
            <div className={`flex flex-col items-center justify-center mb-4 transition-opacity duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
              <img src="/CertiDocs Primary Logo-and-text.jpg" alt="CertiDocs Logo" className="h-8 w-auto mb-2" />
              <p className="text-xs text-gray-300">&copy; {new Date().getFullYear()} CertiDocs</p>
            </div>
            <button
              onClick={toggleDesktopSidebar}
              className="w-full flex items-center justify-center p-2 rounded-md text-white hover:bg-seeslLightBlue focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Toggle sidebar collapse"
            >
              <IconWrapper
                icon={
                  (isDesktopSidebarCollapsed ? FaAngleDoubleRight : FaAngleDoubleLeft) as React.ComponentType<any>
                }
                className="text-xl"
              />
              <span className={`ml-2 transition-opacity duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                {isDesktopSidebarCollapsed ? '' : 'Collapse'}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
```

**Styling & Responsiveness Details:**
*   **Mobile Sidebar (`fixed inset-y-0 left-0 bg-seeslBlue ... z-50`):**
    *   This sidebar acts as an overlay (`z-50`) on small screens (`md:hidden`), sliding in and out (`translate-x-0` / `-translate-x-full`).
    *   It includes a close button (`FaTimes`) at the top right.
    *   The `useEffect` hook ensures the mobile sidebar automatically closes when a navigation link is clicked, providing a smooth mobile user experience.
    *   The `/seesl_logo.png` is displayed in the mobile sidebar's header.
*   **Desktop Sidebar (`hidden md:flex ... z-30`):**
    *   This sidebar is permanently displayed on desktop screens (`hidden md:flex`) and larger, positioned with `z-30`.
    *   It smoothly transitions between `w-64` (expanded) and `w-20` (collapsed), driven by the `isDesktopSidebarCollapsed` state from `uiStore`.
    *   **Animations:** `transition-all duration-300 ease-in-out` ensures smooth visual changes for both width and content visibility during collapse/expand.
    *   **Branding:** Both `/seesl_logo.png` and "CertiDocs SEESL(client)" are present. The title (`h1`) smoothly animates its opacity and width during the collapse action.
    *   **Navigation:** Uses `Link` components from `react-router-dom` for efficient client-side routing. Active navigation links are highlighted using `bg-seeslLightBlue`.
    *   **Sidebar Footer:** Contains a logo (`/CertiDocs Primary Logo-and-text.jpg`), copyright information, and the **desktop `toggleDesktopSidebar` button** (`FaAngleDoubleLeft`/`FaAngleDoubleRight`). This button is correctly positioned *within the sidebar's footer*, as you requested.
    *   **Scrollbars:** `overflow-y-auto` combined with custom CSS classes (`[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`) hides default browser scrollbars while still allowing the navigation list to scroll internally if it's too long.

**Advanced Features & Improvements:**
*   **Nested Navigation:** While `getNavItems` dynamically adds role-specific items, complex nested navigation (multi-level menus) would require a more sophisticated component structure (e.g., recursive menu items, accordions).
*   **Dynamic Sidebar Content:** The `getNavItems` function could fetch the entire navigation structure from an API, allowing for highly configurable and dynamic menus based on user permissions or application settings.
*   **User Profile in Collapsed State:** When the desktop sidebar is collapsed, a small user avatar/icon could be displayed, potentially expanding into a small profile card on hover/click to provide quick access to user details.
*   **Accessibility:** Continuously ensure all dynamic content changes (like elements being hidden/shown) are announced to screen readers appropriately (e.g., using `aria-live` regions where needed).

---

## 6. Login Page (`LoginPage.tsx`)

The login page is the secure entry point for your application. It utilizes common UI components for a consistent user experience.

**`src/pages/LoginPage.tsx` (Illustrative Code, based on common patterns and provided common components):**

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/common/Input'; // Assuming this is present
import Button from '../components/common/Button'; // Assuming this is present

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      // *** IMPORTANT: Replace with your actual API call to your backend authentication endpoint ***
      // Example using fetch API:
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username: email, password }), // Adjust 'username' field name if your API expects something else
      // });
      //
      // const data = await response.json();
      //
      // if (response.ok) {
      //   // Assume your backend returns a JWT token and basic user info
      //   localStorage.setItem('token', data.token); // Store token
      //   // useAuthStore.getState().setAuth(data.user, data.token); // Update global auth state (Zustand example)
      //   navigate('/dashboard'); // Redirect to dashboard on success
      // } else {
      //   setError(data.message || 'Login failed. Please check your credentials.'); // Display backend error message
      // }

      // --- Mock Login for illustration (REMOVE OR REPLACE IN PRODUCTION) ---
      if (email === 'user@example.com' && password === 'password') {
        console.log('Mock login successful');
        // Simulate setting auth state in a global store if you have one (e.g., useAuthStore)
        // useAuthStore.getState().setAuth({ username: email, role: 'employee' }, 'mock-token');
        navigate('/dashboard'); // Redirect on mock success
      } else {
        setError('Invalid email or password (mock data).'); // Mock error message
      }
      // --- End Mock Login ---

    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/CertiDocs Primary Logo.jpg" alt="App Logo" className="h-12 w-auto" />
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Sign in to Your New App
        </h2>

        <form onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Username/Email
            </label>
            <Input
              id="email"
              type="text" // Or 'email' depending on your backend
              placeholder="Enter your username or email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full py-2.5 bg-seeslBlue hover:bg-seeslLightBlue text-white">
            Log In
          </Button>

          <div className="mt-6 text-center text-sm">
            <a href="/forgot-password" className="text-seeslBlue hover:underline">
              Forgot Password?
            </a>
            <p className="mt-2 text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="text-seeslBlue hover:underline">
                Register
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
```

**Common Components (`src/components/common/Input.tsx`, `src/components/common/Button.tsx`):**

The `LoginPage.tsx` relies on generic `Input` and `Button` components (as used elsewhere in your application) for consistent styling and reusability.

```typescript
// src/components/common/Input.tsx (Illustrative - you may have custom props/styling here)
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={`block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm
        focus:outline-none focus:ring-seeslBlue focus:border-seeslBlue
        ${className}`}
      {...props}
    />
  );
};
export default Input;

// src/components/common/Button.tsx (Illustrative - you may have custom props/styling here)
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'; // Example custom prop for different button styles
  size?: 'sm' | 'md' | 'lg';         // Example custom prop for different button sizes
}

const Button: React.FC<ButtonProps> = ({ className, children, variant = 'primary', size = 'md', ...props }) => {
  const baseStyles = "inline-flex items-center justify-center border border-transparent rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantStyles = {
    primary: "text-white bg-seeslBlue hover:bg-seeslLightBlue", // Uses your brand colors
    secondary: "text-seeslBlue bg-white border-seeslBlue hover:bg-gray-50",
  };
  const sizeStyles = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default Button;
```

**Styling & Responsiveness Details:**
*   `flex items-center justify-center min-h-screen`: Centers the login form card both vertically and horizontally on the page.
*   `bg-white p-8 rounded-lg shadow-xl w-full max-w-md`: Styles the login form container as a clean, modern card with consistent padding, rounded corners, shadow, and a maximum width to ensure readability.
*   Uses your specific brand colors (`bg-seeslBlue`, `text-seeslBlue`) for buttons and links, which you would replace with your new app's colors.

**Advanced Features & Improvements:**
*   **Robust Form Validation:** Implement strong client-side validation (e.g., using libraries like Formik/Yup or React Hook Form/Zod) with clear, user-friendly error messages for each input field.
*   **Social Logins:** Integrate third-party authentication options (e.g., Google, GitHub) to offer more login flexibility.
*   **Accessibility:** Continuously ensure proper ARIA attributes, keyboard navigability, and sufficient color contrast for all elements.
*   **"Remember Me" Functionality:** Implement a checkbox to allow users to remain logged in across sessions.

---

## 7. Global Styling & Theming

Your application uses Tailwind CSS for styling, configured in `tailwind.config.js` and applied through `src/index.css`. This is a highly efficient way to manage design tokens and ensure consistency.

**7.1. Adapting Brand Colors:**
Your current application utilizes `seeslBlue` and `seeslLightBlue`. To change to new brand colors for your new application, you must update `tailwind.config.js` (as shown in Section 1.2).
**Important:** After defining your new colors in `tailwind.config.js`, you must search and replace all instances of your old brand color classes (e.g., `bg-seeslBlue`, `text-seeslLightBlue`, `hover:text-seeslLightBlue`) with your newly defined primary/secondary/accent color classes throughout *all* your React components. This ensures a complete brand identity change.

**7.2. Consistent Spacing:**
*   Your `tailwind.config.js` can extend the default Tailwind spacing scale to provide granular control over margins and paddings, ensuring visual consistency across all components. The example in Section 1.2 already includes an extended spacing scale.

---

## 8. Responsiveness Strategy

Your application already employs a robust mobile-first responsive strategy using Tailwind's breakpoint prefixes (`md:`, `sm:`).

*   **Mobile Sidebar:** The mobile sidebar (`Sidebar.tsx`) is implemented as an overlay that appears only on screens smaller than `md` (768px).
*   **Desktop Sidebar:** The desktop sidebar (`Sidebar.tsx`) is permanently displayed and collapsible on `md` screens and larger.
*   **Content Layout:** `Layout.tsx` dynamically adjusts the main content's `margin-left` based on the desktop sidebar's expanded or collapsed state, ensuring optimal use of screen real estate.

---

## 9. Conclusion & Recommendations

This detailed guide, now reflecting your actual codebase, provides a robust blueprint for replicating your UI. The existing implementation leverages strong React component architecture, Zustand for efficient state management, and Tailwind CSS for flexible styling and responsive design.

**Key Recommendations for a New Project:**
1.  **Adopt Component Structure:** Strongly adhere to the clear separation of concerns seen in `Header`, `Sidebar`, `Layout`, and common components. This promotes maintainability and reusability.
2.  **Utilize Zustand:** Implement a similar state management pattern using Zustand for global UI concerns (like sidebar state, notification counts) and user authentication.
3.  **Tailwind Theming:** Leverage `tailwind.config.js` to define your new brand colors and ensure consistency. Remember to actively search and replace the old brand color classes (`seeslBlue`, `seeslLightBlue`) with your new ones in all components for a complete brand change.
4.  **Prioritize Accessibility:** Continue to use `aria-label` attributes for interactive elements and consider adding more comprehensive accessibility features.
5.  **Robust Error Handling:** Ensure all API calls and form submissions have clear, user-friendly error feedback to the user.

By following this guide, you should be able to effectively replicate the desired UI structure and functionality, adapting it to your new brand identity and potentially enhancing it with the suggested advanced features.