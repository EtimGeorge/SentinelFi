import React, { useState, useEffect, useMemo } from 'react';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import { RollupData } from '../../components/dashboard/WBSHierarchyTree'; // Keep RollupData as it's used
import { formatCurrency } from '../../lib/utils';
import { buildWBSHierarchy, flattenWBSForDisplay } from '../../lib/wbsUtils';
import { Wifi, Calendar, Zap, AlertTriangle, ArrowRight } from 'lucide-react';
import useToast from '../../store/toastStore'; // NEW: Import useToast
import Link from 'next/link'; // NEW: Import Link

// Defines the shape of data for the expense entry (matching CreateLiveExpenseDto)
interface ExpenseEntryForm {
  wbs_id: string;
  item_description: string;
  actual_unit_cost: number;
  actual_quantity: number;
  commitment_lpo_amount: number;
  actual_paid_amount: number;
  document_reference: string;
  notes_justification: string;
}

// NEW: Interface for a recent expense item
interface RecentExpense {
  id: string;
  wbs_code: string;
  item_description: string;
  actual_paid_amount: number;
  expense_date: string;
  // Add other fields as needed
}

const initialFormState: ExpenseEntryForm = {
  wbs_id: '',
  item_description: '',
  actual_unit_cost: 0,
  actual_quantity: 1,
  commitment_lpo_amount: 0,
  actual_paid_amount: 0,
  document_reference: '',
  notes_justification: '',
};

const LiveExpenseTracker: React.FC = () => {
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast); // NEW: Get addToast
  const [formData, setFormData] = useState<ExpenseEntryForm>(initialFormState);
  const [loading, setLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null); // Removed, using toast
  // const [success, setSuccess] = useState<string | null>(null); // Removed, using toast
  const [wbsData, setWbsData] = useState<RollupData[]>([]);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().substring(0, 10));
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]); // NEW: State for recent expenses
  const [loadingRecent, setLoadingRecent] = useState(true); // NEW: Loading for recent expenses


  // Fetch ALL WBS data for hierarchical dropdown
  useEffect(() => {
    const fetchWBSOptions = async () => {
      try {
        const response = await api.get<RollupData[]>('/wbs/budget/rollup');
        setWbsData(response.data);
      } catch (e: any) {
        console.error("Failed to fetch WBS options:", e);
        addToast({ title: 'Error', description: `Failed to fetch WBS options: ${e.message || 'Unknown error'}`, type: 'error' });
      }
    };
    fetchWBSOptions();
  }, [api, addToast]);

  // NEW: Fetch recent expenses
  useEffect(() => {
    const fetchRecentExpenses = async () => {
      setLoadingRecent(true);
      try {
        // TODO: Replace with actual API call to /wbs/expenses/recent (needs backend endpoint)
        const mockRecentExpenses: RecentExpense[] = [
          { id: 'exp1', wbs_code: '1.1.1', item_description: 'Structural CAD License Renewal', actual_paid_amount: 2499, expense_date: '2026-01-01' },
          { id: 'exp2', wbs_code: '3.0', item_description: 'Portland Cement - Batch 41', actual_paid_amount: 12500, expense_date: '2026-01-01' },
          { id: 'exp3', wbs_code: '2.2', item_description: 'Consulting Fees - Phase Alpha', actual_paid_amount: 8000, expense_date: '2026-01-01' },
        ];
        // await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
        setRecentExpenses(mockRecentExpenses);
      } catch (e: any) {
        console.error("Failed to fetch recent expenses:", e);
        addToast({ title: 'Error', description: `Failed to fetch recent expenses: ${e.message || 'Unknown error'}`, type: 'error' });
      } finally {
        setLoadingRecent(false);
      }
    };
    fetchRecentExpenses();
  }, [api, addToast]);
  
  // Memoize the indented WBS list for the dropdown
  const wbsOptions = useMemo(() => {
    const hierarchy = buildWBSHierarchy(wbsData);
    return flattenWBSForDisplay(hierarchy, 0); 
  }, [wbsData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['actual_unit_cost', 'actual_quantity', 'commitment_lpo_amount', 'actual_paid_amount'].includes(name) 
              ? (value === '' ? 0 : Number(value)) 
              : value,
    }));
  };
  
  const totalExpenseValue = (formData.actual_unit_cost || 0) * (formData.actual_quantity || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // setError(null); // Removed, using toast
    // setSuccess(null); // Removed, using toast
    
    // Final DTO preparation
    const dataToSend = {
      ...formData,
      expense_date: transactionDate, // Include the transaction date
      actual_paid_amount: formData.actual_paid_amount || 0,
      actual_unit_cost: formData.actual_unit_cost || 0,
      actual_quantity: formData.actual_quantity || 0,
    };

    try {
      // API Call: Direct write operation for the Assigned Project User
      await api.post('/wbs/expense/live-entry', dataToSend); 
      addToast({ title: 'Expense Logged', description: `Expense for WBS ${formData.wbs_id} successfully logged.`, type: 'success' });
      setFormData(initialFormState);
      // After logging, refresh recent expenses
      // TODO: Implement a better way to refresh recent expenses (e.g., refetch or add to state)
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      addToast({ title: 'Expense Failed', description: `Expense Entry Failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // NEW: Dynamic WBS allocation feedback
  const wbsAllocationFeedback = useMemo(() => {
    if (formData.wbs_id) {
      const selectedWbs = wbsData.find(wbs => wbs.wbs_id === formData.wbs_id);
      if (selectedWbs) {
        const budgetedAmount = Number(selectedWbs.total_cost_budgeted);
        const alreadySpent = Number(selectedWbs.total_paid_rollup); // Total spent so far
        const remainingBudget = budgetedAmount - alreadySpent;

        if (totalExpenseValue > remainingBudget) {
          return {
            text: `Potential Overrun: ${formatCurrency(totalExpenseValue - remainingBudget)} over remaining budget (${formatCurrency(remainingBudget)}) for ${selectedWbs.wbs_code}.`,
            color: 'text-alert-critical',
            icon: <AlertTriangle className="w-3 h-3 mr-1" />,
          };
        } else {
          return {
            text: `Within Budget: ${formatCurrency(remainingBudget - totalExpenseValue)} remaining for ${selectedWbs.wbs_code}.`,
            color: 'text-alert-positive',
            icon: <CheckCircle className="w-3 h-3 mr-1" />, // Assuming CheckCircle is imported from lucide-react
          };
        }
      }
    }
    return {
      text: 'Requires WBS allocation check.',
      color: 'text-gray-500',
      icon: <AlertTriangle className="w-3 h-3 mr-1" />,
    };
  }, [formData.wbs_id, wbsData, totalExpenseValue]);


  return (
    <>
      <Head><title>Live Expense Tracker | SentinelFi</title></Head>
      <PageContainer
        title="Quick-Entry Terminal"
        subtitle="High-speed expense logging for real-time WBS allocation."
        headerContent={
          <div className="text-sm font-semibold text-alert-positive flex items-center">
            <Wifi className="w-4 h-4 mr-1" /> SYSTEM LIVE
          </div>
        }
      >
        {/* FORM AND RECENTS LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Span 2): Quick Entry Terminal */}
          <div className="lg:col-span-2">
            <Card title="New Expense Entry" borderTopColor="primary"
              headerContent={<Zap className="w-6 h-6 mr-3 text-alert-critical" />}
              className="border-t-8 border-brand-primary/50" // Maintain the distinct border for this primary entry form
            >
              <p className="text-sm text-gray-400 mb-4">ID: #EXP-{Math.floor(Math.random() * 9000) + 1000}-01</p>

              {/* Success and Error messages are now handled by toast notifications */}
              {/* {success && <div className="p-3 mb-4 text-sm text-alert-positive bg-green-900 rounded-lg border border-alert-positive/50">{success}</div>}
              {error && <div className="p-3 mb-4 text-sm text-alert-critical bg-red-900 rounded-lg border border-alert-critical/50">{error}</div>} */}

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* WBS CATEGORY & DATE */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="wbs_id">WBS Category</label>
                        <select name="wbs_id" id="wbs_id" value={formData.wbs_id} onChange={handleChange} required
                            className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white font-medium focus:border-alert-critical focus:ring-alert-critical/50 appearance-none">
                            <option value="" className="bg-gray-800 text-gray-400">-- Select a WBS Line Item --</option>
                            {wbsOptions.map(wbs => (
                            <option key={wbs.id} value={wbs.id} className="bg-gray-800 text-white">
                                {wbs.label} {/* Indented, hierarchical label */}
                            </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="transactionDate">Transaction Date</label>
                        <div className="relative flex items-center">
                            <input type="date" name="transactionDate" id="transactionDate" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required
                                className="block w-full p-3 pl-10 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white focus:border-brand-primary focus:ring-brand-primary/50" />
                            <Calendar className="absolute left-3 w-5 h-5 text-gray-500" />
                        </div>
                    </div>
                </div>

                {/* DESCRIPTION */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="item_description">Description (e.g., Steel Beam Shipment Batch #4)</label>
                    <input type="text" name="item_description" id="item_description" value={formData.item_description} onChange={handleChange} required
                        className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white focus:border-brand-primary focus:ring-brand-primary/50" />
                </div>

                {/* VENDOR / BASE AMOUNT */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Vendor / Payee</label>
                        <input type="text" placeholder="Enter vendor/payee name" className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="actual_unit_cost">Base Amount (Unit Cost * Quantity)</label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-gray-500">₦</span>
                            <input type="number" name="actual_unit_cost" id="actual_unit_cost" value={formData.actual_unit_cost || ''} onChange={handleChange} required step="0.01" min="0"
                                placeholder="0.00" className="block w-full p-3 pl-8 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white focus:border-brand-primary focus:ring-brand-primary/50" />
                        </div>
                    </div>
                </div>
                
                {/* LPO / PAID AMOUNT / REF */}
                <div className="grid grid-cols-3 gap-6 border-b border-gray-700 pb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="commitment_lpo_amount">Commitment/LPO (NGN)</label>
                        <input type="number" name="commitment_lpo_amount" id="commitment_lpo_amount" value={formData.commitment_lpo_amount || ''} onChange={handleChange} step="0.01" min="0"
                            className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white focus:border-brand-primary focus:ring-brand-primary/50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="actual_paid_amount">Actual Paid Amount</label>
                        <input type="number" name="actual_paid_amount" id="actual_paid_amount" value={formData.actual_paid_amount || ''} onChange={handleChange} required step="0.01" min="0.01"
                            className="block w-full p-3 bg-brand-dark/50 border border-alert-critical rounded-lg shadow-sm text-white focus:ring-2 focus:ring-alert-critical/50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="document_reference">Document Ref (Invoice/PV)</label>
                        <input type="text" name="document_reference" id="document_reference" value={formData.document_reference} onChange={handleChange} 
                            className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white focus:border-brand-primary focus:ring-brand-primary/50" />
                    </div>
                </div>

                {/* TOTAL CALCULATED COST & ACTION BUTTONS */}
                <div className="flex justify-between items-center pt-4">
                    <div className="flex flex-col">
                        <p className="text-lg text-gray-400">TOTAL CALCULATED COST</p>
                        <p className="text-4xl font-extrabold text-brand-primary mt-1">{formatCurrency(totalExpenseValue)}</p>
                        <p className={`text-xs mt-1 flex items-center ${wbsAllocationFeedback.color}`}>
                            {wbsAllocationFeedback.icon} {wbsAllocationFeedback.text}
                        </p>
                    </div>
                    
                    <div className="flex space-x-4">
                        <button type="button" onClick={() => setFormData(initialFormState)} className="px-6 py-3 rounded-lg font-semibold text-gray-400 border border-gray-700 hover:border-white transition">
                            Clear Form
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            // CRITICAL ACTION BUTTON: Orange for the main write operation
                            className="px-8 py-3 rounded-lg font-bold text-white bg-alert-critical hover:bg-alert-critical/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-alert-critical/50 transition duration-150 ease-in-out disabled:opacity-50"
                        >
                            {loading ? 'Logging...' : 'LOG EXPENSE'}
                        </button>
                    </div>
                </div>
              </form>
            </Card>
          </div>
          
          {/* Right Column (Span 1): Recent Live Entries */}
          <div className="lg:col-span-1">
              <Card title="RECENT LIVE ENTRIES" borderTopColor="secondary">
                  {loadingRecent ? (
                      <p className="p-4 text-center text-brand-primary flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading recent expenses...</p>
                  ) : recentExpenses.length === 0 ? (
                      <p className="p-4 text-center text-gray-500">No recent expenses logged.</p>
                  ) : (
                      <div className="space-y-4">
                          {recentExpenses.map((expense) => (
                              <div key={expense.id} className="p-3 bg-brand-dark/50 rounded-lg border border-gray-700">
                                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                                      <p className="font-semibold text-alert-positive flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" /> {new Date(expense.expense_date).toLocaleDateString()}
                                      </p>
                                      <p>WBS {expense.wbs_code}</p>
                                  </div>
                                  <p className="text-lg font-bold text-white">{expense.item_description}</p>
                                  <p className="text-sm text-brand-primary mt-1">{formatCurrency(expense.actual_paid_amount)}</p>
                              </div>
                          ))}
                      </div>
                  )}
                  <Link href="/expense/history" className="mt-4 inline-flex items-center text-sm font-semibold text-brand-primary hover:text-white transition">
                      View All History <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
              </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default LiveExpenseTracker;