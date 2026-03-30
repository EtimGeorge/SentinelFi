# 🌳 07: The WBS Designer

The **Work Breakdown Structure (WBS)** is where you turn a flat "Project Budget" into a multi-layered, hierarchical plan.

---

## 🛠️ Hierarchical Architecture

### 1. Root vs. Child Nodes
- **Root Level**: Usually matching the project's broad phases (e.g., *"Site Clearing"*, *"Structural Works"*, *"Finishing"*).
- **Child Nodes**: Granular sub-tasks (e.g., *"Civil Works"* -> *"Reinforcement Bars"*).

### 2. Recursive Rollups (Automatic)
- **The Feature**: You do NOT need to manually sum up the budget of a parent category.
- **The Behavior**: If you add a sub-category with a budget of `$50,000`, the parent's "Total Allocated" will automatically increase by `$50,000`.

---

## ✅ The Process: Adding Categories

1. **Path**: Click **"Project Financials -> WBS Designer"**.
2. **Select Project**: Choose your project from the top dropdown.
3. **Action**: Click the `+` icon on any row to open the **"Add Child Category"** modal.
4. **Fields**:
   - **Name**: e.g., *"Plumbing Fixtures"*.
   - **Target Budget**: Enter the amount for this specific task.
   - **Cost Center ID**: (Optional) For mapping to external ERP systems.
5. **Click "Save Category"**.

---

## 🧭 Interpreting the Grid

- **Commitment Column**: Shows the total value of approved **Purchase Orders (LPOs)** against this category.
- **Actual Column**: Shows the total amount of successfully **Logged Expenses**.
- **Variance Column**: Displays the difference. If the number is in **Red**, you have spent more than you budgeted for this specific task.

---

## 🛡️ Pro-Tips
- **Do Not Deep-Nest**: Try to keep your WBS hierarchy to 3 or 4 levels maximum for optimal readability.
- **Drag-and-Drop**: (Coming Soon) Use the drag-handle on the left to re-order categories.
- **Bulk Import**: Use the **"Import CSV"** button to load a standard WBS template from your previous projects.

---
*Next: [08: Project Budgeting](file:///c:/temp/SentinelFi/docs/user-guides/08-PROJECT-BUDGETING.md)*
