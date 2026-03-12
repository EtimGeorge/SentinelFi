import React, { useState, useEffect } from 'react';
import { useSecuredApi } from '../hooks/useSecuredApi';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import { Plus, Tag, Settings } from 'lucide-react';
import useToast from '../../store/toastStore';

interface BudgetCategory {
  id: string;
  name: string;
  type: string;
  is_system_default: boolean;
  encumbrance_percentage?: number; // Future feature
}

const CategoryManager: React.FC = () => {
  const api = useSecuredApi();
  const addToast = useToast((state) => state.addToast);

  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('OPEX');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operational-budgets/categories/list');
      setCategories(res.data);
    } catch (error: any) {
      addToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName) return;
    try {
      await api.post('/operational-budgets/categories', {
        name: newCatName,
        type: newCatType,
      });
      addToast('Category added', 'success');
      setNewCatName('');
      fetchCategories();
    } catch (error: any) {
      addToast('Failed to add category', 'error');
    }
  };

  return (
    <Card title="Budget Categories" subtitle="Manage expense categories for your organization." borderTopColor="secondary">
      <div className="space-y-6">
        {/* Add New */}
        <div className="flex gap-2 items-end bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <Input
            label="New Category Name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Employee Wellness"
          />
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value)}
              className="w-full bg-brand-dark border border-gray-700 rounded-md p-2 text-white text-sm focus:border-brand-primary outline-none"
            >
              <option value="OPEX">OPEX (Operational)</option>
              <option value="CAPEX">CAPEX (Capital)</option>
            </select>
          </div>
          <Button onClick={handleAddCategory} disabled={!newCatName} className="mb-0.5">
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className={`p-3 rounded-lg border flex justify-between items-center ${cat.is_system_default ? 'bg-gray-800/30 border-gray-700 text-gray-400' : 'bg-brand-dark border-brand-primary/30 text-white'}`}>
              <div className="flex items-center gap-2">
                <Tag className="w-3 h-3" />
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-900 border border-gray-700">
                {cat.is_system_default ? 'System' : 'Custom'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default CategoryManager;
