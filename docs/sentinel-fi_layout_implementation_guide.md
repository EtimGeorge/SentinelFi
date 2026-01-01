# SentinelFi UI Layout Implementation Guide (Revised)

This document outlines the step-by-step process for refactoring the SentinelFi application's primary user interface. We will first fix critical architectural flaws before replacing the existing layout with a new, robust structure adapted to SentinelFi's brand identity, dark theme, and functional requirements.

This guide serves as our checklist.

---

### **Phase -1: Critical Bug Fixes & Architectural Refactoring**

This phase is **mandatory** to create a stable foundation for the new UI.

-   [ ] **Task -1.1: Unify State Management.**
    -   Modify `frontend/components/Layout/SecuredLayout.tsx` to remove its local `useState` for sidebar control.
    -   Update `SecuredLayout.tsx` to use the global `uiStore` (Zustand) as the single source of truth for sidebar state, resolving the state conflict with `Sidebar.tsx`.
-   [ ] **Task -1.2: Standardize Icon Library.**
    -   Install `react-icons` to ensure all components have access to a consistent set of icons.
    -   Modify `frontend/components/Layout/LayoutNav.tsx` and `frontend/components/Layout/Sidebar.tsx` to use `react-icons`, resolving the broken dependency and inconsistency issues.
-   [ ] **Task -1.3: Decouple Workspaces.**
    -   Identify type definitions being improperly imported from `backend/` into `frontend/components/Layout/LayoutNav.tsx`.
    -   Create new, corresponding type files in the `shared/types/` directory.
    -   Modify `LayoutNav.tsx` to import these types from the `shared/` workspace, eliminating the tight coupling.
-   [ ] **Task -1.4: Centralize Navigation Logic.**
    -   Extract the hardcoded `getNavItems` function from `frontend/components/Layout/Sidebar.tsx`.
    -   Create a new file, `frontend/lib/navigationMap.ts`, to house this role-based navigation logic.
    -   Refactor `Sidebar.tsx` to import its navigation structure from `navigationMap.ts`.

---

### **Phase 0: Foundations & Configuration**

This phase prepares the project for the new UI components.

-   [ ] **Task 0.1: Configure Tailwind CSS.** Update `frontend/tailwind.config.js` to include the full color palette from `DESIGN_SYSTEM.md` and a standardized spacing scale.

---

### **Phase 1: Core Component Implementation**

This phase involves creating the new state management store and replacing the code within the existing layout components.

-   [ ] **Task 1.1: Rebuild `Sidebar.tsx`.** The styling will be updated to:
    -   Use `bg-brand-dark` as its background.
    -   Properly display the SentinelFi logo.
-   [ ] **Task 1.2: Rebuild `Header.tsx`.** The styling of `LayoutNav.tsx` will be updated to:
    -   Use `bg-gray-800` as its background.
    -   Implement the notification bell and badge.
    -   Display user data from `AuthContext` in a new user dropdown menu.
-   [ ] **Task 1.3: Update `SecuredLayout.tsx`.** The styling will be updated to:
    -   Set the main content area's background to `bg-brand-dark`.

---

### **Phase 2: Integration & Verification**

This phase ensures the new layout is correctly integrated and functional across the application.

-   [ ] **Task 2.1: Verify Authentication Flow.** Thoroughly test the login and logout process.
-   [ ] **Task 2.2: Test Responsiveness.** Test the application on various screen sizes.

---

### **Phase 3: Refinement & Styling Polish**

This phase focuses on applying the design system's principles for a polished and professional look.

-   [ ] **Task 3.1: Apply Consistent Page Styling.** Refactor a sample page (e.g., `frontend/pages/dashboard/home.tsx`) to use the new "Card" component styling and standardized spacing.
-   [ ] **Task 3.2: Final Review.** Conduct a final review of the implemented layout against this guide and `DESIGN_SYSTEM.md`.

---