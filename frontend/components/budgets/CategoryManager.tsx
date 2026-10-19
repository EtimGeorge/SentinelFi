import React, { useState, useEffect, useCallback } from 'react';
import { useSecuredApi } from '../hooks/useSecuredApi';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import { Plus, Tag, Link2, Save, Ban } from 'lucide-react';
import useToast from '../../store/toastStore';

interface BudgetCategory {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  is_system_default: boolean;
  gl_account_id?: string | null;
}

interface GlAccountOption {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

const FALLBACK_LABEL = 'Default — General & Sundry (5290)';

const CategoryManager: React.FC = () => {
  const api = useSecuredApi();
  const addToast = useToast((state) => state.addToast);

  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [glAccounts, setGlAccounts] = useState<GlAccountOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Add form
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('OPEX');
  const [newCatGl, setNewCatGl] = useState('');

  // Edit mapping modal
  const [editing, setEditing] = useState<BudgetCategory | null>(null);
  const [editGl, setEditGl] = useState('');
  const [saving, setSaving] = useState(false);

  const accountById = React.useMemo(() => {
    const map = new Map<string, GlAccountOption>();
    for (const a of glAccounts) map.set(a.id, a);
    return map;
  }, [glAccounts]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/operational-budgets/categories/list');
      setCategories(res.data);
    } catch {
      addToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast]);

  const loadGlAccounts = useCallback(async () => {
    try {
      const res = await api.get('/finance-core/chart-of-accounts/accounts');
      const list = Array.isArray(res.data) ? res.data : [];
      setGlAccounts(list);
    } catch {
      // Non-fatal: dropdown falls back to an empty list.
    }
  }, [api]);

  useEffect(() => {
    loadCategories();
    loadGlAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddCategory = async () => {
    if (!newCatName) return;
    try {
      await api.post('/operational-budgets/categories', {
        name: newCatName,
        type: newCatType,
        gl_account_id: newCatGl || null,
      });
      addToast('Category added', 'success');
      setNewCatName('');
      setNewCatGl('');
      loadCategories();
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Failed to add category', 'error');
    }
  };

  const openEdit = (cat: BudgetCategory) => {
    setEditing(cat);
    setEditGl(cat.gl_account_id || '');
  };

  const saveMapping = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/operational-budgets/categories/${editing.id}`, {
        gl_account_id: editGl || null,
      });
      addToast(`Mapping saved for "${editing.name}"`, 'success');
      setEditing(null);
      loadCategories();
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Failed to save mapping', 'error');
    } finally {
      setSaving(false);
    }
  };

  const mappedLabel = (cat: BudgetCategory) => {
    if (!cat.gl_account_id) return null;
    const acc = accountById.get(cat.gl_account_id);
    if (!acc) return `Account ${cat.gl_account_id.slice(0, 8)}…`;
    return `${acc.code} — ${acc.name}`;
  };

  // Only active accounts make sense as a mapping target.
  const activeAccounts = glAccounts.filter((a) => a.is_active);

  return (
    <Card
      title="Budget Categories"
      subtitle="Map each expense category to a GL account. Unmapped categories post to General & Sundry (5290)."
      accent="secondary"
    >
      <div className="space-y-6">
        {/* Add New */}
        <div className="flex flex-wrap gap-3 items-end bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <Input
            label="New Category Name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Employee Wellness"
            containerClassName="flex-1 min-w-[180px]"
          />
          <div className="min-w-[150px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value)}
              className="w-full bg-brand-dark border border-gray-700 rounded-md p-2.5 text-white text-sm focus:border-brand-primary outline-none"
            >
              <option value="OPEX">OPEX (Operational)</option>
              <option value="CAPEX">CAPEX (Capital)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              GL Account <span className="normal-case font-medium text-gray-600">(optional)</span>
            </label>
            <select
              value={newCatGl}
              onChange={(e) => setNewCatGl(e.target.value)}
              className="w-full bg-brand-dark border border-gray-700 rounded-md p-2.5 text-white text-sm focus:border-brand-primary outline-none"
            >
              <option value="">{FALLBACK_LABEL}</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleAddCategory} disabled={!newCatName} className="mb-0.5">
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm text-gray-500">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-500">No categories yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const label = mappedLabel(cat);
              return (
                <div
                  key={cat.id}
                  className={`p-3 rounded-lg border ${
                    cat.is_system_default
                      ? 'bg-gray-800/30 border-gray-700'
                      : 'bg-brand-dark border-brand-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-white truncate">{cat.name}</span>
                    </div>
                    <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-gray-900 border border-gray-700 text-gray-400 shrink-0">
                      {cat.is_system_default ? 'System' : cat.type}
                    </span>
                  </div>

                  {/* GL mapping row */}
                  <div className="mt-2.5 flex items-start gap-2 text-xs">
                    <Link2 className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      {label ? (
                        <span className="font-mono text-brand-primary">{label}</span>
                      ) : (
                        <span className="text-gray-500">{FALLBACK_LABEL}</span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="mt-2.5">
                    {cat.is_system_default ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                        <Ban className="w-3 h-3" /> System default — create a custom category to map it
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline"
                      >
                        <Link2 className="w-3 h-3" /> Edit mapping
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit mapping modal */}
        <Modal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          title={editing ? `GL mapping — ${editing.name}` : 'GL mapping'}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={saveMapping} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving…' : 'Save mapping'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Choose which GL account approved expenses in this category are debited to.
              Leave as the default to post to General &amp; Sundry (5290).
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                GL Account
              </label>
              <select
                value={editGl}
                onChange={(e) => setEditGl(e.target.value)}
                className="w-full bg-brand-darker border border-gray-700 rounded-md p-2.5 text-white text-sm focus:border-brand-primary outline-none"
              >
                <option value="">{FALLBACK_LABEL}</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      </div>
    </Card>
  );
};

export default CategoryManager;
