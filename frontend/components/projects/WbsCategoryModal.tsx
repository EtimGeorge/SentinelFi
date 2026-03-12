import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight, AlertTriangle, ChevronRight, ChevronDown, FolderPlus } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface WBSCategory {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  color: string | null;
  parent_id: string | null;
  is_active: boolean;
}

interface WbsCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WbsCategoryModal: React.FC<WbsCategoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [categories, setCategories] = useState<WBSCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
    usageCount: number;
  } | null>(null);
  const [newCat, setNewCat] = useState({
    name: '',
    code: '',
    description: '',
    parent_id: ''
  });

  const fetchCategories = async () => {
    try {
      const res = await api.get<WBSCategory[]>(`/wbs/categories?includeInactive=${showInactive}`);
      setCategories(res.data);
    } catch (err) {
      toast.error('Failed to load categories');
    }
  };

  useEffect(() => {
    if (isOpen) fetchCategories();
  }, [isOpen, showInactive]);

  const handleAdd = async () => {
    if (!newCat.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/wbs/categories', {
        name: newCat.name.trim(),
        code: newCat.code.trim() || null,
        description: newCat.description.trim() || null,
        parent_id: newCat.parent_id || null  // empty string becomes null
      });
      toast.success('Category created successfully');
      setNewCat({ name: '', code: '', description: '', parent_id: '' });
      fetchCategories();
      onSuccess();
    } catch (error: any) {
      const msg = error.response?.data?.message;
      if (msg?.includes('already exists')) {
        toast.error(`A category named "${newCat.name}" already exists at this level.`);
      } else {
        toast.error(msg || 'Failed to create category');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await api.delete(`/wbs/categories/${id}`);
      toast.success(`"${name}" removed permanently`);
      setDeleteConfirm(null);
      fetchCategories();
      onSuccess();
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.requiresSoftDeleteConfirmation) {
        // Backend says category is in use — show confirmation dialog
        setDeleteConfirm({
          id,
          name,
          usageCount: data.usageCount || 0
        });
      } else {
        toast.error(data?.message || 'Failed to delete');
      }
    }
  };

  const handleSoftDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/wbs/categories/${deleteConfirm.id}?forceSoftDelete=true`);
      toast.success(`"${deleteConfirm.name}" deactivated. Historical data preserved.`);
      setDeleteConfirm(null);
      fetchCategories();
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to deactivate');
    }
  };

  const handleReactivate = async (id: string, name: string) => {
    try {
      await api.patch(`/wbs/categories/${id}`, { is_active: true });
      toast.success(`"${name}" reactivated`);
      fetchCategories();
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reactivate');
    }
  };

  const toggleSection = (id: string) => {
    const next = new Set(expandedSections);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedSections(next);
  };

  const renderCategoryOptions = (parentId: string | null = null, depth: number = 0): React.ReactNode[] => {
    return categories
      .filter(c => c.parent_id === parentId && c.is_active)
      .flatMap(cat => [
        <option key={cat.id} value={cat.id}>
          {'\u00A0'.repeat(depth * 3)}{cat.code ? `[${cat.code}] ` : ''}{cat.name}
        </option>,
        ...renderCategoryOptions(cat.id, depth + 1)
      ]);
  };

  const renderCategoryList = (parentId: string | null = null, depth: number = 0): React.ReactNode | null => {
    const children = categories.filter(c => c.parent_id === parentId);
    if (children.length === 0) return null;

    return (
      <div className={`space-y-1 ${depth > 0 ? 'ml-5 pl-3 border-l border-gray-700/50' : ''}`}>
        {children.map(cat => {
          const hasChildren = categories.some(c => c.parent_id === cat.id);
          const isExpanded = expandedSections.has(cat.id);
          const isInactive = !cat.is_active;

          return (
            <div key={cat.id} className="space-y-1">
              <div className={`flex items-center justify-between p-2.5 rounded-lg transition group
                ${isInactive
                  ? 'bg-red-900/10 border border-red-800/30 opacity-60'
                  : 'bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/40'
                }`}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {/* Expand/Collapse toggle for parents */}
                  {hasChildren ? (
                    <button onClick={() => toggleSection(cat.id)} className="p-0.5 hover:bg-gray-700/50 rounded">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      }
                    </button>
                  ) : (
                    <span className="w-4" /> // spacer
                  )}
                  {cat.color && (
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  )}
                  {!cat.color && <Tag className="w-3 h-3 text-brand-primary/60 flex-shrink-0" />}
                  <span className={`text-sm truncate ${isInactive ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                    {cat.code && <span className="text-brand-primary mr-1 font-mono text-xs">[{cat.code}]</span>}
                    {cat.name}
                  </span>
                  {isInactive && (
                    <span className="text-[9px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider flex-shrink-0">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0 ml-2">
                  {isInactive ? (
                    <button
                      onClick={() => handleReactivate(cat.id, cat.name)}
                      className="p-1 hover:bg-green-900/30 rounded transition"
                      title="Reactivate category"
                    >
                      <ToggleRight className="w-4 h-4 text-green-400" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-1 hover:bg-red-900/20 rounded transition"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Render children only if expanded */}
              {hasChildren && isExpanded && renderCategoryList(cat.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Tenant Master Categories"
        size="lg"
      >
        <div className="space-y-5">
          {/* Header description */}
          <p className="text-xs text-gray-400 -mt-2">
            Define reusable cost-type hierarchies for your organization. These categories are available across all projects.
          </p>

          {/* Creation Form */}
          <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/30 border border-gray-700/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <FolderPlus className="w-4 h-4 text-brand-primary" />
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Create Category</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Category Name *"
                value={newCat.name}
                onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                className="bg-gray-900/80 border border-gray-700 rounded-lg p-2.5 text-sm text-white placeholder-gray-500 focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 outline-none transition"
              />
              <input
                placeholder="Code (e.g. 1000)"
                value={newCat.code}
                onChange={e => setNewCat({ ...newCat, code: e.target.value })}
                className="bg-gray-900/80 border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono placeholder-gray-500 focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 outline-none transition"
              />
            </div>
            <input
              placeholder="Description (optional)"
              value={newCat.description}
              onChange={e => setNewCat({ ...newCat, description: e.target.value })}
              className="w-full bg-gray-900/80 border border-gray-700 rounded-lg p-2.5 text-sm text-white placeholder-gray-500 focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 outline-none transition"
            />
            <div className="flex space-x-2">
              <select
                value={newCat.parent_id}
                onChange={e => setNewCat({ ...newCat, parent_id: e.target.value })}
                className="flex-grow bg-gray-900/80 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-brand-primary/50 outline-none transition"
              >
                <option value="">— Top Level (Root Category) —</option>
                {renderCategoryOptions(null)}
              </select>
              <Button variant="primary" onClick={handleAdd} disabled={loading || !newCat.name.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Existing Hierarchy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Existing Hierarchy</h4>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className={`flex items-center space-x-1.5 text-[10px] font-medium px-2 py-1 rounded-full transition ${showInactive
                    ? 'bg-amber-900/20 text-amber-400 border border-amber-800/30'
                    : 'bg-gray-800/40 text-gray-500 border border-gray-700/40 hover:text-gray-300'
                  }`}
              >
                {showInactive ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                <span>{showInactive ? 'Showing Inactive' : 'Show Inactive'}</span>
              </button>
            </div>
            <div className="max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {renderCategoryList(null)}
              {categories.length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <Tag className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-500">No categories defined yet.</p>
                  <p className="text-[10px] text-gray-600">Create your first top-level category above.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Soft Delete Confirmation Dialog */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Category In Use"
        size="sm"
      >
        {deleteConfirm && (
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-amber-900/10 border border-amber-800/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="text-gray-200 font-medium">
                  &quot;{deleteConfirm.name}&quot; is used in <span className="text-amber-400 font-bold">{deleteConfirm.usageCount}</span> budget item(s).
                </p>
                <p className="text-gray-400 text-xs">
                  Hard deletion is blocked to protect historical financial data. You can <strong>deactivate</strong> this category instead — it will remain linked to existing budgets but won&apos;t appear in new budget dropdowns.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleSoftDelete}>
                <ToggleLeft className="w-4 h-4 mr-1" />
                Deactivate
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
