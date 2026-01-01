import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Layers3, Plus, Trash2, Edit3, Save, X, Loader2, AlertTriangle } from 'lucide-react';
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth, Role } from '../../components/context/AuthContext';

// Interface for Tenant Entity (mirrors backend TenantEntity)
interface Tenant {
  id: string;
  name: string; // Unique identifier for the tenant/client
  project_name: string; // Human-readable project name
  schema_name: string;
  created_at: string;
}

// Interface for Tenant Setup Form
interface TenantSetupForm {
  name: string;
  projectName: string;
  initialBudgetFile: File | null;
}

const TenantProjectSetupPage: React.FC = () => {
  const { user } = useAuth();
  const api = useSecuredApi();
  const isAdminOrFinance = user?.role === Role.Admin || user?.role === Role.Finance;

  const [formData, setFormData] = useState<TenantSetupForm>({
    name: '',
    projectName: '',
    initialBudgetFile: null,
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false); // Separate loading for form submission
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);

  // State for Edit Functionality
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editedProjectName, setEditedProjectName] = useState('');

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Tenant[]>('/admin/tenants');
      setTenants(response.data);
    } catch (e: any) {
      setError(`Failed to fetch tenants: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (isAdminOrFinance) { // Only fetch if user has permission
      fetchTenants();
    } else {
      setLoading(false);
    }
  }, [isAdminOrFinance, fetchTenants]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, initialBudgetFile: e.target.files[0] }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!formData.name || !formData.projectName) {
      setError('Tenant ID and Project Name are required.');
      setFormLoading(false);
      return;
    }

    const payload = new FormData();
    payload.append('name', formData.name.trim());
    payload.append('projectName', formData.projectName.trim());
    if (formData.initialBudgetFile) {
      payload.append('initialBudgetFile', formData.initialBudgetFile);
    }

    try {
      await api.post('/admin/tenants', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage(`Tenant '${formData.name}' and project '${formData.projectName}' successfully provisioned!`);
      setFormData({ name: '', projectName: '', initialBudgetFile: null });
      fetchTenants(); // Refresh list
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Provisioning Failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    setEditedProjectName(tenant.project_name);
    setError(null);
    setSuccessMessage(null);
  };

  const handleUpdateTenant = async (id: string) => {
    setFormLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // NOTE: Tenant name is immutable. Only project_name can be updated.
      await api.patch(`/admin/tenants/${id}`, { projectName: editedProjectName.trim() });
      setSuccessMessage(`Tenant ${id} updated successfully!`);
      setEditingTenantId(null);
      fetchTenants();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Update failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (tenantId: string) => {
    setDeletingTenantId(tenantId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTenantId) return;

    setFormLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.delete(`/admin/tenants/${deletingTenantId}`);
      setSuccessMessage(`Tenant ${deletingTenantId} deleted successfully!`);
      fetchTenants(); // Refresh list
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Deletion failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setFormLoading(false);
      setShowDeleteConfirm(false);
      setDeletingTenantId(null);
    }
  };

  return (
    <> {/* Replaced SecuredLayout with React Fragment */}
      <Head><title>Tenant Provisioning | SentinelFi</title></Head>
      <h1 className="text-4xl font-bold text-white mb-6 flex items-center">
        <Layers3 className="w-8 h-8 mr-3 text-alert-critical" /> Tenant & Project Provisioning
      </h1>
      <p className="text-lg text-gray-400 mb-8">
        Set up new client accounts or major projects with dedicated data isolation (Schema-per-Tenant).
      </p>

      {successMessage && <div className="p-3 mb-4 text-sm text-alert-positive bg-green-900 rounded-lg border border-green-700">{successMessage}</div>}
      {error && <div className="p-3 mb-4 text-sm text-red-400 bg-red-900 rounded-lg border border-red-700">{error}</div>}
      
      {!isAdminOrFinance && (
        <p className="text-alert-critical flex items-center p-4 bg-red-900/30 rounded-lg mb-8">
            <AlertTriangle className="w-5 h-5 mr-2" /> Access Denied: Only Admin and Finance roles can manage tenants.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Span 2): New Tenant Form */}
        <div className="lg:col-span-2">
            <Card title="Provision New Tenant/Project" subtitle="Admin/Finance Function (US-004)" borderTopColor="alert">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                        <label className="block text-sm font-medium text-white mb-1" htmlFor="name">Client/Tenant ID (Unique)</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required 
                            placeholder="e.g., AlphaClient or ProjectX_2026"
                            className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" 
                            disabled={formLoading || !isAdminOrFinance}
                            />
                        </div>
                        <div>
                        <label className="block text-sm font-medium text-white mb-1" htmlFor="projectName">Human-Readable Project Name</label>
                        <input type="text" name="projectName" id="projectName" value={formData.projectName} onChange={handleChange} required
                            placeholder="e.g., Q4 HQ Construction"
                            className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" 
                            disabled={formLoading || !isAdminOrFinance}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-white mb-1">Initial Budget Document (Optional)</label>
                        <div className="border-2 border-dashed border-gray-700 p-8 rounded-lg text-center cursor-pointer hover:border-brand-primary transition">
                            <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" 
                                   accept=".pdf,.docx,.csv,.xlsx,.xls" disabled={formLoading || !isAdminOrFinance} />
                            <label htmlFor="file-upload" className="cursor-pointer flex items-center justify-center">
                                {formData.initialBudgetFile ? (
                                    <p className="text-sm text-white font-semibold flex items-center"><Layers3 className="w-5 h-5 mr-2" /> File Ready: {formData.initialBudgetFile.name}</p>
                                ) : (
                                    <>
                                        <Layers3 className="w-8 h-8 mx-auto text-gray-500 mr-2" />
                                        <p className="text-sm text-gray-400">Click to upload or drag initial budget template</p>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={formLoading || !isAdminOrFinance}
                        className="w-full py-3 px-4 rounded-lg font-bold text-white bg-alert-critical hover:bg-alert-critical/90 disabled:opacity-50 transition shadow-md"
                    >
                        {formLoading ? <Loader2 className="w-5 h-5 inline animate-spin mr-2" /> : <Plus className="w-5 h-5 inline mr-2" />} Provision New Tenant/Project
                    </button>
                </form>
            </Card>
        </div>
        
        {/* Right Column (Span 1): Existing Tenants List */}
        <div className="lg:col-span-1">
            <Card title="Existing Tenants/Projects" subtitle="List of all provisioned environments." borderTopColor="secondary">
                {loading ? (
                    <p className="p-4 text-center text-brand-primary flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading tenants...</p>
                ) : tenants.length === 0 ? (
                    <p className="p-4 text-center text-gray-500">No tenants provisioned yet.</p>
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {tenants.map(tenant => (
                            <div key={tenant.id} className="flex flex-col p-3 bg-brand-dark/50 rounded-lg border border-gray-700">
                                {editingTenantId === tenant.id ? (
                                    <div className="flex-grow grid grid-cols-1 gap-2">
                                        <p className="font-bold text-sm text-brand-primary">Tenant ID: {tenant.name}</p>
                                        <p className="text-xs text-gray-400">Schema: {tenant.schema_name}</p>
                                        <label className="block text-xs font-medium text-white mb-1">Project Name</label>
                                        <input
                                            type="text"
                                            value={editedProjectName}
                                            onChange={(e) => setEditedProjectName(e.target.value)}
                                            className="bg-gray-700 border border-gray-600 rounded-lg p-1 text-white text-sm"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-grow">
                                        <p className="font-bold text-lg text-brand-primary">{tenant.project_name}</p>
                                        <p className="text-gray-300 text-sm">Tenant ID: {tenant.name}</p>
                                        <p className="text-gray-400 text-xs">Schema: {tenant.schema_name}</p>
                                    </div>
                                )}
                                
                                {isAdminOrFinance && (
                                    <div className="flex justify-end space-x-2 mt-2">
                                        {editingTenantId === tenant.id ? (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateTenant(tenant.id)}
                                                    disabled={formLoading}
                                                    className="text-alert-positive hover:text-green-300 transition"
                                                    title="Save Changes"
                                                >
                                                    <Save className="w-5 h-5" /> Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingTenantId(null)}
                                                    className="text-gray-400 hover:text-white transition"
                                                    title="Cancel Edit"
                                                >
                                                    <X className="w-5 h-5" /> Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleEditClick(tenant)}
                                                disabled={formLoading}
                                                className="text-brand-primary hover:text-white transition"
                                                title="Edit Project Name"
                                            >
                                                <Edit3 className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteClick(tenant.id)}
                                            disabled={formLoading}
                                            className="text-red-500 hover:text-red-300 transition"
                                            title="Delete Tenant"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card title="Confirm Tenant Deletion" borderTopColor="alert" className="w-full max-w-sm">
            <p className="text-white mb-4">Are you sure you want to delete this tenant? This action is permanent and will cascade to all associated data.</p>
            <div className="flex justify-end space-x-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="px-4 py-2 bg-gray-600 rounded-lg text-white hover:bg-gray-500 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm} 
                disabled={formLoading}
                className="px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-500 transition"
              >
                {formLoading ? 'Deleting...' : 'Delete Tenant'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </> // Replaced SecuredLayout with React Fragment
  );
};

export default TenantProjectSetupPage;
  );
};

export default TenantProjectSetupPage;