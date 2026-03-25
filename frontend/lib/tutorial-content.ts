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

export interface DetailedStep {
  number: number;
  title: string;
  description: string;
}

export interface TutorialSection {
  heading: string;
  steps: DetailedStep[];
  images?: string[]; // Optional array of image URLs/paths for this section
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
    title: 'Executive Dashboard',
    description: 'The central hub for financial oversight. Monitor real-time KPIs, project health, and variance across your entire portfolio.',
    icon: '📊',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    tourSteps: [
      {
        id: 'dashboard-welcome',
        title: 'Welcome to SentinelFi',
        content: 'This is your Dashboard — the single pane of glass for your entire financial portfolio. Let us walk you through the key sections.',
        targetSelector: null,
      },
      {
        id: 'dashboard-kpi',
        title: 'Real-time KPIs',
        content: 'Track your total budget, actual spend, and commitments at a glance. Red values indicate budget overruns that require attention.',
        targetSelector: '[data-tour="kpi-cards"]',
        placement: 'bottom',
      },
      {
        id: 'dashboard-ai-toggle',
        title: 'AI Assistant',
        content: 'Click this orb to launch the SentinelFi AI. You can ask "Who is over budget?" or toggle "Guide Me" for a live walkthrough.',
        targetSelector: '[data-tour="ai-assistant-toggle"]',
        placement: 'left',
      },
      {
        id: 'dashboard-nav',
        title: 'Navigation',
        content: 'Use the sidebar to jump between modules. You can collapse it to save space on smaller screens.',
        targetSelector: '[data-tour="sidebar-nav"]',
        placement: 'right',
      },
    ],
    sections: [
      {
        heading: 'Navigating the Overview',
        steps: [
          { number: 1, title: 'KPI Analysis', description: 'Review the executive cards at the top for a snapshot of fiscal health.' },
          { number: 2, title: 'Drill Down', description: 'Click any project card to view detailed cost center breakdowns.' },
          { number: 3, title: 'Variance Alerts', description: 'Colors indicate risk: Green (<80%), Orange (80-100%), Red (>100%).' },
        ],
        images: [
          'https://placehold.co/800x450/1e293b/a5b4fc?text=Dashboard+Overview+Visual+Guide',
          'https://placehold.co/800x450/1e293b/7dd3fc?text=Drill-down+Analytics+Ref'
        ],
      },
      {
        heading: 'Quick Actions & AI',
        steps: [
          { number: 4, title: 'AI Querying', description: 'Ask the AI about your projects in plain English.' },
          { number: 5, title: 'Guide Mode', description: 'Enable "Guide Me" in the AI widget for real-time UI coaching.' },
        ],
        images: [
          'https://placehold.co/800x450/1e293b/6366f1?text=Action+Workflow+Navigation'
        ],
      }
    ],
    aiTutorPrompt: 'You are the SentinelFi Executive Tutor. Guide the user through the dashboard. Explain the meaning of the KPI variances (positive is under budget, negative is over). Suggest looking at the project list if they want to see specific project performance. If they ask about reports, point them to the top-right export icon.',
  },

  'wbs': {
    pageKey: 'wbs',
    title: 'Work Breakdown Structure',
    icon: '🏗️',
    description: 'The foundation of project tracking. Manage hierarchical budgets, cost centers, and unit-of-measure tracking.',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    tourSteps: [
      { id: 'wbs-intro', title: 'The WBS Hierarchy', content: 'Organize your project into logical work packages and cost centers.', targetSelector: null },
      { id: 'wbs-tree', title: 'Interactive Tree', content: 'Expand and collapse cost centers to see budget roll-ups and actual spend.', targetSelector: '[data-tour="wbs-tree"]', placement: 'right' },
      { id: 'wbs-log', title: 'Live Expenses', content: 'Log expenses directly against WBS items to maintain real-time variance accuracy.', targetSelector: '[data-tour="wbs-log-btn"]', placement: 'left' },
    ],
    sections: [
      {
        heading: 'Building your WBS',
        steps: [
          { number: 1, title: 'Define Root', description: 'Start with your high-level project budget items.' },
          { number: 2, title: 'Add Child Items', description: 'Break down work into measurable cost centers.' },
        ],
        images: ['https://placehold.co/800x450/1e293b/a5b4fc?text=WBS+Tree+Structure+Ref'],
      },
      {
        heading: 'Budget Control',
        steps: [
          { number: 3, title: 'Roll-up Logic', description: 'Understand how child budgets roll up into parent categories automatically.' },
          { number: 4, title: 'UOM Tracking', description: 'Assign units of measure to track quantity-based progress.' },
        ],
        images: ['https://placehold.co/800x450/1e293b/7dd3fc?text=Budget+Roll-up+Visual'],
      }
    ],
    aiTutorPrompt: 'You are the SentinelFi Operations Expert. Help the user build a robust WBS. Advise on grouping costs by logical work packages. Explain how the "Roll-up" feature ensures financial integrity. If they mention bulk uploads, guide them to the AI document extraction feature.',
  },

  'reporting': {
    pageKey: 'reporting',
    title: 'Financial Reporting',
    description: 'Generate, download, and schedule financial reports across all your projects.',
    icon: '📋',
    tourSteps: [
      {
        id: 'reporting-intro',
        title: 'Reporting Hub',
        content: 'Generate variance reports and expense audits here. Reports can be downloaded as PDFs or Excel files.',
        targetSelector: null,
      },
      {
        id: 'reporting-generate',
        title: 'Generate Reports',
        content: 'Select a report type and project scope, then click Generate.',
        targetSelector: '[data-tour="report-generate-btn"]',
        placement: 'bottom',
      },
    ],
    sections: [
      {
        heading: 'Generating Reports',
        steps: [
          { number: 1, title: 'Select Type', description: 'Choose between Variance, Audit, or Executive summaries.' },
          { number: 2, title: 'Filters', description: 'Filter by date range, project, or cost center.' },
          { number: 3, title: 'Narrative', description: 'The AI will generate an executive summary along with your data.' },
        ],
        images: ['https://placehold.co/800x450/1e293b/818cf8?text=Reporting+Workflow+Visual'],
      },
    ],
    aiTutorPrompt: 'You are the SentinelFi Analyst. Guide the user through creating reports. Explain the difference between a variance report and an expense audit. Help them understand how to use filters to get the exact data they need.',
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
          { number: 1, title: 'Explore Dashboard', description: 'Start at the Dashboard for a portfolio overview.' },
          { number: 2, title: 'WBS Setup', description: 'Navigate to WBS to define your project hierarchy.' },
          { number: 3, title: 'AI Assistance', description: 'Toggle the AI orb anytime for real-time guidance.' },
        ],
      },
    ],
    aiTutorPrompt: 'You are the SentinelFi Platform Guide. Help the user navigate the application. Provide clear, step-by-step instructions for any module they ask about.',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTutorial(pageKey: string): PageTutorial {
  return TUTORIAL_CONTENT[pageKey] ?? TUTORIAL_CONTENT['default'];
}

export function getAllTutorialKeys(): string[] {
  return Object.keys(TUTORIAL_CONTENT).filter(k => k !== 'default');
}
