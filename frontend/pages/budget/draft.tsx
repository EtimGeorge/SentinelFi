import React, { useState, useEffect, useMemo } from 'react';
import SecuredLayout from '../../components/Layout/SecuredLayout';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import Head from 'next/head';
import WBSHierarchyTree, { RollupData } from '../../components/dashboard/WBSHierarchyTree';
import { buildWBSHierarchy, flattenWBSForDisplay } from '../../lib/wbsUtils'; // <-- New Import

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
  quantity_budgeted: 0,
  duration_days_budgeted: null,
};

const BudgetDraftingPage: React.FC = () => {
  const api = useSecuredApi();
  const [formData, setFormData] = useState<WBSDraftForm>(initialFormState);
  const [existingWbsData, setExistingWbsData] = useState<RollupData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch existing WBS for context display (WBSHierarchyTree)
  useEffect(() => {
    const fetchWBS = async () => {
      try {
        const response = await api.get<RollupData[]>('/wbs/budget/rollup');
        setExistingWbsData(response.data);
      } catch (e) {
        console.error("Failed to fetch WBS for context:", e);
      }
    };
    fetchWBS();
  }, [api, success]);

  // CRITICAL FIX: Memoize the indented WBS list for the Parent WBS dropdown
  const parentWBSOptions = useMemo(() => {
    const hierarchy = buildWBSHierarchy(existingWbsData);
    // Flatten the hierarchy, excluding the root level for cleaner Parent WBS options
    return flattenWBSForDisplay(hierarchy, 0); 
  }, [existingWbsData]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['unit_cost_budgeted', 'quantity_budgeted', 'duration_days_budgeted'].includes(name) 
              ? (value === '' ? null : Number(value)) 
              : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    // Convert DTO back to clean state
    const dataToSend = {
      ...formData,
      unit_cost_budgeted: formData.unit_cost_budgeted || 0,
      quantity_budgeted: formData.quantity_budgeted || 0,
      // Send null if empty string, otherwise send the ID
      parent_wbs_id: formData.parent_wbs_id === '' ? null : formData.parent_wbs_id, 
      duration_days_budgeted: formData.duration_days_budgeted || undefined
    };

    try {
      await api.post('/wbs/budget-draft', dataToSend);
      setSuccess(`WBS Line ${formData.wbs_code} drafted successfully. Awaiting Finance approval.`);
      setFormData(initialFormState);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Draft Failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SecuredLayout>
      <Head><title>Budget Drafting | SentinelFi</title></Head>
      <h1 className="text-3xl font-extrabold text-brand-dark mb-8">WBS Budget Drafting & Approval</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Draft Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border-t-4 border-brand-secondary">
          <h2 className="text-xl font-semibold text-brand-secondary mb-6">Create New WBS Draft Line</h2>
          
          {success && <div className="p-3 mb-4 text-sm text-alert-positive bg-green-50 rounded-lg border border-alert-positive/50">{success}</div>}
          {error && <div className="p-3 mb-4 text-sm text-alert-critical bg-red-50 rounded-lg border border-alert-critical/50">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* WBS Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="wbs_code">WBS Code (e.g., 1.2.1)</label>
              <input type="text" name="wbs_code" id="wbs_code" value={formData.wbs_code} onChange={handleChange} required 
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" />
            </div>

            {/* Parent WBS ID (Dynamic Hierarchy Select) */}
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="parent_wbs_id">Parent WBS (Optional)</label>
              <select name="parent_wbs_id" id="parent_wbs_id" value={formData.parent_wbs_id || ''} onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-primary focus:ring-brand-primary/50">
                  <option value="">-- NO PARENT (New Level 1) --</option>
                  {parentWBSOptions.map(wbs => (
                    <option key={wbs.id} value={wbs.id}>
                      {wbs.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="description">Description (Cost Item)</label>
              <textarea name="description" id="description" value={formData.description} onChange={handleChange} required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" rows={2}></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="unit_cost_budgeted">Unit Cost (NGN)</label>
                <input type="number" name="unit_cost_budgeted" id="unit_cost_budgeted" value={formData.unit_cost_budgeted || ''} onChange={handleChange} required step="0.01" min="0"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="quantity_budgeted">Quantity</label>
                <input type="number" name="quantity_budgeted" id="quantity_budgeted" value={formData.quantity_budgeted || ''} onChange={handleChange} required step="0.01" min="0.01"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="duration_days_budgeted">Duration (Days)</label>
              <input type="number" name="duration_days_budgeted" id="duration_days_budgeted" value={formData.duration_days_budgeted || ''} onChange={handleChange} min="0"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-secondary hover:bg-brand-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary/50 transition duration-150 ease-in-out disabled:opacity-50"
            >
              {loading ? 'Submitting Draft...' : 'Submit WBS Budget Draft'}
            </button>
          </form>
        </div>

        {/* Right Column: Existing WBS Context (lg:col-span-2) */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-brand-dark mb-4">Existing WBS Structure for Context</h2>
          <WBSHierarchyTree data={existingWbsData} />
        </div>
      </div>
    </SecuredLayout>
  );
};

export default BudgetDraftingPage;