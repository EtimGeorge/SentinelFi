import React, { useState, useEffect, useMemo } from 'react';
import SecuredLayout from '../../components/Layout/SecuredLayout';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import Head from 'next/head';
import WBSHierarchyTree, { RollupData } from '../../components/dashboard/WBSHierarchyTree';
import { formatCurrency } from '../../lib/utils';
import { buildWBSHierarchy, flattenWBSForDisplay } from '../../lib/wbsUtils'; // <-- New Import

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
  const [formData, setFormData] = useState<ExpenseEntryForm>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [wbsData, setWbsData] = useState<RollupData[]>([]);

  // 1. Fetch ALL WBS data for hierarchical dropdown
  useEffect(() => {
    const fetchWBSOptions = async () => {
      try {
        const response = await api.get<RollupData[]>('/wbs/budget/rollup');
        setWbsData(response.data);
      } catch (e) {
        console.error("Failed to fetch WBS options:", e);
      }
    };
    fetchWBSOptions();
  }, [api]);
  
  // CRITICAL FIX: Memoize the indented WBS list for the dropdown
  const wbsOptions = useMemo(() => {
    const hierarchy = buildWBSHierarchy(wbsData);
    // Filter out items that are not suitable for direct expense entry (e.g., only WBS 1.0)
    // For production, we will allow all nodes with total_cost_budgeted > 0 as options.
    return flattenWBSForDisplay(hierarchy, 0); 
  }, [wbsData]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      // Convert numeric fields from string input
      [name]: ['actual_unit_cost', 'actual_quantity', 'commitment_lpo_amount', 'actual_paid_amount'].includes(name) 
              ? (value === '' ? 0 : Number(value)) 
              : value,
    }));
  };
  
  // Calculate total expense value on the fly for the user
  const totalExpenseValue = (formData.actual_unit_cost * formData.actual_quantity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (formData.actual_paid_amount <= 0) {
        setError("Actual Paid Amount must be greater than zero.");
        setLoading(false);
        return;
    }

    try {
      // API Call: Direct write operation for the Assigned Project User
      await api.post('/wbs/expense/live-entry', formData); 
      setSuccess(`Expense for WBS ${formData.wbs_id} successfully logged. Real-Time Variance check triggered.`);
      setFormData(initialFormState);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Expense Entry Failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SecuredLayout>
      <Head><title>Live Expense Tracker | SentinelFi</title></Head>
      <h1 className="text-3xl font-extrabold text-brand-dark mb-8">Live Expense Tracker (WBS Accountability)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: High-Efficiency Entry Form */}
        <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-2xl border-t-8 border-alert-critical">
          <h2 className="text-2xl font-bold text-alert-critical mb-6">Immediate Expense Entry (User Write)</h2>
          <p className="text-sm text-gray-500 mb-6">All entries trigger real-time variance calculation on the CEO Dashboard.</p>
          
          {success && <div className="p-4 mb-4 text-sm text-alert-positive bg-green-50 rounded-lg border border-alert-positive/50">{success}</div>}
          {error && <div className="p-4 mb-4 text-sm text-alert-critical bg-red-50 rounded-lg border border-alert-critical/50">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-6">
                {/* Dynamic WBS ID Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="wbs_id">1. Link to WBS Budget Line</label>
                    <select name="wbs_id" id="wbs_id" value={formData.wbs_id} onChange={handleChange} required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-brand-dark font-medium focus:border-alert-critical focus:ring-alert-critical/50">
                        <option value="">-- Select a WBS Line Item --</option>
                        {wbsOptions.map(wbs => (
                        <option key={wbs.id} value={wbs.id}>
                            {wbs.label} {/* Indented, hierarchical label */}
                        </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="item_description">2. Item Description</label>
                    <input type="text" name="item_description" id="item_description" value={formData.item_description} onChange={handleChange} required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-alert-critical focus:ring-alert-critical/50" />
                </div>
            </div>

            {/* Financial Block (Unit Cost, Quantity, Paid Amount) */}
            <div className="grid grid-cols-3 gap-6 border-t pt-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="actual_unit_cost">Unit Cost (Actual NGN)</label>
                    <input type="number" name="actual_unit_cost" id="actual_unit_cost" value={formData.actual_unit_cost || ''} onChange={handleChange} required step="0.01" min="0"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-alert-critical focus:ring-alert-critical/50" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="actual_quantity">Quantity</label>
                    <input type="number" name="actual_quantity" id="actual_quantity" value={formData.actual_quantity || ''} onChange={handleChange} required step="0.01" min="0.01"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-alert-critical focus:ring-alert-critical/50" />
                </div>
                <div className="bg-brand-dark p-3 rounded-md flex flex-col justify-center">
                    <p className="text-xs text-gray-400">Total Calculated Cost</p>
                    <p className="text-xl font-bold text-alert-positive">{formatCurrency(totalExpenseValue)}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="commitment_lpo_amount">Commitment/LPO (NGN)</label>
                    <input type="number" name="commitment_lpo_amount" id="commitment_lpo_amount" value={formData.commitment_lpo_amount || ''} onChange={handleChange} step="0.01" min="0"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-alert-critical focus:ring-alert-critical/50" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="actual_paid_amount">4. Actual Paid Amount (NGN)</label>
                    <input type="number" name="actual_paid_amount" id="actual_paid_amount" value={formData.actual_paid_amount || ''} onChange={handleChange} required step="0.01" min="0.01"
                        className="mt-1 block w-full border-2 border-alert-critical rounded-md shadow-sm focus:ring-2 focus:ring-alert-critical/50" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="document_reference">5. Document Ref (Invoice/PV)</label>
                    <input type="text" name="document_reference" id="document_reference" value={formData.document_reference} onChange={handleChange} 
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-alert-critical focus:ring-alert-critical/50" />
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="notes_justification">Notes/Justification</label>
                <textarea name="notes_justification" id="notes_justification" value={formData.notes_justification} onChange={handleChange} rows={2}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-alert-critical focus:ring-alert-critical/50"></textarea>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 border border-transparent rounded-lg shadow-md text-lg font-bold text-white bg-alert-critical hover:bg-alert-critical/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-alert-critical/50 transition duration-150 ease-in-out disabled:opacity-50"
            >
              {loading ? 'Logging Expense...' : 'Log Expense & Calculate Real-Time Variance'}
            </button>
          </form>
        </div>
        
        {/* Right Column: Recent Activity/Audit Trail (lg:col-span-1) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border-t-4 border-brand-primary">
            <h2 className="text-xl font-semibold text-brand-dark mb-4">WBS Structure Reference</h2>
            <div className="text-sm text-gray-500">
                <p>The hierarchical breakdown of all available WBS codes is shown here for user reference during expense entry.</p>
                {/* Note: In production, this would be a simplified WBS Tree for reference, which is handled by WBSHierarchyTree */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                    <WBSHierarchyTree data={wbsData} />
                </div>
            </div>
        </div>
      </div>
    </SecuredLayout>
  );
};

export default LiveExpenseTracker;