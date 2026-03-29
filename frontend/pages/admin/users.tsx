import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
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
  Activity, 
  MoreHorizontal,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Filter,
  Download,
  Trash,
  RotateCw,
  MoreVertical,
  UserX
} from 'lucide-react';
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext';
import { User, ICreateUserPayload, IUpdateUserPayload } from '@shared/types/user';
import { Role } from '@shared/types/role.enum';
import useToast from '../../store/toastStore';
import Switch from '../../components/common/Switch';
import Modal from '../../components/common/Modal'; 
import { isCorporateEmail } from '@shared/utils/validation';
const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isSuperAdminActor = useMemo(() => currentUser?.roles?.some(r => (typeof r === 'string' ? r === Role.SuperAdmin : r.name === Role.SuperAdmin)), [currentUser]);

  const availableRoles = useMemo(() => {
    const allRoles = Object.values(Role);
    if (isSuperAdminActor) return allRoles;
    return allRoles.filter(r => r !== Role.SuperAdmin);
  }, [isSuperAdminActor]);

  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Selection state for bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Modals / Editing state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // Form states
  const [createForm, setCreateForm] = useState<ICreateUserPayload>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    role: Role.OperationalDirector, // Default role
    tenant_id: currentUser?.tenant_id || '',
    is_active: true
  });

  const [editForm, setEditForm] = useState<Partial<IUpdateUserPayload>>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    role: undefined
  });

  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusToggle = async (user: User) => {
    setFormLoading(true);
    try {
      await api.patch(`/auth/users/${user.id}`, { is_active: !user.is_active });
      addToast(`User ${user.email} ${!user.is_active ? 'activated' : 'deactivated'} successfully.`, 'success');
      fetchUsers();
    } catch (e: any) {
      addToast(`Action failed: ${e.message}`, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedUserIds.length === 0) return;
    if (!confirm(`Are you sure you want to deactivate ${selectedUserIds.length} users?`)) return;

    setFormLoading(true);
    try {
      const res = await api.patch('/auth/users/batch', {
        ids: selectedUserIds,
        update: { is_active: false }
      });
      addToast(`Successfully deactivated ${res.data.updated} users.`, 'success');
      setSelectedUserIds([]);
      fetchUsers();
    } catch (e: any) {
      addToast(`Bulk operation failed: ${e.message}`, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
      if (!confirm("Are you sure you want to PERMANENTLY delete this operator? This action is archived but irreversible.")) return;
      setFormLoading(true);
      try {
          await api.delete(`/auth/users/${id}`);
          addToast("Operator purged from active registry.", "success");
          fetchUsers();
      } catch (e: any) {
          addToast(`Purge failed: ${e.message}`, "error");
      } finally {
          setFormLoading(false);
      }
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.first_name) {
      addToast('Please fill in all required fields.', 'error');
      return;
    }
    setFormLoading(true);
    try {
      if (!isCorporateEmail(createForm.email)) {
        addToast('SentinelFi requires a corporate email address for all operators.', 'error');
        setFormLoading(false);
        return;
      }

      // Transition to invitation flow
      await api.post('/billing/invite', {
        email: createForm.email,
        role: createForm.role,
        firstName: createForm.first_name,
        lastName: createForm.last_name,
      });
      addToast(`Invitation sent to ${createForm.email} successfully.`, 'success');
      setIsCreateModalOpen(false);
      setCreateForm({
        email: '', username: '', first_name: '', last_name: '', password: '', role: Role.OperationalDirector, 
        tenant_id: currentUser?.tenant_id || '', is_active: true
      });
      fetchUsers();
    } catch (e: any) {
      addToast(`Invitation failed: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setFormLoading(true); // Keep loading state until refresh if needed, but here we set false
      setFormLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setFormLoading(true);
    try {
      await api.patch(`/auth/users/${editingUser.id}`, editForm as any);
      addToast(`Authority updated for ${editingUser.email}.`, 'success');
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      addToast(`Update failed: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userToReset) return;
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }
    if (resetPasswordForm.newPassword.length < 6) {
      addToast('Password too weak (min 6 chars).', 'error');
      return;
    }
    setFormLoading(true);
    try {
      await api.patch(`/auth/users/${userToReset.id}`, { password: resetPasswordForm.newPassword });
      addToast(`Security credentials reset for ${userToReset.email}.`, 'success');
      setIsResetModalOpen(false);
      setUserToReset(null);
      setResetPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      addToast(`Reset failed: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter(user => user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(user => roleFilter ? user.roles.some(r => r.name === roleFilter) : true);
  }, [users, searchTerm, roleFilter]);

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  return (
    <>
      <Head>
        <title>Team & Access Control | SentinelFi</title>
      </Head>
      <PageContainer
        title="Team & Access Control"
        subtitle="Manage identities, enforce RBAC policies, and monitor team security posture."
        headerContent={<Users className="w-8 h-8 text-brand-primary/80" />}
      >
        <div className="space-y-6">
          {/* Elite Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <MetricCard 
              label="Active Operators" 
              value={users.filter(u => u.is_active).length.toString()} 
              icon={UserCheck} 
              color="text-green-400" 
            />
            <MetricCard 
              label="Service Accounts" 
              value="3" 
              icon={Activity} 
              color="text-brand-primary" 
            />
            <MetricCard 
              label="Auth Latency" 
              value="42ms" 
              icon={ShieldCheck} 
              color="text-blue-400" 
            />
            <MetricCard 
              label="Security Posture" 
              value="Shielded" 
              icon={ShieldAlert} 
              color="text-brand-primary" 
            />
          </div>

          <Card className="overflow-hidden border-gray-800 shadow-2xl bg-brand-dark/20 backdrop-blur-sm">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4 bg-brand-dark/40">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search operators..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 p-2 w-full sm:w-64 bg-brand-dark/50 border border-gray-700 rounded-xl text-sm text-white focus:ring-brand-primary transition-all focus:border-brand-primary outline-none"
                  />
                </div>
                <select 
                   value={roleFilter}
                   onChange={(e) => setRoleFilter(e.target.value)}
                   className="p-2 w-full sm:w-auto bg-brand-dark/50 border border-gray-700 rounded-xl text-xs text-gray-300 focus:ring-brand-primary outline-none cursor-pointer"
                >
                    <option value="">All Authorities</option>
                    {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                {selectedUserIds.length > 0 && (
                  <div className="flex items-center gap-2 mr-0 sm:mr-4 border-b sm:border-b-0 sm:border-r border-gray-700 pb-2 sm:pb-0 sm:pr-4 animate-in fade-in slide-in-from-right-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-brand-primary uppercase tracking-tighter">{selectedUserIds.length} Selected</span>
                    <button 
                      onClick={handleBulkDeactivate}
                      className="p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition border border-red-900/30 flex items-center gap-2" 
                      disabled={formLoading}
                    >
                      <UserX className="w-4 h-4" />
                      <span className="text-[10px] font-bold">DEACTIVATE</span>
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center justify-center px-4 py-2 bg-brand-primary rounded-xl font-bold hover:bg-brand-primary/80 transition text-sm text-brand-dark shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)] whitespace-nowrap w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Operator
                </button>
              </div>
            </div>

            <div className="overflow-x-auto relative min-h-[400px]">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-brand-dark/40">
                  <tr>
                    <th className="px-6 py-4 text-left w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-700 bg-brand-dark text-brand-primary focus:ring-brand-primary cursor-pointer w-4 h-4"
                      />
                    </th>
                    {['Identity', 'Authority Level', 'Active Duty', 'Security Signal', 'Actions'].map(header => (
                      <th key={header} className={`px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ${header === 'Actions' ? 'sticky right-0 bg-brand-dark/95 z-10 shadow-[-10px_0_15px_rgba(0,0,0,0.5)]' : ''}`}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loading ? (
                    <tr><td colSpan={6} className="p-16 text-center text-gray-500"><Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-brand-primary/50" /><span className="font-mono text-xs uppercase tracking-widest">Decrypting Identity Registry...</span></td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} className="p-16 text-center text-gray-600 font-medium">No operators matched the security filters.</td></tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className={`group hover:bg-brand-primary/5 transition-colors duration-300 ${selectedUserIds.includes(user.id) ? 'bg-brand-primary/10' : ''}`}>
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                            className="rounded border-gray-700 bg-brand-dark text-brand-primary focus:ring-brand-primary cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center min-w-[200px]">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-gray-800 to-brand-dark flex items-center justify-center mr-4 border border-gray-700 group-hover:border-brand-primary/50 transition-all shadow-lg">
                              <span className="text-sm md:text-lg font-black text-gray-500 group-hover:text-brand-primary transition-colors">{user.email[0].toUpperCase()}</span>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors flex flex-wrap items-center gap-2">
                                {user.email}
                                {user.id === currentUser?.id && <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/20 leading-none">YOU</span>}
                              </div>
                              <div className="hidden sm:block text-[10px] font-mono text-gray-600 mt-1 uppercase tracking-tight">SEC_ID: {user.id.slice(0, 12)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 truncate max-w-[150px]">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2.5 py-1 text-[9px] font-black rounded border inline-block w-fit uppercase tracking-tighter ${
                                user.roles.some(r => r.name === Role.AdminDirector) ? 'border-orange-500/30 text-orange-500 bg-orange-500/5' :
                                user.roles.some(r => r.name === Role.CEO) ? 'border-brand-primary/30 text-brand-primary bg-brand-primary/5' :
                                'border-gray-700 text-gray-400 bg-gray-800'
                            }`}>
                                {user.roles[0]?.name || 'RESTRICTED'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Switch 
                              checked={user.is_active} 
                              onChange={() => handleStatusToggle(user)} 
                              disabled={formLoading || user.id === currentUser?.id}
                            />
                            <span className={`ml-3 text-[10px] font-black uppercase tracking-widest ${user.is_active ? 'text-green-500' : 'text-red-500/60'}`}>
                              {user.is_active ? 'ENABLED' : 'LOCKED'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 min-w-[120px]">
                             <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500/30'}`} />
                             <span className="text-[10px] text-gray-500 font-mono font-bold tracking-tight uppercase">Authenticated</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right sticky right-0 bg-brand-dark/95 group-hover:bg-brand-primary/10 transition-colors z-10 backdrop-blur-md shadow-[-10px_0_15px_rgba(0,0,0,0.5)]">
                          <div className="flex items-center justify-end space-x-1">
                            <button 
                               onClick={() => { setUserToReset(user); setIsResetModalOpen(true); }}
                               className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition" 
                               title="Security Override"
                            >
                                <KeyRound className="w-4 h-4" />
                            </button>
                            <button 
                               onClick={() => { 
                                 setEditingUser(user); 
                                 setEditForm({ 
                                   email: user.email, 
                                   username: user.username || '',
                                   first_name: user.first_name || '', 
                                   last_name: user.last_name || '', 
                                   role: user.roles[0]?.name as Role 
                                 }); 
                                 setIsEditModalOpen(true); 
                               }}
                               className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition" 
                               title="Edit Authority"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                               onClick={() => handleDeleteUser(user.id)}
                               className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" 
                               title="Purge Identity"
                               disabled={user.id === currentUser?.id}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Footer / Pagination placeholder */}
            <div className="p-4 bg-brand-dark/40 border-t border-gray-800 flex items-center justify-between">
                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Registry Version 2.6.43-STABLE</span>
                <div className="flex items-center gap-2">
                    <button className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-500 hover:text-white transition disabled:opacity-30" disabled>PREV</button>
                    <button className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition">NEXT</button>
                </div>
            </div>
          </Card>
          
          {/* Security Advisory */}
          <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 flex items-start gap-4">
              <div className="p-2 bg-brand-primary/20 rounded-xl text-brand-primary">
                  <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                  <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest leading-none mb-1">Security Directive</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-medium">Tenant isolation is enforced at the network and application layer. Any attempt to modify cross-tenant identity records will trigger a high-priority architectural alert to the SuperAdmin team.</p>
              </div>
          </div>
        </div>
      </PageContainer>

      {/* --- ELITE MODALS --- */}

      {/* Registration Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register New Operator"
        size="lg"
        footer={(
          <div className="flex justify-end space-x-3 w-full">
            <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold transition">Cancel</button>
            <button onClick={handleCreateUser} disabled={formLoading} className="px-6 py-2 bg-brand-primary text-brand-dark rounded-xl font-black text-sm hover:scale-105 transition active:scale-95 flex items-center gap-2 shadow-lg shadow-brand-primary/20">
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              SEND INVITATION
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">First Name</label>
              <input 
                type="text" 
                value={createForm.first_name}
                onChange={(e) => setCreateForm({...createForm, first_name: e.target.value})}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-brand-primary transition"
                placeholder="John" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Last Name</label>
              <input 
                type="text" 
                value={createForm.last_name || ''}
                onChange={(e) => setCreateForm({...createForm, last_name: e.target.value})}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-brand-primary transition"
                placeholder="Doe" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Identity (Email)</label>
              <input 
                type="email" 
                value={createForm.email}
                onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-brand-primary transition"
                placeholder="operator@sentinelfi.com" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Identity (Username)</label>
              <input 
                type="text" 
                value={createForm.username || ''}
                onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-brand-primary transition"
                placeholder="op_doe" 
              />
            </div>
          </div>
          <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
            <p className="text-[11px] text-gray-300 leading-relaxed italic">
              Operators will receive a secure magic link to set up their own password and finalize their account.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Authority Level (Role)</label>
            <select 
              value={createForm.role}
              onChange={(e) => setCreateForm({...createForm, role: e.target.value as Role})}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-brand-primary transition cursor-pointer"
            >
              {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/10">
              <p className="text-[10px] text-gray-400 font-medium font-mono">ENROLLMENT_TENANT: <span className="text-brand-primary font-bold">{currentUser?.tenant_id}</span></p>
          </div>
        </div>
      </Modal>

      {/* Edit Authority Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modify Authority & Identity"
        size="md"
        footer={(
          <div className="flex justify-end space-x-3 w-full">
            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold transition">Cancel</button>
            <button onClick={handleUpdateUser} disabled={formLoading} className="px-6 py-2 bg-brand-primary text-brand-dark rounded-xl font-black text-sm hover:scale-105 transition active:scale-95 flex items-center gap-2 shadow-lg shadow-brand-primary/20">
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              UPDATE REGISTRY
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Update Identity (Email)</label>
               <input 
                 type="text" 
                 value={editForm.email || ''}
                 onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                 className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-brand-primary transition"
               />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Update Identity (Username)</label>
               <input 
                 type="text" 
                 value={editForm.username || ''}
                 onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                 className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-brand-primary transition"
               />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">First Name</label>
              <input 
                type="text" 
                value={editForm.first_name || ''}
                onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-brand-primary transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Last Name</label>
              <input 
                type="text" 
                value={editForm.last_name || ''}
                onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-brand-primary transition"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Authority Level</label>
            <select 
              value={editForm.role}
              onChange={(e) => setEditForm({...editForm, role: e.target.value as Role})}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-brand-primary transition cursor-pointer"
            >
              {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="p-3 bg-alert-warning/5 rounded-xl border border-alert-warning/10 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-alert-warning shrink-0" />
              <p className="text-[10px] text-gray-400 font-medium">Changing an operator's identity will invalidate their active session tokens.</p>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Security Credential Override"
        size="md"
        footer={(
          <div className="flex justify-end space-x-3 w-full">
            <button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold transition">Cancel</button>
            <button onClick={handleResetPassword} disabled={formLoading || !resetPasswordForm.newPassword} className="px-6 py-2 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 transition active:scale-95 flex items-center gap-2 shadow-lg shadow-red-600/20">
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
              FORCE CREDENTIAL UPDATE
            </button>
          </div>
        )}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-900/10 border border-red-900/30 rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-red-500 shrink-0" />
              <div>
                  <h4 className="text-xs font-black text-red-500 uppercase tracking-tighter">Identity Protection Override</h4>
                  <p className="text-[10px] text-gray-500 font-medium mt-1">Manual credential reset for <span className="text-white font-bold">{userToReset?.email}</span>. Operation logged in audit registry.</p>
              </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">New Secure Password</label>
              <input 
                type="password" 
                value={resetPasswordForm.newPassword}
                onChange={(e) => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition"
                placeholder="••••••••" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Confirm Credentials</label>
              <input 
                type="password" 
                value={resetPasswordForm.confirmPassword}
                onChange={(e) => setResetPasswordForm({...resetPasswordForm, confirmPassword: e.target.value})}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition"
                placeholder="••••••••" 
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

const MetricCard: React.FC<{ label: string, value: string, icon: any, color: string }> = ({ label, value, icon: Icon, color }) => (
  <Card className="border-l-4 border-l-brand-primary/30 group hover:border-l-brand-primary transition-all duration-300">
    <div className="flex items-center">
      <div className={`p-4 rounded-2xl bg-gray-800/50 mr-4 group-hover:scale-110 transition-transform duration-500`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white mt-0.5 tracking-tight group-hover:text-brand-primary transition-colors">{value}</p>
      </div>
    </div>
  </Card>
);

export default UserManagementPage;
