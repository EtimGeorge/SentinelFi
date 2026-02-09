Implementation Plan
7 minutes ago

Review
Executive Oversight Portal: Advanced Project-Centric CEO Dashboard
This plan has been refined to focus on Granular Project Oversight and Operational Management. The goal is a "Command Center" where the CEO can context-switch between projects and the core organization (Operations), while maintaining a direct line of feedback via annotations.

User Review Required
IMPORTANT

Project Context Switching: The dashboard will now default to an "All Projects (Consolidated)" view. A global dropdown will allow you to select a specific project. When a project is selected, all KPIs, burn rates, and charts will shift to that project's specific apartment.

IMPORTANT

CEO Annotation System: I am proposing a new Annotation Engine. You will be able to click on any WBS node or Expense line to add a "CEO Note." These notes will be visible to Project Managers/Finance heads in their respective views, creating a direct executive feedback loop.

TIP

Management Overrides: Shortcuts will be added to the dashboard header to jump directly into Project Management and Operational Budget Setup, allowing you to not just observe, but also manage.

Proposed Changes
[Component] Backend Analytics & Feedback Engine
[NEW] 
annotation.entity.ts
A new table to store comments from the CEO.
Fields: 
id
, target_type (WBS/Expense), target_id, comment, user_id (CEO), created_at.
[MODIFY] 
dashboard.service.ts
Update getExecutiveAnalytics to accept an optional projectId.
If projectId is provided, filter all aggregates (
WBS
, 
Expenses
, LPOs) by that project.
Implement addAnnotation and getAnnotations for the feedback loop.
[Component] Frontend Executive Portal
[MODIFY] 
ceo.tsx
Top Bar Upgrade:
Add ProjectSelector (Fetched from /projects).
Add Duality Toggle (Switch between "Project Focused" and "Operational Focused" metrics).
Add Management Shortcuts: Icons leading to /projects/manage and /operational-budgets/manage.
WBS Analysis Upgrade:
Injected an "Annotation Badge" next to WBS nodes that have CEO comments.
Hover/Click to open a comment thread.
[MODIFY] 
WBSHierarchyTree.tsx
Update to support annotation interactions.
Verification Plan
Automated Tests
Context Filtering: Verify that filtering by projectId in the dashboard API reduces the "Total Budgeted" sum to only that project's portion.
Annotation Linkage: Verify that submitting a note on WBS ID X correctly appears in the getAnnotations list for that ID.
Manual Verification
Verify the Project Dropdown successfully cascades data changes across all charts.
Confirm that the Management Shortcuts correctly route to the deep-management pages.
Test the Annotation Overlay by adding a note and ensuring it persists after a page refresh.