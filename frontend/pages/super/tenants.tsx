import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { 
  Users, 
  Plus, 
  X, 
  Edit3, 
  Save, 
  Loader2, 
  AlertTriangle, 
  Trash2, 
  Search, 
  KeyRound, 
  CreditCard,
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input'; // Re-using Input component
import Button from '../../components/common/Button'; // Re-using Button component
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext'; // CORRECTED IMPORT PATH
import { Role } from '../../../shared/types/role.enum';
import useToast from '../../store/toastStore';
import Switch from '../../components/common/Switch';
import Cookies from 'js-cookie'; // NEW: Import Cookies

// Interface for Tenant (adapted from backend DTO, includes more fields)
interface Tenant {
  tenant_id: string;
  name: string;
  schema_name: string;
  admin_email: string; // Not directly from entity, but part of create/list DTOs
  is_active: boolean;
  created_at: string; // ISO string
  admin_password?: string; // For create response
}

// DTOs for create/update from backend (assuming similar structure to User DTOs)
interface CreateTenantDto {
  name: string;
  schema_name: string;
  admin_email: string;
}

interface UpdateTenantDto {
  name?: string;
  is_active?: boolean;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
}

interface CreateTenantModalProps extends ModalProps {
  onCreate: (tenantData: CreateTenantDto) => Promise<void>;
  error: string | null;
}

const CreateTenantModal: React.FC<CreateTenantModalProps> = ({ isOpen, onClose, onCreate, loading, error }) => {
  const [name, setName] = useState('');
  const [schemaName, setSchemaName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSchemaName('');
      setAdminEmail('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <Card title="Create New Tenant" borderTopColor="primary" className="w-full max-w-md">
        <form onSubmit={async (e) => { e.preventDefault(); await onCreate({ name, schema_name: schemaName, admin_email: adminEmail }); }} className="space-y-4">
          {error && <p className="text-sm text-red-400 mb-3 bg-red-900/50 p-2 rounded-md">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-300">Tenant Name</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Schema Name (e.g., tenant_xyz)</label>
            <Input type="text" value={schemaName} onChange={(e) => setSchemaName(e.target.value)} required className="mt-1 block w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Admin Email</label>
            <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required className="mt-1 block w-full" />
          </div>
          <div className="flex justify-end space-x-4 pt-2">
            <Button type="button" onClick={onClose} variant="secondary" disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Tenant'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

interface ConfirmationModalProps extends ModalProps {
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  confirmText: string;
  confirmVariant?: 'primary' | 'danger';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, loading, title, message, onConfirm, confirmText, confirmVariant = 'primary' }) => {
    if (!isOpen) return null;

    const confirmButtonClass = confirmVariant === 'danger'
        ? 'bg-red-600 hover:bg-red-500'
        : 'bg-brand-primary hover:bg-brand-primary/90';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <Card title={title} borderTopColor={confirmVariant === 'danger' ? 'alert' : 'primary'} className="w-full max-w-sm">
                <div className="text-gray-300 mb-6">{message}</div>
                <div className="flex justify-end space-x-4">
                    <Button onClick={onClose} variant="secondary" disabled={loading}>Cancel</Button>
                    <Button onClick={onConfirm} className={`min-w-[120px] ${confirmButtonClass}`} disabled={loading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmText}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// Define TenantPlan interface (same as in backend DTO)
interface TenantPlan {
  plan_id: string;
  plan_name: string;
  max_users: number;
  max_storage_gb: number;
  expires_at: Date;
  is_active: boolean;
  price: number;
}

interface ManagePlanModalProps extends ModalProps {
  tenantId: string | null;
  tenantName: string | null; // Added to display in modal title
  onUpdate: () => void; // Callback to refresh tenant list after update
}

const ManagePlanModal: React.FC<ManagePlanModalProps> = ({ isOpen, onClose, tenantId, tenantName, onUpdate, loading }) => { // ADD loading here
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);
  const [plan, setPlan] = useState<TenantPlan | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true); // Renamed to avoid conflict
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a temporary state for form data based on TenantPlan interface
  const [formData, setFormData] = useState<Partial<TenantPlan>>({});

  const fetchPlan = useCallback(async () => {
    if (!tenantId) return;
    setFetchLoading(true);
    setError(null);
    try {
      const res = await api.get<TenantPlan>(`/super/tenants/${tenantId}/plan`);
      setPlan(res.data);
      setFormData({ // Initialize form with fetched data
        plan_name: res.data.plan_name,
        max_users: res.data.max_users,
        max_storage_gb: res.data.max_storage_gb,
        expires_at: res.data.expires_at, // Keep as string or convert if needed for input type="date"
        is_active: res.data.is_active,
        price: res.data.price,
      });
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Failed to fetch plan: ${msg}`);
      addToast(`Error loading plan: ${msg}`, 'error');
      // Set to null on error so it doesn't try to render an empty form
      setPlan(null);
    } finally {
      setFetchLoading(false);
    }
  }, [tenantId, api, addToast]);

  useEffect(() => {
    if (isOpen) {
      fetchPlan();
    }
  }, [isOpen, fetchPlan]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setFormLoading(true);
    setError(null);
    try {
      // Ensure expires_at is correctly formatted for the backend
      const dataToSend = {
        ...formData,
        expires_at: formData.expires_at ? new Date(formData.expires_at) : undefined, // Convert back to Date object
        max_users: Number(formData.max_users),
        max_storage_gb: Number(formData.max_storage_gb),
        price: Number(formData.price),
      };

      await api.patch(`/super/tenants/${tenantId}/plan`, dataToSend);
      addToast('Plan updated successfully!', 'success');
      onUpdate(); // Refresh tenant list or specific tenant details
      onClose();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setError(`Failed to update plan: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
      addToast(`Error updating plan: ${msg}`, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <Card title={`Manage Plan for Tenant: ${tenantName || ''}`} borderTopColor="primary" className="w-full max-w-lg">
        {fetchLoading ? ( // Use fetchLoading here
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-400 p-4">{error}</div>
        ) : plan === null ? (
            <div className="text-center text-gray-400 p-4">Plan data not available.</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Plan Name</label>
              <Input type="text" name="plan_name" value={formData.plan_name || ''} onChange={handleInputChange} required className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Max Users</label>
              <Input type="number" name="max_users" value={formData.max_users || ''} onChange={handleInputChange} required className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Max Storage (GB)</label>
              <Input type="number" name="max_storage_gb" value={formData.max_storage_gb || ''} onChange={handleInputChange} required className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Price</label>
              <Input type="number" name="price" value={formData.price || ''} onChange={handleInputChange} required className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Expires At</label>
              <Input type="date" name="expires_at" value={formData.expires_at ? new Date(formData.expires_at).toISOString().split('T')[0] : ''} onChange={handleInputChange} required className="mt-1 block w-full" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Is Active</label>
              <Switch checked={formData.is_active || false} onChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} />
            </div>
            <div className="flex justify-end space-x-4 pt-2">
              <Button type="button" onClick={onClose} variant="secondary" disabled={formLoading}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="min-w-[120px]">
                {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Plan'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
const ITEMS_PER_PAGE = 10;

import SuperAdminLayout from '../../components/Layout/SuperAdminLayout'; // Import SuperAdminLayout
import { NextPageWithLayout } from '../_app'; // Import NextPageWithLayout

const SuperAdminTenantsPage: NextPageWithLayout = () => {
  const { user } = useAuth(); // isInitialLoad removed as it's handled by _app.tsx
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [changingTenant, setChangingTenant] = useState<{ id: string, name: string, isActive: boolean } | null>(null);

  const [showManagePlanModal, setShowManagePlanModal] = useState(false); // NEW
  const [selectedTenantForPlan, setSelectedTenantForPlan] = useState<{ id: string; name: string } | null>(null); // NEW

  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null); // NEW: State for expanded row

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      // Assuming backend returns { tenants: Tenant[], total: N }
      const response = await api.get<{ data: Tenant[], total: number }>('/super/tenants');
      setTenants(response.data.data || []);
    } catch (e: any) {
      addToast(`Failed to fetch tenants: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    // No longer need isInitialLoad check here as _app.tsx ensures auth status
    // Also, SuperAdminLayout ensures user.role is SuperAdmin
    fetchTenants();
  }, [user, fetchTenants]); // user dependency added for clarity on re-fetch if user object changes

  const handleCreateTenant = async (tenantData: CreateTenantDto) => {
    setFormLoading(true);
    setCreateError(null);
    try {
      const newTenant = await api.post<Tenant>('/super/tenants', tenantData);
      addToast(`Tenant ${newTenant.data.name} created successfully! Admin password: ${newTenant.data.admin_password || 'Generated'}`, 'success', 8000);
      setShowCreateModal(false);
      fetchTenants();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      const errorText = `Tenant creation failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`;
      setCreateError(errorText);
      addToast(errorText, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusToggle = (tenant: Tenant) => {
    setChangingTenant({ id: tenant.tenant_id, name: tenant.name, isActive: tenant.is_active });
    setShowStatusConfirm(true);
  };

  const confirmStatusChange = async () => {
    if (!changingTenant) return;

    setFormLoading(true);
    try {
      await api.patch(`/super/tenants/${changingTenant.id}`, { is_active: !changingTenant.isActive });
      addToast(`Tenant ${changingTenant.name} status updated successfully.`, 'success');
      setShowStatusConfirm(false);
      fetchTenants();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      addToast(`Status update failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`, 'error');
    } finally {
      setFormLoading(false);
      setChangingTenant(null);
    }
  };

  const handleManagePlan = useCallback((tenant: Tenant) => { // NEW
    setSelectedTenantForPlan({ id: tenant.tenant_id, name: tenant.name });
    setShowManagePlanModal(true);
  }, []);

  const toggleExpandTenantRow = useCallback((tenantId: string) => { // NEW
    setExpandedTenantId(prev => (prev === tenantId ? null : tenantId));
  }, []);

  const filteredTenants = useMemo(() => {
    return tenants
      .filter(tenant => 
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.schema_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(tenant => statusFilter ? tenant.is_active.toString() === statusFilter : true);
  }, [tenants, searchTerm, statusFilter]);

  const paginatedTenants = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTenants.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTenants, currentPage]);

  const totalPages = Math.ceil(filteredTenants.length / ITEMS_PER_PAGE);

  const handleImpersonate = useCallback(async (tenantId: string) => {
    setFormLoading(true);
    try {
      const response = await api.post<{ access_token: string }>(`/super/tenants/${tenantId}/impersonate`);
      const { access_token } = response.data;

      // Replace current access token with the impersonation token
      Cookies.set('access_token', access_token, { expires: 1/24, sameSite: 'Lax', path: '/' }); // Set for 1 hour
      addToast('Impersonation successful. Redirecting to tenant dashboard.', 'success');
      
      // Redirect to the tenant's dashboard, AuthContext will handle the new token
      window.location.href = '/dashboard/home'; 

    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      addToast(`Impersonation failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`, 'error');
    } finally {
      setFormLoading(false);
    }
  }, [api, addToast]);

  // Auth check is now handled by SuperAdminLayout, no need for redundant checks here.
  // The page content is directly returned.

  return (
    <>
      <Head>
        <title>SuperAdmin Tenants | SentinelFi</title>
      </Head>
      <PageContainer
        title="SuperAdmin Tenants"
        subtitle="Manage all tenants on the platform."
        headerContent={<Users className="w-8 h-8 text-brand-primary/80" />}
      >
        <Card>
          <div className="p-4 border-b border-gray-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex-grow flex items-center gap-4">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                          type="text"
                          placeholder="Search by name or schema..."
                          value={searchTerm}
                          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                          className="pl-10 p-2 w-full sm:w-64 bg-brand-dark/50 border border-gray-600 rounded-lg shadow-sm text-white focus:ring-brand-primary focus:border-brand-primary"
                      />
                  </div>
                  <select
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                      className="p-2 bg-brand-dark/50 border border-gray-600 rounded-lg text-white appearance-none focus:ring-brand-primary focus:border-brand-primary"
                  >
                      <option value="">All Statuses</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                  </select>
              </div>
              <Button onClick={() => setShowCreateModal(true)} disabled={formLoading}>
                  <Plus className="w-5 h-5 mr-2" /> Create New Tenant
              </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-brand-dark/50">
                <tr>
                  {['Tenant Name', 'Schema Name', 'Admin Email', 'Status', 'Created At', 'Actions'].map(header => (
                     <th key={header} className={`px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${header === 'Actions' ? 'text-right' : ''}`}>
                       {header}
                     </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-gray-400"><div className="flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading tenant data...</div></td></tr>
                ) : paginatedTenants.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No tenants found matching your criteria.</td></tr>
                ) : (
                  paginatedTenants.map((tenant) => (
                    <React.Fragment key={tenant.tenant_id}>
                      <tr key={tenant.tenant_id} 
                          className="hover:bg-gray-800/50 transition-colors duration-150 cursor-pointer" // Make row clickable
                          onClick={() => toggleExpandTenantRow(tenant.tenant_id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{tenant.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{tenant.schema_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{tenant.admin_email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Switch 
                              checked={tenant.is_active} 
                              onChange={() => handleStatusToggle(tenant)} 
                              disabled={formLoading}
                            />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(tenant.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end">
                            <button onClick={(e) => { e.stopPropagation(); handleManagePlan(tenant); }} disabled={formLoading} className="text-gray-400 hover:text-blue-400 transition mr-3" title="Manage Subscription"><CreditCard className="w-5 h-5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleImpersonate(tenant.tenant_id); }} disabled={formLoading} className="text-gray-400 hover:text-purple-400 transition mr-3" title="Impersonate Admin"><KeyRound className="w-5 h-5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleStatusToggle(tenant); }} disabled={formLoading} className="text-gray-400 hover:text-brand-primary transition disabled:opacity-50 mr-3" title={tenant.is_active ? 'Deactivate Tenant' : 'Activate Tenant'}><Edit3 className="w-5 h-5" /></button>
                            {expandedTenantId === tenant.tenant_id ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        </td>
                      </tr>
                      {expandedTenantId === tenant.tenant_id && (
                        <tr>
                          <td colSpan={6} className="p-4 bg-gray-900/50 border-t border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-300">
                              <div>
                                <strong className="text-gray-400">Tenant ID:</strong> {tenant.tenant_id}
                              </div>
                              <div>
                                <strong className="text-gray-400">Schema Name:</strong> {tenant.schema_name}
                              </div>
                              <div>
                                <strong className="text-gray-400">Admin Email:</strong> {tenant.admin_email}
                              </div>
                              <div>
                                <strong className="text-gray-400">Created At:</strong> {new Date(tenant.created_at).toLocaleString()}
                              </div>
                              <div>
                                <strong className="text-gray-400">Status:</strong> 
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${tenant.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {tenant.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
              <div className="p-4 border-t border-gray-700 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
                  <div className="space-x-2">
                      <Button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || loading}>Previous</Button>
                      <Button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages || loading}>Next</Button>
                  </div>
              </div>
          )}
        </Card>
      </PageContainer>
      
      <CreateTenantModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
          onCreate={handleCreateTenant} 
          loading={formLoading} 
          error={createError} 
      />
      
      <ConfirmationModal
          isOpen={showStatusConfirm}
          onClose={() => setShowStatusConfirm(false)}
          loading={formLoading}
          title={changingTenant?.isActive ? 'Deactivate Tenant' : 'Activate Tenant'}
          message={<p>Are you sure you want to {changingTenant?.isActive ? 'deactivate' : 'activate'} tenant <strong>{changingTenant?.name}</strong>?</p>}
          onConfirm={confirmStatusChange}
          confirmText={changingTenant?.isActive ? 'Deactivate' : 'Activate'}
          confirmVariant={changingTenant?.isActive ? 'danger' : 'primary'}
      />

      <ManagePlanModal 
          isOpen={showManagePlanModal}
          onClose={() => setShowManagePlanModal(false)}
          tenantId={selectedTenantForPlan?.id || null}
          tenantName={selectedTenantForPlan?.name || null}
          onUpdate={() => { fetchTenants(); setShowManagePlanModal(false); }}
          loading={formLoading} 
      />
    </>
  );
};

import { ReactElement } from 'react'; // Import ReactElement

SuperAdminTenantsPage.getLayout = function getLayout(page: ReactElement) {
  return <SuperAdminLayout>{page}</SuperAdminLayout>;
};

export default SuperAdminTenantsPage;