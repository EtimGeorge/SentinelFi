import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { Users, Plus, X, Edit3, Save, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext';
import { User, CreateUserDto, UpdateUserDto } from '../../../shared/types/user';
import { Role } from '../../../shared/types/role.enum';

// Interface for Tenant (simplified for dropdown)
interface TenantOption {
  id: string;
  name: string; // The human-readable tenant name
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (userData: CreateUserDto) => void;
  loading: boolean;
  error: string | null;
  roles: Role[];
  tenants: TenantOption[]; // NEW: Pass tenants to the modal
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onCreate, loading, error, roles, tenants }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.AssignedProjectUser);
  const [tenantId, setTenantId] = useState<string | null>(null); // NEW: State for tenantId

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ email, password, role, tenant_id: tenantId }); // Pass tenant_id
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card title="Create New User" borderTopColor="primary" className="w-full max-w-md">
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}
              className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {/* NEW: Tenant selection dropdown */}
          <div>
            <label className="block text-sm font-medium text-white">Assign Tenant (Optional)</label>
            <select value={tenantId || ''} onChange={(e) => setTenantId(e.target.value || null)}
              className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
                <option value="" className="bg-gray-800 text-gray-400">-- No Tenant Assigned (System User) --</option>
                {tenants.map(t => <option key={t.id} value={t.id} className="bg-gray-800">{t.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg text-white hover:bg-gray-500 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-primary rounded-lg text-white hover:bg-brand-primary/90 transition">
              {loading ? <Loader2 className="w-5 h-5 inline animate-spin" /> : 'Create User'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const allRoles = Object.values(Role);

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const api = useSecuredApi();
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]); // NEW: State for tenants
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editedRole, setEditedRole] = useState<Role | string>('');
  const [editedIsActive, setEditedIsActive] = useState<boolean>(true);
  const [editedTenantId, setEditedTenantId] = useState<string | null>(null); // NEW: State for edited tenant
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.get<User[]>('/auth/users');
      setUsers(response.data);
    } catch (e: any) {
      setMessage({ type: 'error', text: `Failed to fetch users: ${e.response?.data?.message || e.message}` });
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchTenants = useCallback(async () => { // NEW: Fetch tenants function
    try {
      const response = await api.get<TenantOption[]>('/admin/tenants');
      setTenants(response.data);
    } catch (e: any) {
      console.error('Failed to fetch tenants:', e);
    }
  }, [api]);

  useEffect(() => {
    if (currentUser?.role === Role.Admin || currentUser?.role === Role.ITHead) {
      fetchUsers();
      fetchTenants(); // Fetch tenants when component mounts
    } else {
      setLoading(false);
      setMessage({ type: 'error', text: 'Access Denied: You do not have permission to view user management.' });
    }
  }, [currentUser, fetchUsers, fetchTenants]);

  const handleCreateUser = async (userData: CreateUserDto) => {
    setFormLoading(true);
    setMessage(null);
    try {
      await api.post<User>('/auth/users', userData);
      setMessage({ type: 'success', text: `User ${userData.email} created successfully!` });
      setShowCreateModal(false);
      fetchUsers();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Creation failed: ${e.response?.data?.message || e.message}` });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setEditedRole(user.role);
    setEditedIsActive(user.is_active);
    setEditedTenantId(user.tenant_id); // NEW: Set edited tenant
    setMessage(null);
  };

  const handleSaveUser = async (userId: string) => {
    if (!editedRole) {
      setMessage({ type: 'error', text: "Role cannot be empty." });
      return;
    }
    setFormLoading(true);
    setMessage(null);
    try {
      const updatePayload: UpdateUserDto = { 
        role: editedRole as Role, 
        is_active: editedIsActive,
        tenant_id: editedTenantId // NEW: Include tenant_id in update payload
      };
      await api.patch<User>(`/auth/users/${userId}`, updatePayload);
      setMessage({ type: 'success', text: `User ${users.find(u => u.id === userId)?.email} updated successfully!` });
      setEditingUserId(null);
      fetchUsers();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Update failed: ${e.response?.data?.message || e.message}` });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (userId: string) => {
    setDeletingUserId(userId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUserId) return;
    setFormLoading(true);
    setMessage(null);
    try {
      await api.delete(`/auth/users/${deletingUserId}`);
      setMessage({ type: 'success', text: `User ${users.find(u => u.id === deletingUserId)?.email} deactivated successfully!` });
      setShowDeleteConfirm(false);
      fetchUsers();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Deactivation failed: ${e.response?.data?.message || e.message}` });
    } finally {
      setFormLoading(false);
      setDeletingUserId(null);
    }
  };

  return (
    <>
      <Head><title>User Management | SentinelFi</title></Head>
      <PageContainer
        title="User & Role Management"
        subtitle="Global control over user accounts and Role-Based Access Control (RBAC) assignments."
        headerContent={<Users className="w-8 h-8 text-alert-critical" />}
      >
        {message && (
          <div className={`p-3 mb-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-900 text-alert-positive' : 'bg-red-900 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {!(currentUser?.role === Role.Admin || currentUser?.role === Role.ITHead) && !loading && (
          <p className="text-alert-critical flex items-center p-4 bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 mr-2" /> Access Denied: You do not have permission to manage users.
          </p>
        )}

        {(currentUser?.role === Role.Admin || currentUser?.role === Role.ITHead) && (
          <Card 
            title="Current System Users"
            headerContent={
              <button 
                onClick={() => setShowCreateModal(true)} 
                className="flex items-center px-4 py-2 bg-brand-primary rounded-lg font-semibold hover:bg-brand-primary/80 transition"
                disabled={formLoading}
              >
                <Plus className="w-5 h-5 mr-2" /> Create New User
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-brand-dark/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Current Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tenant</th> {/* NEW Column */}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {loading ? <tr><td colSpan={6} className="p-4 text-center text-brand-primary flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading user data...</td></tr> : 
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-700/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingUserId === user.id ? (
                            <select 
                              value={editedRole} 
                              onChange={(e) => setEditedRole(e.target.value as Role)}
                              className="bg-brand-dark/50 border border-gray-600 rounded-md p-1 text-white"
                              disabled={user.role === Role.Admin || formLoading}
                            >
                              {allRoles.map(role => (
                                <option key={role} value={role} className="bg-gray-800">{role}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-brand-primary/80">{user.role}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingUserId === user.id ? (
                             <select 
                              value={editedIsActive.toString()}
                              onChange={(e) => setEditedIsActive(e.target.value === 'true')}
                              className="bg-brand-dark/50 border border-gray-600 rounded-md p-1 text-white"
                              disabled={user.role === Role.Admin || formLoading}
                            >
                              <option value="true" className="bg-gray-800">Active</option>
                              <option value="false" className="bg-gray-800">Inactive</option>
                            </select>
                          ) : (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-alert-positive text-green-900' : 'bg-red-500/50 text-red-200'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        {/* NEW: Tenant Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingUserId === user.id ? (
                            <select 
                              value={editedTenantId || ''} 
                              onChange={(e) => setEditedTenantId(e.target.value || null)}
                              className="bg-brand-dark/50 border border-gray-600 rounded-md p-1 text-white"
                              disabled={user.role === Role.Admin || formLoading}
                            >
                              <option value="" className="bg-gray-800 text-gray-400">-- System User --</option>
                              {tenants.map(t => <option key={t.id} value={t.id} className="bg-gray-800">{t.name}</option>)}
                            </select>
                          ) : (
                            <span className="text-gray-300">{user.tenant_name || 'System User'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {editingUserId === user.id ? (
                            <div className="space-x-2">
                              <button onClick={() => handleSaveUser(user.id)} disabled={formLoading || user.role === Role.Admin} className="text-alert-positive hover:text-green-300">
                                {formLoading ? <Loader2 className="w-4 h-4 inline animate-spin" /> : <Save className="w-5 h-5 inline" />} Save
                              </button>
                              <button onClick={() => setEditingUserId(null)} disabled={formLoading} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5 inline" /> Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="space-x-2">
                              <button onClick={() => handleEditClick(user)} className="text-brand-primary hover:text-white transition" disabled={user.role === Role.Admin || formLoading}>
                                <Edit3 className="w-5 h-5 inline" /> Edit
                              </button>
                            <button onClick={() => handleDeleteClick(user.id)} className="text-red-500 hover:text-red-300 transition" disabled={user.role === Role.Admin || formLoading}>
                                <Trash2 className="w-5 h-5 inline" /> Deactivate User
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create User Modal */}
      <CreateUserModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateUser}
        loading={formLoading}
        error={message?.type === 'error' ? message.text : null}
        roles={allRoles}
        tenants={tenants} {/* NEW: Pass tenants to the modal */}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card title="Confirm User Deactivation" borderTopColor="alert" className="w-full max-w-sm">
            <p className="text-white mb-4">Are you sure you want to deactivate user {users.find(u => u.id === deletingUserId)?.email}? They will no longer be able to log in.</p>
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
                {formLoading ? <Loader2 className="w-5 h-5 inline animate-spin" /> : 'Deactivate User'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default UserManagementPage;