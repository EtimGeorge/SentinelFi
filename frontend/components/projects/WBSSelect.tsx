import React, { useState, useEffect } from 'react';
import { useSecuredApi } from '../hooks/useSecuredApi';
import { WbsBudget } from '@shared/types/wbs';
import { ChevronDown, Search, Loader2 } from 'lucide-react';

interface WBSSelectProps {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

const WBSSelect: React.FC<WBSSelectProps> = ({ projectId, value, onChange, label, error }) => {
  const api = useSecuredApi();
  const [wbsItems, setWbsItems] = useState<WbsBudget[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (projectId) {
      const fetchWBS = async () => {
        setLoading(true);
        try {
          const response = await api.get<{ wbsBudgets: WbsBudget[] }>(`/wbs/budgets?projectId=${projectId}&limit=100`);
          setWbsItems(response.data.wbsBudgets);
        } catch (err) {
          console.error('Error fetching WBS:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchWBS();
    }
  }, [projectId, api]);

  const filteredItems = wbsItems.filter(item => 
    item.wbs_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItem = wbsItems.find(item => item.wbs_id === value);

  return (
    <div className="space-y-1.5 relative">
      {label && <label className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 bg-brand-dark/50 border ${error ? 'border-red-500' : 'border-gray-700'} rounded-xl text-left hover:border-brand-primary transition focus:outline-none`}
      >
        <span className={selectedItem ? 'text-white' : 'text-gray-500'}>
          {loading ? (
            <div className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading WBS...</div>
          ) : (
            selectedItem ? `${selectedItem.wbs_code} - ${selectedItem.description}` : 'Select WBS Node'
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 w-full mt-2 bg-brand-dark border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-gray-700 bg-brand-dark/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                autoFocus
                placeholder="Search by code or description..."
                className="w-full bg-brand-dark border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-200 focus:outline-none focus:border-brand-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="max-h-[250px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No WBS items found.</div>
            ) : (
              filteredItems.map(item => (
                <button
                  key={item.wbs_id}
                  onClick={() => {
                    onChange(item.wbs_id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-brand-primary/10 transition flex flex-col ${item.wbs_id === value ? 'bg-brand-primary/20 border-l-4 border-brand-primary' : ''}`}
                >
                  <span className="text-sm font-bold text-white tracking-tight">{item.wbs_code}</span>
                  <span className="text-xs text-gray-400 truncate">{item.description}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      
      {/* Backdrop for closing */}
      {isOpen && <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />}
    </div>
  );
};

export default WBSSelect;
