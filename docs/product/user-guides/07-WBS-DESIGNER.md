# The WBS Designer

The **Work Breakdown Structure (WBS)** is where you turn a flat project budget into a multi-layered, hierarchical plan.

---

## Hierarchical Architecture

### Root vs Child Nodes
- **Root Level** - matches the project's broad phases (e.g., "Site Clearing", "Structural Works", "Finishing").
- **Child Nodes** - granular sub-tasks (e.g., "Civil Works" > "Reinforcement Bars").

### Recursive Rollups (Automatic)
You do **not** need to manually sum up the budget of a parent category. If you add a sub-category with a budget of `$50,000`, the parent's "Total Allocated" increases by `$50,000` automatically.

---

## Adding Categories

1. **Path**: click **Project Financials > WBS Designer**.
2. **Select Project** - choose from the top dropdown.
3. Click the **+** icon on any row to open the "Add Child Category" modal.
4. **Fields**:
   - **Name** - e.g., `Structural Steel Reinforcement`
   - **Target Budget** - e.g., `450000`
   - **Cost Center ID** - e.g., `CC-LAG-STR-001`
5. Click **Save Category**.

---

## Interpreting the Grid

- **Commitment Column** - total value of approved Purchase Orders against this category.
- **Actual Column** - total amount of successfully logged expenses.
- **Variance Column** - the difference. Red indicates spend exceeded the budgeted amount for this category.

---

## Tips
- **Depth Limit** - keep WBS hierarchy to 3-4 levels maximum for readability.
- **Bulk Import** - use the **Import CSV** button to load a standard WBS template from previous projects.

---

*Next: [08: Project Budgeting](08-PROJECT-BUDGETING.md)*
