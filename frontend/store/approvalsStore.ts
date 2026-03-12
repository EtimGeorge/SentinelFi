import { create } from 'zustand';

export interface ApprovalItem {
  id: string;
  document_type: 'WBS_BUDGET' | 'REQUISITION' | 'PAYROLL_RUN' | 'EXPENSE_OVERRUN';
  description: string;
  amount: number;
  submitted_by: string;
  submitted_at: string;
  // Project Context
  project_id?: string;
  project_name?: string;
  project_currency?: string;
  category_id?: string;
  category_name?: string;
  // Operational Context (OPEX)
  cost_center_id?: string;
  cost_center_name?: string;
  gl_account_name?: string;
  req_number?: string;
  // Technical Audit Fields
  quantity?: number;
  uom?: string;
  unit_cost?: number;
  duration?: number;
  custom_metadata?: any;
  wbs_code?: string;
}

interface ApprovalsState {
  pendingApprovals: ApprovalItem[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setPendingApprovals: (items: ApprovalItem[]) => void;
  addPendingApproval: (item: ApprovalItem) => void;
  removePendingApproval: (id: string) => void;
  fetchPendingCount: () => number;
}

export const useApprovalsStore = create<ApprovalsState>((set, get) => ({
  pendingApprovals: [],
  isLoading: false,
  error: null,

  setPendingApprovals: (items) => set({ pendingApprovals: items }),
  
  addPendingApproval: (item) => set((state) => ({
    pendingApprovals: [item, ...state.pendingApprovals]
  })),

  removePendingApproval: (id) => set((state) => ({
    pendingApprovals: state.pendingApprovals.filter(a => a.id !== id)
  })),

  fetchPendingCount: () => get().pendingApprovals.length,
}));
