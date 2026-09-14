export interface DocMeta {
  slug: string;
  title: string;
  category: string;
  description: string;
  filePath: string; // relative to ../docs from frontend cwd
}

export const DOCS: DocMeta[] = [
  {
    slug: 'product-manual', title: 'Product Manual', category: 'Product', description:
      'Self-contained guide to every SentinelFi capability, workflow, and role, from onboarding to enterprise deployment.', filePath: 'product/PRODUCT_DOCUMENTATION.md',
  },
  {
    slug: '00-quick-start', title: 'Quick Start: Your First 5 Steps', category: 'Getting Started', description: 'Sign up, first login, and your first project.', filePath: 'product/user-guides/00-QUICK-START.md',
  },
  {
    slug: '01-dashboard-home', title: 'The Home Dashboard', category: 'Dashboards', description: 'Your daily command centre and headline metrics.', filePath: 'product/user-guides/01-DASHBOARD-HOME.md',
  },
  {
    slug: '02-ceo-dashboard', title: 'CEO High-Fidelity Dashboard', category: 'Dashboards', description: 'Executive-level portfolio and financial overview.', filePath: 'product/user-guides/02-CEO-DASHBOARD.md',
  },
  {
    slug: '03-financial-intelligence', title: 'Financial Intelligence Hub', category: 'Financial Control', description: 'CAPEX/OPEX intelligence, variance, and analysis.', filePath: 'product/user-guides/03-FINANCIAL-INTELLIGENCE.md',
  },
  {
    slug: '04-governance-hub', title: 'Governance Hub and Approvals', category: 'Financial Control', description: 'Multi-level approval workflows and delegation of authority.', filePath: 'product/user-guides/04-GOVERNANCE-HUB.md',
  },
  {
    slug: '05-audit-trail', title: 'The Audit Trail', category: 'Financial Control', description: 'Reviewing every recorded action and change.', filePath: 'product/user-guides/05-AUDIT-TRAIL.md',
  },
  {
    slug: '06-project-portfolio', title: 'Project Portfolio Management', category: 'Projects', description: 'Creating, browsing, and tracking projects.', filePath: 'product/user-guides/06-PROJECT-PORTFOLIO.md',
  },
  {
    slug: '07-wbs-designer', title: 'The WBS Designer', category: 'Projects', description: 'Building work breakdown structures and budget lines.', filePath: 'product/user-guides/07-WBS-DESIGNER.md',
  },
  {
    slug: '08-project-budgeting', title: 'Project Budgeting', category: 'Projects', description: 'Allocating and approving project budgets.', filePath: 'product/user-guides/08-PROJECT-BUDGETING.md',
  },
  {
    slug: '09-logging-expenses', title: 'Logging Expenses', category: 'Projects', description: 'Recording, categorising, and submitting expenses.', filePath: 'product/user-guides/09-LOGGING-EXPENSES.md',
  },
  {
    slug: '10-p2p-procurement', title: 'P2P Procurement Lifecycle', category: 'Operations', description: 'Requisitions, purchase orders, and invoices.', filePath: 'product/user-guides/10-P2P-PROCUREMENT.md',
  },
  {
    slug: '11-opex-planning', title: 'OPEX Planning and Departmental Budgets', category: 'Operations', description: 'Departmental operating expense planning.', filePath: 'product/user-guides/11-OPEX-PLANNING.md',
  },
  {
    slug: '12-payroll-desk', title: 'The Payroll Desk', category: 'Operations', description: 'Running payroll cycles and managing staff payments.', filePath: 'product/user-guides/12-PAYROLL-DESK.md',
  },
  {
    slug: '13-fiscal-setup', title: 'Fiscal Setup and Categories', category: 'Operations', description: 'Fiscal years, periods, and expense categories.', filePath: 'product/user-guides/13-FISCAL-SETUP.md',
  },
  {
    slug: '14-reporting-hub', title: 'Reporting and AI Hub', category: 'Reporting', description: 'Generating reports and AI-assisted narratives.', filePath: 'product/user-guides/14-REPORTING-HUB.md',
  },
  {
    slug: '15-document-archive', title: 'Document Archive and Retrieval', category: 'Reporting', description: 'Uploading, storing, and retrieving documents.', filePath: 'product/user-guides/15-DOCUMENT-ARCHIVE.md',
  },
  {
    slug: '16-superadmin-controls', title: 'SuperAdmin Controls', category: 'Administration', description: 'Platform-level tenant and system management.', filePath: 'product/user-guides/16-SUPERADMIN-CONTROLS.md',
  },
  {
    slug: '17-ai-communication', title: 'AI Communication and Messaging', category: 'Administration', description: 'The AI assistant, alerts, and team messaging.', filePath: 'product/user-guides/17-AI-COMMUNICATION.md',
  },
];

export const DOC_CATEGORIES = Array.from(
  new Set(DOCS.map((d) => d.category))
);
