import React, { useState, useEffect, useMemo } from 'react';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import { WBSHierarchyTree, RollupData } from '../../components/dashboard/WBSHierarchyTree'; // Keep WBSHierarchyTree and RollupData
import { buildWBSHierarchy, flattenWBSForDisplay } from '../../lib/wbsUtils';
import { Minus, Plus, DollarSign, CloudUpload, CheckSquare } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import useToast from '../../store/toastStore'; // NEW: Import useToast

// Defines the shape of data for the form (matching CreateWbsBudgetDto)
interface WBSDraftForm {
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  unit_cost_budgeted: number;
  quantity_budgeted: number;
  duration_days_budgeted: number | null;
}

const initialFormState: WBSDraftForm = {
  parent_wbs_id: null,
  wbs_code: '',
  description: '',
  unit_cost_budgeted: 0,
  quantity_budgeted: 1,
  duration_days_budgeted: null,
};

const BudgetDraftingPage: React.FC = () => {
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast); // NEW: Get addToast
  const [formData, setFormData] = useState<WBSDraftForm>(initialFormState);
  const [existingWbsData, setExistingWbsData] = useState<RollupData[]>([]); // Correctly typed
  const [loading, setLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null); // Removed, using toast
  // const [success, setSuccess] = useState<string | null>(null); // Removed, using toast

  useEffect(() => {
    const fetchWBS = async () => {
      try {
        const response = await api.get<RollupData[]>('/wbs/budget/rollup'); // Correctly typed
        setExistingWbsData(response.data);
      } catch (e: any) {
        console.error("Failed to fetch WBS for context:", e);
        addToast({ title: 'Error', description: `Failed to fetch WBS options: ${e.message || 'Unknown error'}`, type: 'error' });
      }
    };
    fetchWBS();
  }, [api, addToast]);

  const parentWBSOptions = useMemo(() => {
    const hierarchy = buildWBSHierarchy(existingWbsData);
    return flattenWBSForDisplay(hierarchy, 0); 
  }, [existingWbsData]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | React.ChangeEvent<HTMLTextAreaElement> | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['unit_cost_budgeted', 'quantity_budgeted', 'duration_days_budgeted'].includes(name) 
              ? (value === '' ? null : Number(value)) 
              : value,
    }));
  };

  // Helper for Quantity Stepper
  const handleQuantityChange = (delta: number) => {
    setFormData(prev => ({
      ...prev,
      quantity_budgeted: Math.max(0.01, (prev.quantity_budgeted || 0) + delta),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // setError(null); // Removed, using toast
    // setSuccess(null); // Removed, using toast
    
    const dataToSend = {
      ...formData,
      unit_cost_budgeted: formData.unit_cost_budgeted || 0,
      quantity_budgeted: formData.quantity_budgeted || 0,
      parent_wbs_id: formData.parent_wbs_id === '' ? null : formData.parent_wbs_id, 
      duration_days_budgeted: formData.duration_days_budgeted || undefined
    };

    try {
      await api.post('/wbs/budget-draft', dataToSend);
      addToast({ title: 'Draft Saved', description: `WBS Line ${formData.wbs_code} drafted successfully. Awaiting Finance approval.`, type: 'success' }); // NEW: Use toast
      setFormData(initialFormState);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      addToast({ title: 'Draft Failed', description: `Draft Failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`, type: 'error' }); // NEW: Use toast
    } finally {
      setLoading(false);
    }
  };

  const estimatedCost = (formData.unit_cost_budgeted || 0) * (formData.quantity_budgeted || 0);
  
  // Simplified dynamic budget check
  const budgetStatus = useMemo(() => {
    if (estimatedCost > 0 && formData.parent_wbs_id) {
        const parentWbs = existingWbsData.find(wbs => wbs.wbs_id === formData.parent_wbs_id);
        if (parentWbs) {
            const parentBudget = Number(parentWbs.total_cost_budgeted);
            // This is a simplified check. A real check would sum up children, etc.
            if (estimatedCost <= parentBudget) {
                return { text: `Within allocated budget for ${parentWbs.wbs_code}`, color: 'text-alert-positive' };
            } else {
                return { text: `Exceeds allocated budget for ${parentWbs.wbs_code}`, color: 'text-alert-critical' };
            }
        }
    }
    return { text: 'No parent WBS selected or budget unknown.', color: 'text-gray-500' };
  }, [estimatedCost, formData.parent_wbs_id, existingWbsData]);


  return (
    <>
      <Head><title>Budget Drafting | SentinelFi</title></Head>
      <PageContainer
        title="Create New Budget Item"
        subtitle="Alpha Project / Financial Control / Budget Drafting"
        headerContent={
          <div className="flex space-x-4">
            <button className="text-gray-400 hover:text-white transition">Cancel</button>
            <button
              type="submit"
              form="budget-draft-form" // Associate with the form
              disabled={loading}
              className="px-6 py-2 rounded-lg font-semibold text-white bg-alert-positive hover:bg-alert-positive/90 disabled:opacity-50 transition shadow-md"
            >
              Save Draft
            </button>
          </div>
        }
      >
        {/* Success/Error messages as toasts now */}
        {/* {success && <div className="p-3 mb-4 text-sm text-alert-positive bg-green-900 rounded-lg border border-alert-positive/50">{success}</div>}
        {error && <div className="p-3 mb-4 text-sm text-red-400 bg-red-900 rounded-lg border border-red-700">{error}</div>} */}

        <form id="budget-draft-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card title="WBS Allocation" subtitle="Select the parent element" borderTopColor="primary">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white mb-1" htmlFor="wbs_code">WBS Code <span className="text-alert-critical">*</span></label>
                      <input type="text" name="wbs_code" id="wbs_code" value={formData.wbs_code} onChange={handleChange} required 
                        placeholder="e.g., 1.1.1 or 2.1"
                        className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm focus:border-brand-primary focus:ring-brand-primary/50 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1" htmlFor="parent_wbs_id">Parent WBS Element <span className="text-alert-critical">*</span></label>
                      <select name="parent_wbs_id" id="parent_wbs_id" value={formData.parent_wbs_id || ''} onChange={handleChange}
                        className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm focus:border-brand-primary focus:ring-brand-primary/50 text-white appearance-none">
                          <option value="" className="bg-gray-800 text-gray-400">-- NO PARENT (New Level 1) --</option>
                          {parentWBSOptions.map(wbs => (
                            <option key={wbs.id} value={wbs.id} className="bg-gray-800 text-white">
                              {wbs.label}
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">This item will be nested under the selected hierarchy.</p>
                    </div>
                </div>
              </Card>
              
              <Card title="General Information" borderTopColor="primary">
                <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-1" htmlFor="description">Description <span className="text-alert-critical">*</span></label>
                      <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} required
                        placeholder="e.g., Q3 Marketing Campaign Assets"
                        className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-1">Vendor / Payee</label>
                          <input type="text" placeholder="Search vendor database..." className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-1" htmlFor="duration_days_budgeted">Duration (Days)</label>
                          <input type="number" name="duration_days_budgeted" id="duration_days_budgeted" value={formData.duration_days_budgeted || ''} onChange={handleChange} min="0"
                            className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-1">Required Date</label>
                          <input type="date" placeholder="mm/dd/yyyy" className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
                        </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-1">Justification / Notes</label>
                      <textarea placeholder="Provide context for this budget request..." rows={3}
                        className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white"></textarea>
                    </div>
                </div>
              </Card>
            </div>
            
            <div className="lg:col-span-1 space-y-8">
              <Card title="Financials" borderTopColor="primary">
                <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-1" htmlFor="unit_cost_budgeted">Unit Cost</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">₦</span>
                        <input type="number" name="unit_cost_budgeted" id="unit_cost_budgeted" value={formData.unit_cost_budgeted || ''} onChange={handleChange} required step="0.01" min="0"
                          className="block w-full pl-8 p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-1" htmlFor="quantity_budgeted">Quantity</label>
                      <div className="flex items-center space-x-2">
                        <button type="button" onClick={() => handleQuantityChange(-1)} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
                          <Minus className="w-5 h-5 text-white" />
                        </button>
                        <input type="number" name="quantity_budgeted" id="quantity_budgeted" value={formData.quantity_budgeted || ''} onChange={handleChange} required step="0.01" min="0.01"
                          className="block w-full text-center p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
                        <button type="button" onClick={() => handleQuantityChange(1)} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
                          <Plus className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-brand-dark/70 rounded-lg border border-brand-secondary/50 text-center">
                        <p className="text-sm text-gray-400">TOTAL ESTIMATED COST</p>
                        <p className="text-3xl font-bold text-white mt-1">
                            {formatCurrency(estimatedCost)}
                        </p>
                        <p className={`text-xs mt-1 flex items-center justify-center ${budgetStatus.color}`}>
                            <CheckSquare className="w-3 h-3 inline mr-1" /> {budgetStatus.text}
                        </p>
                    </div>
                </div>
              </Card>

              <Card title="Attachments" borderTopColor="primary">
                <div className="border-2 border-dashed border-gray-700 p-8 rounded-lg text-center cursor-pointer hover:border-brand-primary transition">
                  <CloudUpload className="w-10 h-10 mx-auto text-gray-500 mb-2" />
                  <p className="text-sm text-gray-400">Click to upload or drag and drop quotes/invoices</p>
                </div>
              </Card>

              {/* NEW: WBS Hierarchy Tree for context */}
              <Card title="Existing WBS Structure" borderTopColor="secondary">
                <div className="max-h-80 overflow-y-auto">
                  <WBSHierarchyTree data={existingWbsData} />
                </div>
              </Card>

            </div>
          </div>
        </form>
      </PageContainer>
    </>
  );
};

export default BudgetDraftingPage;