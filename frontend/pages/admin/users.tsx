import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { Users, Plus, X, Edit3, Save, Loader2, AlertTriangle, Trash2, Search, KeyRound } from 'lucide-react';
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext';
import { User, ICreateUserPayload, IUpdateUserPayload } from '../../../shared/types/user';
import { Role as UserRoleEnum } from '../../../shared/types/role.enum';
import useToast from '../../store/toastStore';
import Switch from '../../components/common/Switch';

// Interface for Tenant (simplified for dropdown)
interface TenantOption {
  id: string;
  name: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
}

interface CreateUserModalProps extends ModalProps {
  onCreate: (userData: ICreateUserPayload) => void;
  error: string | null;
  roles: UserRoleEnum[];
  tenants: TenantOption[];
  isSuperAdmin: boolean; // NEW: Added prop
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onCreate, loading, error, roles, tenants, isSuperAdmin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRoleEnum>(UserRoleEnum.AssignedProjectUser);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setRole(UserRoleEnum.AssignedProjectUser);
      setTenantId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <Card title="Create New User" borderTopColor="primary" className="w-full max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); onCreate({ email, password, role, tenant_id: tenantId }); }} className="space-y-4">
          {error && <p className="text-sm text-red-400 mb-3 bg-red-900/50 p-2 rounded-md">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white focus:ring-brand-primary focus:border-brand-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white focus:ring-brand-primary focus:border-brand-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRoleEnum)} className="mt-1 block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none focus:ring-brand-primary focus:border-brand-primary">
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Assign Tenant (Optional)</label>
            <select value={tenantId || ''} onChange={(e) => setTenantId(e.target.value || null)} className="mt-1 block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none focus:ring-brand-primary focus:border-brand-primary" disabled={!isSuperAdmin}>
              <option value="">-- No Tenant Assigned (System User) --</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end space-x-4 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg text-white hover:bg-gray-500 transition disabled:opacity-50" disabled={loading}>Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-primary rounded-lg text-white hover:bg-brand-primary/90 transition flex items-center justify-center min-w-[120px] disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create User'}
            </button>
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
                    <button onClick={onClose} disabled={loading} className="px-4 py-2 bg-gray-600 rounded-lg text-white hover:bg-gray-500 transition disabled:opacity-50">Cancel</button>
                    <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 rounded-lg text-white transition flex items-center justify-center min-w-[120px] disabled:opacity-50 ${confirmButtonClass}`}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmText}
                    </button>
                </div>
            </Card>
        </div>
    );
};


const allRoles = Object.values(UserRoleEnum);
const ITEMS_PER_PAGE = 10;

const UserManagementPage: React.FC = () => {
  const { user: currentUser, hasAnyRole } = useAuth();
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);
  
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editedRole, setEditedRole] = useState<UserRoleEnum | string>('');
  const [editedTenantId, setEditedTenantId] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
  const [passwordResettingUserId, setPasswordResettingUserId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<User[]>('/auth/users');
      setUsers(response.data);
    } catch (e: any) {
      addToast(`Failed to fetch users: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast]);

  const fetchTenants = useCallback(async () => {
    try {
      // The API call is correct: api.get('/admin/tenants') resolves to GET /api/v1/admin/tenants
      const response = await api.get<TenantOption[]>('/admin/tenants');
      console.log('[UserManagementPage] Fetched Tenants:', response.data); // Log tenant data
      setTenants(response.data);
    } catch (e: any) {
      addToast(`Failed to fetch tenants: ${e.message || 'Unknown error'}`, 'error');
      console.error('[UserManagementPage] Error fetching tenants:', e); // Log errors
    }
  }, [api, addToast]);

  useEffect(() => {
    if (hasAnyRole([UserRoleEnum.Admin, UserRoleEnum.ITHead, UserRoleEnum.SuperAdmin])) {
      fetchUsers();
      fetchTenants();
    } else {
      setLoading(false);
      addToast('Access Denied: You do not have permission to manage users.', 'error');
    }
  }, [hasAnyRole, fetchUsers, fetchTenants, addToast]);

  const handleCreateUser = async (userData: ICreateUserPayload) => {
    setFormLoading(true);
    setCreateError(null);
    try {
      const newUser = await api.post<User>('/auth/users', userData);
      addToast(`User ${newUser.data.email} created successfully!`, 'success');
      setShowCreateModal(false);
      fetchUsers(); // Refetch users to include the new one
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      const errorText = `Creation failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`;
      setCreateError(errorText);
      addToast(errorText, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setEditedRole(user.roles[0]?.name || ''); // Access first role in the array
    setEditedTenantId(user.tenant_id || null);
  };

  const handleSaveUser = async (userId: string) => {
    if (!editedRole) {
      addToast('Role cannot be empty.', 'error');
      return;
    }
    setFormLoading(true);
    try {
      // This is the key change: ensure tenant_id is included in the payload.
      const updatePayload: IUpdateUserPayload = { 
        role: editedRole as UserRoleEnum, 
        tenant_id: editedTenantId,
      };
      await api.patch<User>(`/auth/users/${userId}`, updatePayload);
      addToast('User updated successfully!', 'success');
      setEditingUserId(null);
      fetchUsers(); // Refetch users to show the updated data
    } catch (e: any)
       {
      const msg = e.response?.data?.message || e.message;
      addToast(`Update failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`, 'error');
    } finally {
      setFormLoading(false);
    }
  };
  
  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Optimistic UI update
    setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));

    try {
      const updatePayload: IUpdateUserPayload = { is_active: !currentStatus };
      await api.patch(`/auth/users/${userId}`, updatePayload);
      addToast(`User ${user.email} status updated.`, 'success');
    } catch (e: any) {
      // Revert on failure
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: currentStatus } : u));
      const msg = e.response?.data?.message || e.message;
      addToast(`Status update failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`, 'error');
    }
  };

  const handleDeleteClick = (userId: string) => {
    setDeletingUserId(userId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUserId) return;
    setFormLoading(true);
    try {
      await api.delete(`/auth/users/${deletingUserId}`);
      addToast(`User deactivated successfully!`, 'success');
      setShowDeleteConfirm(false);
      fetchUsers();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      addToast(`Deactivation failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`, 'error');
    } finally {
      setFormLoading(false);
      setDeletingUserId(null);
    }
  };

  const handlePasswordResetClick = (userId: string) => {
    setPasswordResettingUserId(userId);
    setShowPasswordResetConfirm(true);
  };

  const handlePasswordResetConfirm = async () => {
    if (!passwordResettingUserId) return;
    setFormLoading(true);
    try {
      await api.post(`/auth/users/${passwordResettingUserId}/reset-password`);
      addToast('Password reset initiated successfully.', 'success');
      setShowPasswordResetConfirm(false);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      addToast(`Password reset failed: ${msg}`, 'error');
    } finally {
      setFormLoading(false);
      setPasswordResettingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter(user => user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(user => roleFilter ? user.roles.some(r => r.name === roleFilter) : true)
      .filter(user => statusFilter ? user.is_active.toString() === statusFilter : true);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  if (!(hasAnyRole([UserRoleEnum.Admin, UserRoleEnum.ITHead, UserRoleEnum.SuperAdmin]))) {
    return (
      <PageContainer title="User & Role Management" subtitle="Access Restricted">
        <p className="text-alert-critical flex items-center p-4 bg-red-900/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 mr-2" />
          You do not have permission to manage users.
        </p>
      </PageContainer>
    );
  }

  return (
    <>
      <Head>
        <title>User Management | SentinelFi</title>
      </Head>
      <PageContainer
        title="User & Role Management"
        subtitle="Global control over user accounts and Role-Based Access Control (RBAC)."
        headerContent={<Users className="w-8 h-8 text-brand-primary/80" />}
      >
        <Card> {/* Removed noPadding */}
          <div className="p-4 border-b border-gray-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex-grow flex items-center gap-4">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                          type="text"
                          placeholder="Search by email..."
                          value={searchTerm}
                          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                          className="pl-10 p-2 w-full sm:w-64 bg-brand-dark/50 border border-gray-600 rounded-lg shadow-sm text-white focus:ring-brand-primary focus:border-brand-primary"
                      />
                  </div>
                  <select
                      value={roleFilter}
                      onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                      className="p-2 bg-brand-dark/50 border border-gray-600 rounded-lg text-white appearance-none focus:ring-brand-primary focus:border-brand-primary"
                  >
                      <option value="">All Roles</option>
                      {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
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
              <button onClick={() => setShowCreateModal(true)} className="flex items-center px-4 py-2 bg-brand-primary rounded-lg font-semibold hover:bg-brand-primary/80 transition disabled:opacity-50" disabled={formLoading}>
                  <Plus className="w-5 h-5 mr-2" /> Create New User
              </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-brand-dark/50">
                <tr>
                  {['Email', 'Current Role', 'Status', 'Tenant', 'Actions'].map(header => (
                     <th key={header} className={`px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${header === 'Actions' ? 'text-right' : ''}`}>
                       {header}
                     </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-400"><div className="flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading user data...</div></td></tr>
                ) : paginatedUsers.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No users found matching your criteria.</td></tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingUserId === user.id ? (
                          <select value={editedRole} onChange={(e) => setEditedRole(e.target.value as UserRoleEnum)} className="bg-brand-dark border border-gray-600 rounded-md p-1 text-white focus:ring-brand-primary focus:border-brand-primary" disabled={user.roles.some(r => r.name === UserRoleEnum.Admin) || formLoading}>
                            {allRoles.map(role => <option key={role} value={role}>{role}</option>)}
                          </select>
                        ) : ( <span className="text-brand-primary/80 font-medium">{user.roles[0]?.name || 'N/A'}</span> )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingUserId === user.id ? (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-alert-positive text-green-900' : 'bg-red-500/50 text-red-200'}`}>
                                {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                        ) : (
                            <Switch checked={user.is_active} onChange={() => handleStatusToggle(user.id, user.is_active)} disabled={user.roles.some(r => r.name === UserRoleEnum.Admin) || formLoading} />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                         {editingUserId === user.id ? (
                            <select value={editedTenantId || ''} onChange={(e) => setEditedTenantId(e.target.value || null)} className="bg-brand-dark border border-gray-600 rounded-md p-1 text-white focus:ring-brand-primary focus:border-brand-primary" disabled={! (hasAnyRole([UserRoleEnum.SuperAdmin])) || formLoading}>
                              <option value="">-- System User --</option>
                              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                         ) : ( <span className="text-gray-400">{user.tenant_name || 'System User'}</span> )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingUserId === user.id ? (
                          <div className="flex items-center justify-end space-x-4">
                            <button onClick={() => handleSaveUser(user.id)} disabled={formLoading || user.roles.some(r => r.name === UserRoleEnum.Admin)} className="text-alert-positive hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed" title="Save Changes"><Save className="w-5 h-5" /></button>
                            <button onClick={() => setEditingUserId(null)} disabled={formLoading} className="text-gray-400 hover:text-white disabled:opacity-50" title="Cancel"><X className="w-5 h-5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-4">
                            <button onClick={() => handlePasswordResetClick(user.id)} className="text-gray-400 hover:text-brand-primary transition disabled:opacity-50" disabled={formLoading} title="Reset Password"><KeyRound className="w-5 h-5" /></button>
                            <button onClick={() => handleEditClick(user)} className="text-gray-400 hover:text-brand-primary transition disabled:opacity-50" disabled={user.roles.some(r => r.name === UserRoleEnum.Admin) || formLoading} title="Edit Role/Tenant"><Edit3 className="w-5 h-5" /></button>
                            <button onClick={() => handleDeleteClick(user.id)} className="text-gray-400 hover:text-red-500 transition disabled:opacity-50" disabled={user.roles.some(r => r.name === UserRoleEnum.Admin) || formLoading} title="Deactivate User"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        )}
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
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || loading} className="px-4 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition disabled:opacity-50">Previous</button>
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages || loading} className="px-4 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition disabled:opacity-50">Next</button>
                  </div>
              </div>
          )}
        </Card>
      </PageContainer>
      
      <CreateUserModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateUser} loading={formLoading} error={createError} roles={allRoles} tenants={tenants} isSuperAdmin={hasAnyRole([UserRoleEnum.SuperAdmin])} />
      
      <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          loading={formLoading}
          title="Confirm User Deactivation"
          message={<p>Are you sure you want to deactivate user <strong>{users.find(u => u.id === deletingUserId)?.email}</strong>? They will no longer be able to log in.</p>}
          onConfirm={handleDeleteConfirm}
          confirmText="Deactivate"
          confirmVariant="danger"
      />

      <ConfirmationModal
          isOpen={showPasswordResetConfirm}
          onClose={() => setShowPasswordResetConfirm(false)}
          loading={formLoading}
          title="Confirm Password Reset"
          message={<p>This will send a password reset link to <strong>{users.find(u => u.id === passwordResettingUserId)?.email}</strong>. Are you sure?</p>}
          onConfirm={handlePasswordResetConfirm}
          confirmText="Send Reset Link"
      />
    </>
  );
};

export default UserManagementPage;
