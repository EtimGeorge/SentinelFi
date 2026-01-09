import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { Users, Plus, X, Edit3, Save, Loader2, AlertTriangle, Trash2, Search, KeyRound } from 'lucide-react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input'; // Re-using Input component
import Button from '../../components/common/Button'; // Re-using Button component
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext';
import { Role as UserRoleEnum } from '../../../shared/types/role.enum';
import useToast from '../../store/toastStore';
import Switch from '../../components/common/Switch';

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

const ITEMS_PER_PAGE = 10;

const SuperAdminTenantsPage: React.FC = () => {
  const { user, isInitialLoad } = useAuth();
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [changingTenant, setChangingTenant] = useState<{ id: string, name: string, isActive: boolean } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      // Assuming backend returns { tenants: Tenant[], total: N }
      const response = await api.get<{ tenants: Tenant[], total: number }>('/super/tenants');
      setTenants(response.data.tenants);
    } catch (e: any) {
      addToast(`Failed to fetch tenants: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    if (!isInitialLoad && user?.role === UserRoleEnum.SuperAdmin) {
      fetchTenants();
    }
  }, [user, isInitialLoad, fetchTenants]);

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

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-xl animate-pulse">Initializing SentinelFi Session...</div>
      </div>
    );
  }

  if (!user || user.role !== UserRoleEnum.SuperAdmin) {
    return (
      <PageContainer title="Access Denied" subtitle="Unauthorized Access">
        <p className="text-alert-critical flex items-center p-4 bg-red-900/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 mr-2" />
          You do not have permission to access this page.
        </p>
      </PageContainer>
    );
  }

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
                    <tr key={tenant.tenant_id} className="hover:bg-gray-800/50 transition-colors duration-150">
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {/* Future: Add more actions like Edit, View Details */}
                          <button onClick={() => handleStatusToggle(tenant)} disabled={formLoading} className="text-gray-400 hover:text-brand-primary transition disabled:opacity-50" title={tenant.is_active ? 'Deactivate Tenant' : 'Activate Tenant'}><Edit3 className="w-5 h-5" /></button>
                      </td>
                    </tr>
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
    </>
  );
};

export default SuperAdminTenantsPage;