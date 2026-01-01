import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import PageContainer from '../components/Layout/PageContainer';
import { TrendingUp, Plus, Trash2, Edit3, Save, X, AlertTriangle } from 'lucide-react';
import Card from '../components/common/Card';
import { useSecuredApi } from '../components/hooks/useSecuredApi';
import { WbsCategoryEntity } from '../../backend/src/wbs/wbs-category.entity';
import { Role, useAuth } from '../components/context/AuthContext';

// Interface matching the WBS Category Entity
interface WbsCategoryEntity {
  id: string;
  code: string;
  description: string;
}

const WBSManagerPage: React.FC = () => {
  const { user } = useAuth(); // Get user for RBAC
  const api = useSecuredApi();
  const [categories, setCategories] = useState<WbsCategoryEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  // State for Edit Functionality
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCode, setEditedCode] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // RBAC checks
  const canManageCategories = user?.role === Role.Admin || user?.role === Role.Finance;

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setSuccessMessage(null);
    setError(null);
    try {
      const response = await api.get<WbsCategoryEntity[]>('/wbs/categories');
      setCategories(response.data);
    } catch (e: any) {
      setError("Failed to fetch categories: " + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newDescription) {
      setError("Code and Description cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.post('/wbs/categories', { code: newCode.trim(), description: newDescription.trim() });
      setNewCode('');
      setNewDescription('');
      setSuccessMessage('Category created successfully!');
      fetchCategories(); // Refresh list
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Creation failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (category: WbsCategoryEntity) => {
    setEditingCategoryId(category.id);
    setEditedCode(category.code);
    setEditedDescription(category.description);
    setError(null);
    setSuccessMessage(null);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form submission if this is part of a form
    if (!editingCategoryId || !editedCode || !editedDescription) {
      setError("Code and Description cannot be empty for update.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.patch(`/wbs/categories/${editingCategoryId}`, { code: editedCode.trim(), description: editedDescription.trim() });
      setSuccessMessage('Category updated successfully!');
      setEditingCategoryId(null); // Exit edit mode
      fetchCategories(); // Refresh list
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Update failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (categoryId: string) => {
    setDeletingCategoryId(categoryId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategoryId) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.delete(`/wbs/categories/${deletingCategoryId}`);
      setSuccessMessage('Category deleted successfully!');
      fetchCategories(); // Refresh list
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Deletion failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeletingCategoryId(null);
    }
  };

  return (
    <>
      <Head><title>WBS Manager | SentinelFi</title></Head>
      <PageContainer 
        title="WBS Category Manager"
        subtitle="Manage the foundational Level 1 WBS headers used for project structuring (NGN Template Fidelity)."
        headerContent={<TrendingUp className="w-8 h-8 text-brand-primary" />}
      >
        {successMessage && <div className="p-3 mb-4 text-sm text-alert-positive bg-green-900 rounded-lg border border-alert-positive/50">{successMessage}</div>}
        {error && <div className="p-3 mb-4 text-sm text-red-400 bg-red-900 rounded-lg border border-red-700">{error}</div>}

        {/* Main Grid: Categories List and Creation Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left (Span 2): Current Categories List */}
          <div className="lg:col-span-2">
            <Card title="Current Master Categories (NGN Template)" subtitle="Manage top-level WBS categories. Edits and deletions impact all dependent projects." borderTopColor="secondary">
              {loading && !categories.length ? <p className="text-brand-primary">Loading WBS structure...</p> : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {categories.length === 0 ? (
                    <p className="text-gray-400">No categories found. Start by creating one!</p>
                  ) : (
                    categories.map(cat => (
                      <div key={cat.id} className="flex justify-between items-center p-3 bg-brand-dark/50 rounded-lg border border-gray-700">
                        {editingCategoryId === cat.id ? (
                          <div className="flex-grow grid grid-cols-2 gap-2 mr-4">
                            <input 
                              type="text" 
                              value={editedCode} 
                              onChange={(e) => setEditedCode(e.target.value)} 
                              className="bg-gray-700 border border-gray-600 rounded-lg p-1 text-white text-sm"
                            />
                            <input 
                              type="text" 
                              value={editedDescription} 
                              onChange={(e) => setEditedDescription(e.target.value)} 
                              className="bg-gray-700 border border-gray-600 rounded-lg p-1 text-white text-sm"
                            />
                          </div>
                        ) : (
                          <div className="flex-grow">
                            <p className="font-bold text-lg text-brand-primary">{cat.code}</p>
                            <p className="text-gray-300">{cat.description}</p>
                          </div>
                        )}
                        
                        {canManageCategories && (
                          <div className="flex space-x-2">
                            {editingCategoryId === cat.id ? (
                              <>
                                <button 
                                  onClick={handleUpdateCategory}
                                  disabled={loading}
                                  className="text-alert-positive hover:text-green-300 transition"
                                  title="Save Changes"
                                >
                                  <Save className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => setEditingCategoryId(null)}
                                  className="text-gray-400 hover:text-white transition"
                                  title="Cancel Edit"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => handleEditClick(cat)}
                                disabled={loading}
                                className="text-brand-primary hover:text-white transition"
                                title="Edit Category"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteClick(cat.id)}
                              disabled={loading}
                              className="text-red-500 hover:text-red-300 transition"
                              title="Delete Category"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Right (Span 1): Create New Category Form */}
          <div className="lg:col-span-1">
            <Card title="Create New Category" subtitle="Only use X.0 codes (e.g., 8.0, 9.0). Requires Admin or Finance role." borderTopColor="alert">
              {!canManageCategories ? (
                <p className="text-alert-critical flex items-center p-4 bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 mr-2" /> You do not have permission to create categories.
                </p>
              ) : (
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white">Code (e.g., 8.0)</label>
                    <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} required
                      placeholder="X.0"
                      className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white">Description</label>
                    <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} required
                      placeholder="e.g., New Projects / Unallocated"
                      className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full flex items-center justify-center p-2 rounded-lg font-semibold text-white bg-alert-critical hover:bg-alert-critical/90 transition">
                    <Plus className="w-5 h-5 mr-2" /> Add Master Category
                  </button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card title="Confirm Deletion" borderTopColor="alert" className="w-full max-w-sm">
            <p className="text-white mb-4">Are you sure you want to delete this category? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="px-4 py-2 bg-gray-600 rounded-lg text-white hover:bg-gray-500 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm} 
                disabled={loading}
                className="px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-500 transition"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default WBSManagerPage;
