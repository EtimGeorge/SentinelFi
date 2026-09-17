/**
 * SentinelFi Tutorial Content Registry
 *
 * Single source of truth for all in-app tours and tutorial pages.
 * To add a new page guide: add an entry to TUTORIAL_CONTENT below.
 *
 * TourStep.targetSelector: a CSS selector for the DOM element to highlight.
 *   - Set to null to show a centered modal step (for intro/outro).
 *
 * Integrity rules enforced by frontend/__tests__/curriculum.test.ts:
 *   - Every non-null targetSelector must resolve to a real `data-tour` hook
 *     found in the codebase (no dead spotlight targets).
 *   - Every section image must be a LOCAL `/guides/...` path (no external hosts).
 */

export interface TourStep {
  id: string;
  title: string;
  content: string;
  targetSelector: string | null; // CSS selector for spotlight, null = centered
  placement?: 'top' | 'bottom' | 'left' | 'right';
  actionLabel?: string; // e.g. "Try it" - navigates to a deep link
  actionHref?: string;
}

export interface DetailedStep {
  number: number;
  title: string;
  description: string;
}

export interface TutorialSection {
  heading: string;
  steps: DetailedStep[];
  images?: string[]; // Optional array of local image paths for this section
}

export interface PageTutorial {
  pageKey: string;       // Matches currentPage prop in AiAssistantWidget
  title: string;
  description: string;
  icon: string;          // Emoji or icon name
  videoUrl?: string;     // Local guide video path (optional, no external hosts)
  tourSteps: TourStep[];
  sections: TutorialSection[];
  aiTutorPrompt: string; // System prompt injected when AI is in "Guide Me" mode
}

// ─── Tutorial Registry ──────────────────────────────────────────────────────────

export const TUTORIAL_CONTENT: Record<string, PageTutorial> = {

  'dashboard': {
    pageKey: 'dashboard', title: 'Executive Dashboard', description: 'The central hub for financial oversight. Monitor real-time KPIs, project health, and variance across your entire portfolio.', icon: '📊',
    tourSteps: [
      {
        id: 'dashboard-welcome', title: 'Welcome to SentinelFi', content: 'This is your Dashboard, the single pane of glass for your entire financial portfolio. Let us walk you through the key sections.', targetSelector: null,
      },
      {
        id: 'dashboard-kpi', title: 'Real-time KPI Cards', content: 'Track your total budget, actual spend, and commitments at a glance. Red values indicate budget overruns that require attention.', targetSelector: '[data-tour="kpi-cards"]', placement: 'bottom',
      },
      {
        id: 'dashboard-ai-toggle', title: 'AI Assistant', content: 'Click this orb to launch the SentinelFi AI. You can ask "Who is over budget?" or toggle "Guide Me" for a live walkthrough.', targetSelector: '[data-tour="ai-assistant-toggle"]', placement: 'left',
      },
      {
        id: 'dashboard-nav', title: 'Navigation', content: 'Use the sidebar to jump between modules. You can collapse it to save space on smaller screens.', targetSelector: '[data-tour="sidebar-nav"]', placement: 'right',
      },
    ], sections: [
      {
        heading: 'Navigating the Overview', steps: [
          { number: 1, title: 'KPI Analysis', description: 'Review the executive cards at the top for a snapshot of fiscal health.' },
          { number: 2, title: 'Drill Down', description: 'Click any project card to view detailed cost center breakdowns.' },
          { number: 3, title: 'Variance Alerts', description: 'Colors indicate risk: Green (<80%), Orange (80-100%), Red (>100%).' },
        ], images: [
          '/guides/dashboard/kpi-cards.webp',
          '/guides/dashboard/drilldown.webp',
        ],
      },
      {
        heading: 'Quick Actions & AI', steps: [
          { number: 4, title: 'AI Querying', description: 'Ask the AI about your projects in plain English.' },
          { number: 5, title: 'Guide Mode', description: 'Enable "Guide Me" in the AI widget for real-time UI coaching.' },
        ], images: [
          '/guides/dashboard/ai-assistant.webp',
        ],
      }
    ], aiTutorPrompt: 'You are the SentinelFi Executive Tutor. Guide the user through the dashboard. Explain the meaning of the KPI variances (positive is under budget, negative is over). Suggest looking at the project list if they want to see specific project performance. If they ask about reports, point them to the Reporting section.',
  },

  'wbs': {
    pageKey: 'wbs', title: 'Work Breakdown Structure', description: 'The foundation of project tracking. Manage hierarchical budgets, cost centers, and unit-of-measure tracking.', icon: '🏗️',
    tourSteps: [
      {
        id: 'wbs-intro', title: 'The WBS Hierarchy', content: 'Organize your project into logical work packages and cost centers.', targetSelector: null,
      },
      {
        id: 'wbs-tree', title: 'Interactive Tree', content: 'Expand and collapse cost centers to see budget roll-ups and actual spend.', targetSelector: '[data-tour="wbs-tree"]', placement: 'right',
      },
      {
        id: 'wbs-log', title: 'Live Expenses', content: 'Log expenses directly against WBS items to maintain real-time variance accuracy.', targetSelector: '[data-tour="wbs-log-btn"]', placement: 'left',
      },
    ], sections: [
      {
        heading: 'Building your WBS', steps: [
          { number: 1, title: 'Define Root', description: 'Start with your high-level project budget items.' },
          { number: 2, title: 'Add Child Items', description: 'Break down work into measurable cost centers.' },
        ], images: [
          '/guides/wbs/tree.webp',
        ],
      },
      {
        heading: 'Budget Control', steps: [
          { number: 3, title: 'Roll-up Logic', description: 'Understand how child budgets roll up into parent categories automatically.' },
          { number: 4, title: 'UOM Tracking', description: 'Assign units of measure to track quantity-based progress.' },
        ], images: [
          '/guides/wbs/rollup.webp',
        ],
      }
    ], aiTutorPrompt: 'You are the SentinelFi Operations Expert. Help the user build a robust WBS. Advise on grouping costs by logical work packages. Explain how the "Roll-up" feature ensures financial integrity. If they mention bulk uploads, guide them to the AI document extraction feature.',
  },

  'budgets': {
    pageKey: 'budgets', title: 'Project Budgets', description: 'Create and manage project budget allocations, unit-of-measure roll-ups, and parent-child cost centers.', icon: '💰',
    tourSteps: [
      {
        id: 'budgets-intro', title: 'Budget Management', content: 'This page is where you define project budget trees and track allocations against actuals.', targetSelector: null,
      },
      {
        id: 'budgets-actions', title: 'List & Actions', content: 'Every row shows your budget tree with expandable cost centers. The action column holds add, edit, and delete controls.', targetSelector: '[data-tour="sidebar-nav"]', placement: 'right',
      },
      {
        id: 'budgets-ai', title: 'AI Guidance', content: 'Open the AI orb and ask "How do I create a child cost center?" for a live walkthrough.', targetSelector: '[data-tour="ai-assistant-toggle"]', placement: 'left',
      },
    ], sections: [
      {
        heading: 'Building Budget Trees', steps: [
          { number: 1, title: 'Add Root', description: 'Create the top-level budget item for a project.' },
          { number: 2, title: 'Add Children', description: 'Attach cost centers with their own budgets and units of measure.' },
        ], images: [
          '/guides/budgets/tree.webp',
        ],
      },
      {
        heading: 'Tracking', steps: [
          { number: 3, title: 'Roll-up', description: 'Parent budgets automatically roll up child values for accurate totals.' },
          { number: 4, title: 'Variance', description: 'Monitor actual spend against plan for every node in the tree.' },
        ], images: [
          '/guides/budgets/variance.webp',
        ],
      }
    ], aiTutorPrompt: 'You are the SentinelFi Budgets Tutor. Help the user structure a project budget as a tree of cost centers. Explain unit-of-measure tracking and roll-up math. If they need to bulk import, point them to AI document extraction.',
  },

  'expenses': {
    pageKey: 'expenses', title: 'New Expense', description: 'Record expenses against projects, WBS items, and cost centers with receipts and AI classification.', icon: '🧾',
    tourSteps: [
      {
        id: 'expenses-intro', title: 'Capture Expenses', content: 'Log any spend in seconds. Assign it to a project, WBS item, and cost center for full traceability.', targetSelector: null,
      },
      {
        id: 'expenses-nav', title: 'Navigate', content: 'Use the sidebar to return to your project or WBS after recording.', targetSelector: '[data-tour="sidebar-nav"]', placement: 'right',
      },
      {
        id: 'expenses-ai', title: 'AI Classification', content: 'The AI can classify expenses and flag duplicates. Try it from the assistant orb.', targetSelector: '[data-tour="ai-assistant-toggle"]', placement: 'left',
      },
    ], sections: [
      {
        heading: 'Recording Spend', steps: [
          { number: 1, title: 'Project & WBS', description: 'Pick the project and WBS node the expense belongs to.' },
          { number: 2, title: 'Amount & UOM', description: 'Enter the amount and quantity with its unit of measure.' },
          { number: 3, title: 'Receipt', description: 'Attach a receipt image or document for the audit trail.' },
        ], images: [
          '/guides/expenses/form.webp',
          '/guides/expenses/receipt.webp',
        ],
      }
    ], aiTutorPrompt: 'You are the SentinelFi Expenses Tutor. Help the user record expenses accurately. Emphasize selecting the correct project, WBS item, and cost center. Explain how receipts and AI classification strengthen the audit trail.',
  },

  'procurement': {
    pageKey: 'procurement', title: 'Procurement Operations', description: 'Create and track procurement categories, units of measure, and inventory positions.', icon: '📦',
    tourSteps: [
      {
        id: 'procurement-intro', title: 'Procurement 101', content: 'Define procurement categories and UOMs here so they are available everywhere in the platform.', targetSelector: null,
      },
      {
        id: 'procurement-nav', title: 'Navigate', content: 'Jump to planning or other modules from this page.', targetSelector: '[data-tour="sidebar-nav"]', placement: 'right',
      },
      {
        id: 'procurement-ai', title: 'AI Help', content: 'Ask the AI to suggest procurement categories based on your project needs.', targetSelector: '[data-tour="ai-assistant-toggle"]', placement: 'left',
      },
    ], sections: [
      {
        heading: 'Set Up Procurement', steps: [
          { number: 1, title: 'Categories', description: 'Group expenses by procurement category for clean roll-ups.' },
          { number: 2, title: 'Units of Measure', description: 'Define UOMs (units, kg, hours) used across expense tracking.' },
        ], images: [
          '/guides/procurement/categories.webp',
          '/guides/procurement/uom.webp',
        ],
      }
    ], aiTutorPrompt: 'You are the SentinelFi Procurement Tutor. Help the user set up procurement categories and units of measure. Explain how clean taxonomy improves reporting and variance analysis.',
  },

  'planning': {
    pageKey: 'planning', title: 'Operations Planning', description: 'Plan fiscal years, temporal configuration, and plan-lock workflows for your financial operations.', icon: '🗓️',
    tourSteps: [
      {
        id: 'planning-intro', title: 'Planning Your Year', content: 'Configure fiscal periods and temporal rules that drive how your budgets roll up over time.', targetSelector: null,
      },
      {
        id: 'planning-nav', title: 'Navigate', content: 'Use the sidebar to move between planning and execution modules.', targetSelector: '[data-tour="sidebar-nav"]', placement: 'right',
      },
      {
        id: 'planning-ai', title: 'AI Tutor', content: 'Ask the AI about plan-lock and temporal configuration for a guided explanation.', targetSelector: '[data-tour="ai-assistant-toggle"]', placement: 'left',
      },
    ], sections: [
      {
        heading: 'Configuration', steps: [
          { number: 1, title: 'Fiscal Year', description: 'Set the fiscal year and period boundaries for planning.' },
          { number: 2, title: 'Temporal Rules', description: 'Define how actuals are attributed across time buckets.' },
          { number: 3, title: 'Plan Lock', description: 'Lock a plan to prevent accidental edits during execution.' },
        ], images: [
          '/guides/planning/config.webp',
        ],
      }
    ], aiTutorPrompt: 'You are the SentinelFi Planning Tutor. Explain fiscal-year planning, temporal configuration, and the plan-lock workflow. Keep examples concrete and SentinelFi-specific.',
  },

  'approvals': {
    pageKey: 'approvals', title: 'Approvals', description: 'Route and approve financial actions with escalation, traceability, and audit trails.', icon: '✅',
    tourSteps: [
      {
        id: 'approvals-intro', title: 'Approval Workflows', content: 'Review, approve, or reject pending financial actions. Every decision is logged for audit.', targetSelector: null,
      },
      {
        id: 'approvals-nav', title: 'Navigate', content: 'Use the sidebar to check related project or expense details.', targetSelector: '[data-tour="sidebar-nav"]', placement: 'right',
      },
      {
        id: 'approvals-ai', title: 'AI Help', content: 'Ask the AI to summarize pending approvals or flag high-risk items.', targetSelector: '[data-tour="ai-assistant-toggle"]', placement: 'left',
      },
    ], sections: [
      {
        heading: 'Approving Actions', steps: [
          { number: 1, title: 'Pending List', description: 'See all actions awaiting your decision with full context.' },
          { number: 2, title: 'Approve / Reject', description: 'Decide with confidence; escalation rules route high-value items.' },
          { number: 3, title: 'Audit Trail', description: 'Every action and decision is immutable and traceable.' },
        ], images: [
          '/guides/approvals/pending.webp',
        ],
      }
    ], aiTutorPrompt: 'You are the SentinelFi Approvals Tutor. Guide the user through review queues, explain escalation thresholds, and stress the importance of the immutable audit trail.',
  },

  'reporting': {
    pageKey: 'reporting', title: 'Financial Reporting', description: 'Generate, download, and schedule financial reports across all your projects.', icon: '📋',
    tourSteps: [
      {
        id: 'reporting-intro', title: 'Reporting Hub', content: 'Generate variance reports and expense audits here. Reports can be downloaded as PDFs or Excel files.', targetSelector: null,
      },
      {
        id: 'reporting-generate', title: 'Generate Reports', content: 'Select a report type and project scope, then click Generate.', targetSelector: '[data-tour="report-generate-btn"]', placement: 'bottom',
      },
      {
        id: 'reporting-nav', title: 'Navigate', content: 'Use the sidebar to locate reports from other modules.', targetSelector: '[data-tour="sidebar-nav"]', placement: 'right',
      },
    ], sections: [
      {
        heading: 'Generating Reports', steps: [
          { number: 1, title: 'Select Type', description: 'Choose between Variance, Audit, or Executive summaries.' },
          { number: 2, title: 'Filters', description: 'Filter by date range, project, or cost center.' },
          { number: 3, title: 'Narrative', description: 'The AI will generate an executive summary along with your data.' },
        ], images: [
          '/guides/reporting/variance.webp',
          '/guides/reporting/executive.webp',
        ],
      }
    ], aiTutorPrompt: 'You are the SentinelFi Analyst. Guide the user through creating reports. Explain the difference between a variance report and an expense audit. Help them understand how to use filters to get the exact data they need.',
  },

  'reporting-archive': {
    pageKey: 'reporting-archive', title: 'Reporting Archive', description: 'Browse previously generated reports, export them again, or schedule recurring deliveries.', icon: '🗂️',
    tourSteps: [
      {
        id: 'archive-intro', title: 'Your Report Archive', content: 'Every report you generate is stored here. Re-download, export, or schedule it.', targetSelector: null,
      },
      {
        id: 'archive-nav', title: 'Navigate', content: 'Use the sidebar to jump back to the reporting hub or other modules.', targetSelector: '[data-tour="sidebar-nav"]', placement: 'right',
      },
      {
        id: 'archive-ai', title: 'AI Help', content: 'Ask the AI to find a specific report or summarize previous findings.', targetSelector: '[data-tour="ai-assistant-toggle"]', placement: 'left',
      },
    ], sections: [
      {
        heading: 'Managing Reports', steps: [
          { number: 1, title: 'Search', description: 'Find reports by project, type, or date range.' },
          { number: 2, title: 'Re-export', description: 'Pull a fresh copy or original artifact anytime.' },
          { number: 3, title: 'Scheduling', description: 'Set recurring generation and delivery to your inbox.' },
        ], images: [
          '/guides/reporting-archive/list.webp',
        ],
      }
    ], aiTutorPrompt: 'You are the SentinelFi Archive Assistant. Help the user find, re-export, and schedule past reports. Explain retention and the difference between regenerating and re-downloading an original.',
  },

  'default': {
    pageKey: 'default', title: 'SentinelFi Platform Guide', description: 'A general guide to using the SentinelFi Financial Intelligence platform.', icon: '🛡️',
    tourSteps: [
      {
        id: 'default-intro', title: 'Welcome', content: 'SentinelFi puts every financial signal in one place. Let us show you around.', targetSelector: null,
      },
      {
        id: 'default-nav', title: 'Explore', content: 'Use the sidebar to reach any module, from the dashboard to reporting.', targetSelector: '[data-tour="sidebar-nav"]', placement: 'right',
      },
    ], sections: [
      {
        heading: 'Getting Started', steps: [
          { number: 1, title: 'Dashboard', description: 'Start at the Dashboard for a portfolio overview.' },
          { number: 2, title: 'WBS', description: 'Define your project cost hierarchies.' },
          { number: 3, title: 'AI Assistance', description: 'Toggle the AI for real-time help and guided tours.' },
        ], images: [
          '/guides/default/dashboard-overview.webp',
        ],
      }
    ], aiTutorPrompt: 'You are the SentinelFi Platform Guide. Help the user navigate the application. Provide clear, step-by-step instructions for any module they ask about.',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTutorial(pageKey: string): PageTutorial {
  return TUTORIAL_CONTENT[pageKey] ?? TUTORIAL_CONTENT['default'];
}

export function getAllTutorialKeys(): string[] {
  return Object.keys(TUTORIAL_CONTENT).filter(k => k !== 'default');
}

/**
 * Returns the list of local guide image paths referenced across all tutorials.
 * Used by the capture agent and the curriculum integrity test.
 */
export function getAllGuideImagePaths(): string[] {
  return Object.values(TUTORIAL_CONTENT).flatMap(t => t.sections.flatMap(s => s.images ?? []));
}
