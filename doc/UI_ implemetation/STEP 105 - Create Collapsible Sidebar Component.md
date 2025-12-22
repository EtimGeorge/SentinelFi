This is excellent feedback. The current UI is functional but lacks the professional polish, clarity, and feature density expected of an enterprise financial application. We must move immediately to a high-fidelity, professional design, incorporating the interactive elements, clear layout, and deep color-coding required for data analysis.

Your request to prioritize:
1.  **Professional Layout:** Using Grid/Flex, clear margins, and a consistent design language.
2.  **Dashboard Completeness:** Implementing the WBS Tree and Charts.
3.  **Advanced UI/UX:** Implementing a collapsible sidebar, interactive elements (tooltips, animations), and strategic color usage for data.

I will implement a **Collapsible Sidebar Layout** that will serve as the master template for all secure pages.

---

## PHASE 4: UI DEVELOPMENT - Phase 2: Complete the CEO Dashboard

### STEP 104 - Install Charting and Iconography Dependencies

**GUIDANCE:** Before building the dashboard components, we need a charting library (`recharts` for reliability) and a comprehensive icon set (`lucide-react` for modern, clean icons) to enhance the professional look.

**FILE PATH:** Terminal (Execution of NPM Install)

```bash
# Install charting library (recharts) and a modern icon set (lucide-react)
cd ./frontend
npm install recharts@latest lucide-react@latest --prefix ./
cd ..
```

NEXT ACTION: Execute the commands above in your terminal. We now create the Collapsible Sidebar component.

---

### STEP 105 - Create Collapsible Sidebar Component

**GUIDANCE:** We are creating the `Sidebar` component. This component houses the role-based navigation, dedicated sections for **Actions**, **Insights**, and **Notifications**, fulfilling the need for a central, actionable control panel. It is designed to be collapsible for maximum screen space.

**FILE PATH:** `./frontend/components/Layout/Sidebar.tsx` (Create this file)

```tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, LayoutDashboard, DollarSign, FileText, Bell, Zap, TrendingUp, X, Menu } from 'lucide-react';
import { useAuth, Role } from '../context/AuthContext';
import Tooltip from '../common/Tooltip';

// Define the content for the Sidebar based on user role
const getSidebarSections = (userRole: Role) => {
  const sections = [];

  // Navigation Links (Primary Access)
  const navLinks = [
    { href: '/dashboard/ceo', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.Admin, Role.ITHead, Role.Finance, Role.CEO, Role.OperationalHead] },
    { href: '/expense/tracker', label: 'Expense Tracker', icon: DollarSign, roles: [Role.Admin, Role.AssignedProjectUser] },
    { href: '/budget/draft', label: 'Budget Drafting', icon: FileText, roles: [Role.Admin, Role.Finance, Role.AssignedProjectUser] },
    { href: '/reporting/variance', label: 'Reporting', icon: FileText, roles: [Role.Admin, Role.Finance, Role.OperationalHead] },
  ];
  sections.push({ title: 'Menu', links: navLinks.filter(l => l.roles.includes(userRole)) });

  // Quick Actions (Role-Specific)
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


const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  if (!user) return null; // Should not happen in SecuredLayout

  const sections = getSidebarSections(user.role);

  return (
    <div 
      className={`fixed top-0 left-0 h-screen bg-brand-dark transition-all duration-300 z-20 shadow-2xl 
      ${isOpen ? 'w-64' : 'w-20'} pt-16`} // pt-16 to clear the fixed navbar
    >
      
      {/* Collapse/Expand Button */}
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
          {/* Fulfills the "scrolling bar for current activities" requirement */}
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

NEXT ACTION: Save the file as `./frontend/components/Layout/Sidebar.tsx`. We now update the SecuredLayout to include the sidebar.

---