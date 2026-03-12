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
  ChevronRight,
  Activity,
  CloudUpload
} from 'lucide-react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input'; // Re-using Input component
import Button from '../../components/common/Button'; // Re-using Button component
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext'; // CORRECTED IMPORT PATH
import { useCurrency } from '../../components/context/CurrencyContext';
import { Role } from '@shared/types/role.enum';
import useToast from '../../store/toastStore';
import Switch from '../../components/common/Switch';
import Cookies from 'js-cookie'; // NEW: Import Cookies

// Interface for Tenant (adapted from backend DTO, includes more fields)
interface Tenant {
  tenant_id: string;
  name: string;
  schema_name: string;
  admin_email: string;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null; // Added
  admin_password?: string;
}

// DTOs for create/update from backend
interface CreateTenantDto {
  name: string;
  schema_name: string;
  admin_email: string;
  projectName?: string;
  initialBudgetFile?: File | null;
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
  onCreate: (tenantData: FormData) => Promise<void>; // Use FormData for file upload
  error: string | null;
}

const CreateTenantModal: React.FC<CreateTenantModalProps> = ({ isOpen, onClose, onCreate, loading, error }) => {
  const [name, setName] = useState('');
  const [schemaName, setSchemaName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [projectName, setProjectName] = useState('');
  const [initialBudgetFile, setInitialBudgetFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSchemaName('');
      setAdminEmail('');
      setProjectName('');
      setInitialBudgetFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('schema_name', schemaName);
    formData.append('admin_email', adminEmail);
    formData.append('projectName', projectName);
    if (initialBudgetFile) {
      formData.append('initialBudgetFile', initialBudgetFile);
    }
    await onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <Card title="Provision New Enterprise Tenant" borderTopColor="primary" className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400 mb-3 bg-red-900/50 p-2 rounded-md">{error}</p>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Internal ID (Unique)</label>
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. ALPHA_CORP" className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Schema Name</label>
              <Input type="text" value={schemaName} onChange={(e) => setSchemaName(e.target.value)} required placeholder="e.g. tenant_alpha" className="w-full" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Display Project Name</label>
            <Input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} required placeholder="e.g. Alpha Headquarters 2026" className="w-full" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tenant Administrator Email</label>
            <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required placeholder="admin@client.com" className="w-full" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Initial Budget Template (AI Processing)</label>
            <div className="border-2 border-dashed border-gray-700 p-4 rounded-lg text-center cursor-pointer hover:border-brand-primary transition">
               <input 
                 type="file" 
                 id="tenant-file-upload" 
                 className="hidden" 
                 onChange={(e) => setInitialBudgetFile(e.target.files?.[0] || null)}
                 accept=".pdf,.docx,.xlsx"
               />
               <label htmlFor="tenant-file-upload" className="cursor-pointer">
                 {initialBudgetFile ? (
                   <div className="flex items-center justify-center text-brand-primary">
                     <CloudUpload className="w-5 h-5 mr-2" />
                     <span className="text-sm font-medium">{initialBudgetFile.name}</span>
                   </div>
                 ) : (
                   <div className="text-gray-500">
                     <CloudUpload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                     <p className="text-xs">Drag & drop or click to upload PDF/Excel</p>
                   </div>
                 )}
               </label>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <Button type="button" onClick={onClose} variant="secondary" disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !name || !adminEmail} className="min-w-[140px]">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Provision Tenant'}
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
  const { userCurrency } = useCurrency();
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
              <label className="block text-sm font-medium text-gray-300">Price ({userCurrency.symbol})</label>
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
interface ResetPasswordModalProps extends ModalProps {
  tenantId: string | null;
  tenantName: string | null;
  onReset: (newPassword: string, reason: string) => Promise<void>;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, loading, tenantId, tenantName, onReset }) => {
  const [newPassword, setNewPassword] = useState('');
  const [reason, setReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <Card title="Emergency Password Override" borderTopColor="alert" className="w-full max-w-md">
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            This will force a new password for the administrator of <strong>{tenantName}</strong> and send an audit-logged notification.
          </p>
        </div>
        <form onSubmit={async (e) => { e.preventDefault(); await onReset(newPassword, reason); }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">New Admin Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <X className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Administrative Reason</label>
            <Input
              type="text"
              placeholder="e.g., Client requested reset / Security breach"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <Button type="button" onClick={onClose} variant="secondary" disabled={loading}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={loading || !newPassword || !reason}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Force Update'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const ITEMS_PER_PAGE = 10;

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

  const [showManagePlanModal, setShowManagePlanModal] = useState(false);
  const [selectedTenantForPlan, setSelectedTenantForPlan] = useState<{ id: string; name: string } | null>(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedTenantForReset, setSelectedTenantForReset] = useState<{ id: string; name: string } | null>(null);

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [selectedTenantForArchive, setSelectedTenantForArchive] = useState<{ id: string; name: string } | null>(null);

  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);


  const fetchTenants = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      // ADVANCED: Server-side pagination & Search
      const response = await api.get<{ data: Tenant[], total: number }>('/super/tenants', {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          name: searchTerm,
          is_active: statusFilter === '' ? undefined : (statusFilter === 'true')
        },
        signal
      });
      setTenants(response.data.data || []);
      setTotalCount(response.data.total || 0);
    } catch (e: any) {
      if (e.name === 'AbortError' || e.code === 'ERR_CANCELED') return;
      addToast(`Failed to reach management layer: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [api, addToast, currentPage, searchTerm, statusFilter]);


  useEffect(() => {
    if (!user) return; // Guard: Wait for user to be loaded

    const controller = new AbortController();
    fetchTenants(controller.signal);

    return () => controller.abort();
  }, [user, fetchTenants]);

  const handleCreateTenant = async (tenantData: FormData) => {
    setFormLoading(true);
    setCreateError(null);
    try {
      const newTenant = await api.post<Tenant>('/super/tenants', tenantData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      addToast(`Tenant ${newTenant.data.name} provisioned successfully! Admin password: ${newTenant.data.admin_password || 'Securely Generated'}`, 'success', 8000);
      setShowCreateModal(false);
      fetchTenants();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      const errorText = `Tenant provisioning failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`;
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);


  const handleImpersonate = useCallback(async (tenantId: string) => {
    setFormLoading(true);
    try {
      const response = await api.post<{ access_token: string }>(`/super/tenants/${tenantId}/impersonate`);
      const { access_token } = response.data;

      // Replace current access token with the impersonation token
      Cookies.set('access_token', access_token, { expires: 1 / 24, sameSite: 'Lax', path: '/' }); // Set for 1 hour
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

  const handleResetPassword = async (newPassword: string, reason: string) => {
    if (!selectedTenantForReset) return;
    setFormLoading(true);
    try {
      await api.patch(`/super/tenants/${selectedTenantForReset.id}/reset-password`, {
        newPassword,
        reason
      });
      addToast(`Emergency password update for ${selectedTenantForReset.name} successful.`, 'success');
      setShowResetModal(false);
    } catch (e: any) {
      addToast(e.response?.data?.message || 'Failed to override password.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const confirmArchive = async () => {
    if (!selectedTenantForArchive) return;
    setFormLoading(true);
    try {
      await api.delete(`/super/tenants/${selectedTenantForArchive.id}`);
      addToast(`Tenant ${selectedTenantForArchive.name} archived. Access suspended.`, 'success');
      setShowArchiveConfirm(false);
      fetchTenants();
    } catch (e: any) {
      addToast(e.response?.data?.message || 'Failed to archive tenant.', 'error');
    } finally {
      setFormLoading(false);
      setSelectedTenantForArchive(null);
    }
  };

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
                ) : tenants.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No tenants found matching your criteria.</td></tr>
                ) : (
                  tenants.map((tenant) => (
                    <React.Fragment key={tenant.tenant_id}>
                      <tr
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
                          <td colSpan={6} className="p-0 bg-gray-900/50 border-t border-gray-700">
                            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
                              <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center">
                                  <Activity className="w-3 h-3 mr-2" />
                                  Metadata & Compliance
                                </h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between text-sm py-2 border-b border-gray-800/50">
                                    <span className="text-gray-400">Unique Entity ID</span>
                                    <span className="text-gray-300 font-mono">{tenant.tenant_id}</span>
                                  </div>
                                  <div className="flex justify-between text-sm py-2 border-b border-gray-800/50">
                                    <span className="text-gray-400">Database Schema</span>
                                    <span className="text-brand-secondary font-mono">{tenant.schema_name}</span>
                                  </div>
                                  <div className="flex justify-between text-sm py-2 border-b border-gray-800/50">
                                    <span className="text-gray-400">Onboarding Date</span>
                                    <span className="text-gray-300">{new Date(tenant.created_at).toLocaleString()}</span>
                                  </div>
                                  {tenant.deleted_at && (
                                    <div className="flex justify-between text-sm py-2 border-b border-brand-primary/20 bg-brand-primary/5 px-2 rounded">
                                      <span className="text-brand-primary font-bold">Archived On</span>
                                      <span className="text-brand-primary">{new Date(tenant.deleted_at).toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="bg-brand-dark/30 rounded-xl border border-gray-800 p-5">
                                <h4 className="text-xs font-bold text-red-500/80 uppercase tracking-widest mb-4 flex items-center">
                                  <AlertTriangle className="w-3 h-3 mr-2" />
                                  Technical Danger Zone
                                </h4>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-700/50 hover:bg-gray-800 transition-colors">
                                    <div>
                                      <p className="text-sm text-white font-medium">Reset Admin Password</p>
                                      <p className="text-xs text-gray-500">Emergency override for lost access.</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => { setSelectedTenantForReset({ id: tenant.tenant_id, name: tenant.name }); setShowResetModal(true); }}
                                    >
                                      <KeyRound className="w-3 h-3 mr-2" />
                                      Override
                                    </Button>
                                  </div>

                                  <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/10 hover:bg-red-500/5 transition-colors">
                                    <div>
                                      <p className="text-sm text-white font-medium">Archive Tenant</p>
                                      <p className="text-xs text-gray-500">Soft-delete. Data preserved for 30 days.</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() => { setSelectedTenantForArchive({ id: tenant.tenant_id, name: tenant.name }); setShowArchiveConfirm(true); }}
                                    >
                                      <Trash2 className="w-3 h-3 mr-2" />
                                      Archive
                                    </Button>
                                  </div>
                                </div>
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

      <ResetPasswordModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        loading={formLoading}
        tenantId={selectedTenantForReset?.id || null}
        tenantName={selectedTenantForReset?.name || null}
        onReset={handleResetPassword}
      />

      <ConfirmationModal
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        loading={formLoading}
        title="Archive Tenant Entity"
        message={
          <div className="space-y-3">
            <p>Are you sure you want to archive <strong>{selectedTenantForArchive?.name}</strong>?</p>
            <ul className="text-xs text-gray-500 list-disc ml-5 space-y-1">
              <li>All user access will be immediately revoked.</li>
              <li>Database schema will be disconnected but preserved.</li>
              <li>You can restore this tenant from the Archive tab (Phase 10).</li>
            </ul>
          </div>
        }
        onConfirm={confirmArchive}
        confirmText="Archive Entity"
        confirmVariant="danger"
      />
    </>
  );
};



export default SuperAdminTenantsPage;