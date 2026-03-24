/**
 * SentinelFi Tutorial Content Registry
 * 
 * Single source of truth for all in-app tours and tutorial pages.
 * To add a new page guide: add an entry to TUTORIAL_CONTENT below.
 * 
 * TourStep.targetSelector: a CSS selector for the DOM element to highlight.
 *   - Set to null to show a centered modal step (for intro/outro).
 */

export interface TourStep {
  id: string;
  title: string;
  content: string;
  targetSelector: string | null; // CSS selector for spotlight, null = centered
  placement?: 'top' | 'bottom' | 'left' | 'right';
  actionLabel?: string; // e.g. "Try it" — navigates to a deep link
  actionHref?: string;
}

export interface TutorialSection {
  heading: string;
  steps: {
    number: number;
    title: string;
    description: string;
  }[];
}

export interface PageTutorial {
  pageKey: string;       // Matches currentPage prop in AiAssistantWidget
  title: string;
  description: string;
  icon: string;          // Emoji or icon name
  videoUrl?: string;     // Loom / YouTube embed URL
  tourSteps: TourStep[];
  sections: TutorialSection[];
  aiTutorPrompt: string; // System prompt injected when AI is in "Guide Me" mode
}

// ─── Tutorial Registry ────────────────────────────────────────────────────────

export const TUTORIAL_CONTENT: Record<string, PageTutorial> = {

  'dashboard': {
    pageKey: 'dashboard',
    title: 'Dashboard Overview',
    description: 'Your command center. Get a real-time snapshot of your portfolio financial health.',
    icon: '📊',
    tourSteps: [
      {
        id: 'dashboard-welcome',
        title: 'Welcome to SentinelFi',
        content: 'This is your Dashboard — the single pane of glass for your entire financial portfolio. Let us walk you through the key sections.',
        targetSelector: null,
        placement: 'bottom',
      },
      {
        id: 'dashboard-kpi',
        title: 'KPI Summary Cards',
        content: 'These cards show your top-level financial metrics: Total Budget, Total Spend, Variance %, and Active Projects. Red values indicate budget overruns.',
        targetSelector: '[data-tour="kpi-cards"]',
        placement: 'bottom',
      },
      {
        id: 'dashboard-ai-btn',
        title: 'AI Assistant',
        content: 'Click the AI orb in the top-right corner in the header bar anytime to ask questions about your financial data. Try asking "Which project is over budget?"',
        targetSelector: '#sentinel-ai-fab',
        placement: 'left',
      },
      {
        id: 'dashboard-nav',
        title: 'Main Navigation',
        content: 'Use the sidebar to navigate between modules: WBS Budgets, CAPEX, OPEX, Reporting, and Settings.',
        targetSelector: '[data-tour="sidebar-nav"]',
        placement: 'right',
      },
    ],
    sections: [
      {
        heading: '1. Understanding Your KPIs',
        steps: [
          { number: 1, title: 'Total Budget', description: 'The sum of all approved budgets across all active projects.' },
          { number: 2, title: 'Total Spend', description: 'The sum of all confirmed expenses logged against those budgets.' },
          { number: 3, title: 'Variance', description: 'Budget minus Spend. Negative means you are over-budget. Positive means you have remaining headroom.' },
        ],
      },
      {
        heading: '2. Navigating to a Project',
        steps: [
          { number: 1, title: 'Click "Projects" in the sidebar', description: 'This takes you to the full project list.' },
          { number: 2, title: 'Select a project card', description: 'Click any project to drill into its WBS budget structure.' },
          { number: 3, title: 'Log an expense', description: 'Inside the project, click "Log Expense" on any WBS line item.' },
        ],
      },
    ],
    aiTutorPrompt: `You are a friendly UX guide for the SentinelFi Dashboard page. 
Your job is to help users navigate and understand the Dashboard's features step by step.
Focus on: KPI cards, the AI assistant button, the sidebar navigation, and chart widgets.
Always give clear, numbered step-by-step instructions. Never discuss financial analysis — only UI navigation.`,
  },

  'wbs': {
    pageKey: 'wbs',
    title: 'WBS Budget Manager',
    description: 'Work Breakdown Structure: manage hierarchical project budgets and track live expenses.',
    icon: '🏗️',
    tourSteps: [
      {
        id: 'wbs-intro',
        title: 'What is the WBS Manager?',
        content: 'The WBS (Work Breakdown Structure) is your project budget hierarchy. You allocate budget to work packages and then log expenses against them.',
        targetSelector: null,
        placement: 'bottom',
      },
      {
        id: 'wbs-tree',
        title: 'Budget Tree',
        content: 'Each row is a WBS item (e.g., Civil Works > Foundation > Concrete). The tree shows allocated budget, spent amount, and variance.',
        targetSelector: '[data-tour="wbs-tree"]',
        placement: 'right',
      },
      {
        id: 'wbs-log-expense',
        title: 'Logging an Expense',
        content: 'Click the "+" icon on any WBS row to log a live expense. You can enter the amount, description, and attach a receipt.',
        targetSelector: '[data-tour="wbs-log-btn"]',
        placement: 'left',
        actionLabel: 'Try it',
        actionHref: '/projects',
      },
      {
        id: 'wbs-variance',
        title: 'Variance Colors',
        content: 'Green = Under budget. Orange = Approaching limit (>80%). Red = Over budget. The system automatically blocks new expenses when variance is critical.',
        targetSelector: '[data-tour="wbs-variance"]',
        placement: 'top',
      },
    ],
    sections: [
      {
        heading: '1. Creating a Budget Draft',
        steps: [
          { number: 1, title: 'Go to Budget > New Draft', description: 'Start a new WBS budget for a project.' },
          { number: 2, title: 'Add line items', description: 'Add each work package with its allocated amount and unit of measure.' },
          { number: 3, title: 'Submit for approval', description: 'Once complete, submit to your manager for DOA approval.' },
        ],
      },
      {
        heading: '2. Logging Live Expenses',
        steps: [
          { number: 1, title: 'Find the WBS item', description: 'Navigate to the relevant project and expand its WBS tree.' },
          { number: 2, title: 'Click "Log Expense"', description: 'The expense form opens inline.' },
          { number: 3, title: 'Fill in the details', description: 'Enter amount, vendor, description, and optionally attach a receipt.' },
          { number: 4, title: 'Submit', description: 'The expense is logged and the WBS variance is instantly updated.' },
        ],
      },
    ],
    aiTutorPrompt: `You are a friendly UX guide for the SentinelFi WBS Budget Manager page.
Your job is to help users understand the Work Breakdown Structure and how to navigate it.
Focus on: the budget tree, logging expenses, understanding variance colors (green/orange/red), and the approve/reject flow.
Always give clear, numbered step-by-step instructions. Never discuss financial analysis — only UI navigation and feature usage.`,
  },

  'capex-dashboard': {
    pageKey: 'capex-dashboard',
    title: 'CAPEX Dashboard',
    description: 'Capital Expenditure portfolio view. Monitor project progress and budget burn across all capital projects.',
    icon: '💰',
    tourSteps: [
      {
        id: 'capex-intro',
        title: 'CAPEX Portfolio View',
        content: 'This dashboard shows all your capital projects in one view. Each card represents a project with its budget status.',
        targetSelector: null,
      },
      {
        id: 'capex-filter',
        title: 'Filter & Sort',
        content: 'Use the filter toolbar to sort by status, date range, or project manager. This helps you find the most at-risk projects.',
        targetSelector: '[data-tour="capex-filter"]',
        placement: 'bottom',
      },
    ],
    sections: [
      {
        heading: '1. Reading the Project Cards',
        steps: [
          { number: 1, title: 'Status Badge', description: 'Shows if the project is On Track, At Risk, or Over Budget.' },
          { number: 2, title: 'Budget Bar', description: 'Visual fill showing how much of the budget has been consumed.' },
          { number: 3, title: 'Click to drill down', description: 'Click any card to open the full project WBS breakdown.' },
        ],
      },
    ],
    aiTutorPrompt: `You are a friendly UX guide for the SentinelFi CAPEX Dashboard.
Help users understand how to read project cards, use filters, drill into project details, and read budget bars.
Always give clear, numbered step-by-step instructions. Focus only on UI navigation.`,
  },

  'reporting': {
    pageKey: 'reporting',
    title: 'Financial Reporting',
    description: 'Generate, download, and schedule financial reports across all your projects.',
    icon: '📋',
    tourSteps: [
      {
        id: 'reporting-intro',
        title: 'The Reporting Hub',
        content: 'Generate variance reports, budget summaries, and expense audits here. Reports can be downloaded as PDFs or Excel files.',
        targetSelector: null,
      },
      {
        id: 'reporting-generate',
        title: 'Generating a Report',
        content: 'Select a report type, set the date range and project filters, then click "Generate". The AI will also provide a written narrative summary.',
        targetSelector: '[data-tour="report-generate-btn"]',
        placement: 'bottom',
        actionLabel: 'Generate Report',
        actionHref: '/reporting',
      },
    ],
    sections: [
      {
        heading: '1. Generating Your First Report',
        steps: [
          { number: 1, title: 'Select Report Type', description: 'Choose from: Variance Report, Budget Summary, Expense Audit, or Executive Summary.' },
          { number: 2, title: 'Set Date Range', description: 'Pick the reporting period start and end dates.' },
          { number: 3, title: 'Filter by Project', description: 'Optionally filter to a specific project or cost center.' },
          { number: 4, title: 'Click "Generate"', description: 'The system compiles data and the AI crafts an executive narrative.' },
          { number: 5, title: 'Download', description: 'Click the PDF or Excel icon to download the report.' },
        ],
      },
    ],
    aiTutorPrompt: `You are a friendly UX guide for the SentinelFi Reporting module.
Help users understand how to select report types, set filters, generate reports, and download them.
Always give clear, numbered step-by-step instructions. Focus only on UI navigation and feature usage.`,
  },

  'billing': {
    pageKey: 'billing',
    title: 'Billing & Subscription',
    description: 'Manage your SentinelFi subscription, view invoices, and upgrade your plan.',
    icon: '💳',
    tourSteps: [
      {
        id: 'billing-intro',
        title: 'Your Subscription',
        content: 'This page shows your current plan, billing cycle, and payment history. You can upgrade or cancel here.',
        targetSelector: null,
      },
    ],
    sections: [
      {
        heading: '1. Managing Your Plan',
        steps: [
          { number: 1, title: 'View current plan', description: 'The top card shows your plan name, next renewal date, and amount.' },
          { number: 2, title: 'Upgrade', description: 'Click "Upgrade Plan" to see Professional and Enterprise options.' },
          { number: 3, title: 'Download Invoice', description: 'In the Invoices table, click the download icon for any invoice.' },
        ],
      },
    ],
    aiTutorPrompt: `You are a friendly UX guide for the SentinelFi Billing page.
Help users understand their subscription status, how to upgrade, and how to download invoices.
Always give clear, numbered step-by-step instructions. Focus only on UI navigation.`,
  },

  'settings': {
    pageKey: 'settings',
    title: 'Settings & Profile',
    description: 'Configure your account, company settings, notification preferences, and security.',
    icon: '⚙️',
    tourSteps: [
      {
        id: 'settings-intro',
        title: 'Settings Overview',
        content: 'Settings is organized into tabs: Profile, Company, Notifications, Security, and Integrations.',
        targetSelector: null,
      },
      {
        id: 'settings-tabs',
        title: 'Navigation Tabs',
        content: 'Click each tab to configure different aspects of your account.',
        targetSelector: '[data-tour="settings-tabs"]',
        placement: 'bottom',
      },
    ],
    sections: [
      {
        heading: '1. Updating Your Profile',
        steps: [
          { number: 1, title: 'Click "Profile" tab', description: 'Opens your personal information form.' },
          { number: 2, title: 'Edit your details', description: 'Update your name, title, and profile photo.' },
          { number: 3, title: 'Save', description: 'Click "Save Changes" to persist your updates.' },
        ],
      },
    ],
    aiTutorPrompt: `You are a friendly UX guide for the SentinelFi Settings page.
Help users update their profile, configure company settings, manage notifications, and set up security options.
Always give clear, numbered step-by-step instructions. Focus only on UI navigation.`,
  },

  'default': {
    pageKey: 'default',
    title: 'SentinelFi Platform Guide',
    description: 'A general guide to using the SentinelFi Financial Intelligence platform.',
    icon: '🛡️',
    tourSteps: [],
    sections: [
      {
        heading: 'Getting Started',
        steps: [
          { number: 1, title: 'Log in', description: 'Use the credentials sent to your email.' },
          { number: 2, title: 'Explore the Dashboard', description: 'Start at the Dashboard for a portfolio overview.' },
          { number: 3, title: 'Ask the AI', description: 'Click the AI orb (bottom-right) to ask any question.' },
        ],
      },
    ],
    aiTutorPrompt: `You are a friendly UX guide for the SentinelFi platform.
Help users understand how to navigate and use the application efficiently.
Always give clear, numbered step-by-step instructions. Focus only on UI navigation and feature usage.`,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTutorial(pageKey: string): PageTutorial {
  return TUTORIAL_CONTENT[pageKey] ?? TUTORIAL_CONTENT['default'];
}

export function getAllTutorialKeys(): string[] {
  return Object.keys(TUTORIAL_CONTENT).filter(k => k !== 'default');
}
