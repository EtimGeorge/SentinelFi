import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import useToast from '../../store/toastStore';
import { 
  Settings, Save, Server, Mail, Shield, Database, 
  Plug, User as UserIcon, Activity, Key, Globe, 
  Lock, RefreshCw, AlertTriangle
} from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Switch from '../../components/common/Switch';
import { SettingsEntity, UpdateSettingsDto, SendTestEmailDto } from '@shared/types/settings';
import useSuperAdminSettings from '../../components/hooks/useSuperAdminSettings';
import { Spinner } from '../../components/common/Spinner';
import { AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../components/context/AuthContext';
import { NextPageWithLayout } from '../_app';

type TabType = 'general' | 'integrations' | 'security' | 'profile';

const SuperAdminSettingsPage: NextPageWithLayout = () => {
  const addToast = useToast(state => state.addToast);
  const { user: currentUser } = useAuth();
  const { settings, loading, error, updateSettings, refetch } = useSuperAdminSettings();

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [localSettings, setLocalSettings] = useState<SettingsEntity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
    if (currentUser) {
      setProfileForm(prev => ({
        ...prev,
        firstName: currentUser.first_name || '',
        lastName: currentUser.last_name || '',
        email: currentUser.email || ''
      }));
    }
  }, [settings, currentUser]);

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    setIsSaving(true);
    try {
      const dto: UpdateSettingsDto = {
        maintenanceMode: localSettings.maintenanceMode,
        allowNewRegistrations: localSettings.allowNewRegistrations,
        defaultUserQuota: localSettings.defaultUserQuota,
        defaultStorageQuotaGB: localSettings.defaultStorageQuotaGB,
        smtpServer: localSettings.smtpServer,
        smtpPort: localSettings.smtpPort,
        smtpUser: localSettings.smtpUser,
        smtpPass: localSettings.smtpPass,
        supportEmail: localSettings.supportEmail,
        auditRetentionDays: localSettings.auditRetentionDays,
        sessionTimeoutMinutes: localSettings.sessionTimeoutMinutes,
        enableGlobalMfa: localSettings.enableGlobalMfa,
        // Phase 6 Integrations
        sendgridApiKey: localSettings.sendgridApiKey,
        erpProvider: localSettings.erpProvider,
        erpApiKey: localSettings.erpApiKey,
        erpBaseUrl: localSettings.erpBaseUrl,
      };
      await updateSettings(dto);
      addToast('System settings synchronized successfully.', 'success');
    } catch (e) {
      addToast('Failed to apply system configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      addToast('New passwords do not match.', 'error');
      return;
    }
    if ((profileForm.email !== currentUser?.email || profileForm.newPassword) && !profileForm.currentPassword) {
      addToast('Current password is required to update sensitive account details.', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      await api.patch('/super/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        email: profileForm.email,
        currentPassword: profileForm.currentPassword,
        newPassword: profileForm.newPassword || undefined
      });
      addToast('Your Profile has been updated. You may need to re-login if you changed your email.', 'success');
      setProfileForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (e: any) {
      addToast(e.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleTestEmail = async () => {
    if (!localSettings?.supportEmail) {
      addToast('Provide a support email for testing.', 'error');
      return;
    }
    setIsSendingTestEmail(true);
    try {
      const dto: SendTestEmailDto = { to: localSettings.supportEmail };
      const response = await api.post('/super/settings/test-email', dto);
      addToast(response.data.message, 'success');
    } catch (e: any) {
      addToast(e.response?.data?.message || 'Test email delivery failed.', 'error');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const updateConfig = (key: keyof SettingsEntity, value: any) => {
    setLocalSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  if (loading) return (
    <PageContainer title="Platform Command Center" subtitle="Configuring global engine parameters..." headerContent={<Settings className="w-8 h-8 text-brand-primary animate-spin-slow" />}>
      <div className="flex justify-center items-center h-64"><Spinner /></div>
    </PageContainer>
  );

  if (error || !localSettings) return (
    <PageContainer title="Platform Command Center" subtitle="Connectivity failure detected." headerContent={<Lock className="w-8 h-8 text-red-500" />}>
      <div className="flex flex-col items-center justify-center h-64 bg-red-900/10 rounded-xl border border-red-500/20">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-400 font-bold">CRITICAL: Failed to load system settings.</p>
        <Button onClick={refetch} className="mt-4" variant="secondary"><RefreshCw className="w-4 h-4 mr-2" /> Re-initialize</Button>
      </div>
    </PageContainer>
  );

  const TabButton: React.FC<{ id: TabType; label: string; icon: any }> = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-all duration-200 ${
        activeTab === id 
          ? 'border-brand-primary text-brand-primary bg-brand-primary/5 font-bold' 
          : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <Head><title>Platform Governance | SentinelFi</title></Head>

      <PageContainer
        title="Settings & Governance"
        subtitle="Full-stack control over platform behavior, external bridges, and security."
        headerContent={<Settings className="w-8 h-8 text-brand-primary/80" />}
      >
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-800 bg-gray-900/80 sticky top-0 z-10 backdrop-blur-sm">
            <TabButton id="general" label="General" icon={Globe} />
            <TabButton id="integrations" label="Integrations" icon={Plug} />
            <TabButton id="security" label="Security" icon={Shield} />
            <TabButton id="profile" label="My Account" icon={UserIcon} />
          </div>

          <div className="p-8">
            {activeTab === 'general' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card title="Traffic Control" headerContent={<Shield className="w-5 h-5 text-brand-primary" />}>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                        <div>
                          <h4 className="text-white font-medium">Maintenance Mode</h4>
                          <p className="text-xs text-gray-500 mt-1">Locks out all users except SuperAdmins.</p>
                        </div>
                        <Switch checked={localSettings.maintenanceMode} onChange={() => updateConfig('maintenanceMode', !localSettings.maintenanceMode)} />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                        <div>
                          <h4 className="text-white font-medium">Auto-Enrollment</h4>
                          <p className="text-xs text-gray-500 mt-1">Enable public tenant sign-up portal.</p>
                        </div>
                        <Switch checked={localSettings.allowNewRegistrations} onChange={() => updateConfig('allowNewRegistrations', !localSettings.allowNewRegistrations)} />
                      </div>
                    </div>
                  </Card>

                  <Card title="Resource Constraints" headerContent={<Server className="w-5 h-5 text-brand-secondary" />}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Default User Seat Limit</label>
                        <Input type="number" value={localSettings.defaultUserQuota} onChange={(e) => updateConfig('defaultUserQuota', parseInt(e.target.value))} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Default Storage Cap (GB)</label>
                        <Input type="number" value={localSettings.defaultStorageQuotaGB} onChange={(e) => updateConfig('defaultStorageQuotaGB', parseInt(e.target.value))} />
                      </div>
                    </div>
                  </Card>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={isSaving} className="px-8"><Save className="w-4 h-4 mr-2" /> Sync General Config</Button>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card title="DCS & SMTP Configuration" headerContent={<Mail className="w-5 h-5 text-orange-400" />}>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Platform SendGrid API Key (Phase 6)</label>
                        <Input 
                          type="password" 
                          placeholder="SG.xxxxxx" 
                          value={localSettings.sendgridApiKey || ''} 
                          onChange={(e) => updateConfig('sendgridApiKey', e.target.value)} 
                        />
                      </div>
                      <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 border border-dashed border-gray-700 rounded-lg">
                        <div className="col-span-2 text-xs text-gray-500 font-bold uppercase mb-2">SMTP Fallback (Legacy)</div>
                        <Input placeholder="SMTP Host" value={localSettings.smtpServer || ''} onChange={(e) => updateConfig('smtpServer', e.target.value)} />
                        <Input placeholder="Port" type="number" value={localSettings.smtpPort || ''} onChange={(e) => updateConfig('smtpPort', parseInt(e.target.value))} />
                        <Input placeholder="User" value={localSettings.smtpUser || ''} onChange={(e) => updateConfig('smtpUser', e.target.value)} />
                        <Input placeholder="Pass" type="password" value={localSettings.smtpPass || ''} onChange={(e) => updateConfig('smtpPass', e.target.value)} />
                      </div>
                   </div>
                   <div className="mt-4 flex space-x-4">
                      <Button variant="secondary" onClick={handleTestEmail} disabled={isSendingTestEmail} size="sm">
                        {isSendingTestEmail ? 'Testing Tunnel...' : 'Verify Connectivity'}
                      </Button>
                   </div>
                </Card>

                <Card title="ERP Bridge (Enterprise)" headerContent={<Plug className="w-5 h-5 text-brand-primary" />}>
                   <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">ERP Provider</label>
                          <select 
                            className="w-full bg-brand-dark/50 border border-gray-700 rounded-lg p-2 text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            value={localSettings.erpProvider || 'Manual'}
                            onChange={(e) => updateConfig('erpProvider', e.target.value)}
                          >
                             <option value="Manual">Manual Entry (No Sync)</option>
                             <option value="SAP">SAP S/4HANA</option>
                             <option value="MSD">Microsoft Dynamics 365</option>
                             <option value="OD">Odoo Enterprise</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">API Base URL</label>
                          <Input value={localSettings.erpBaseUrl || ''} onChange={(e) => updateConfig('erpBaseUrl', e.target.value)} placeholder="https://api.erp.domain.com" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Integration API Key</label>
                        <Input type="password" value={localSettings.erpApiKey || ''} onChange={(e) => updateConfig('erpApiKey', e.target.value)} placeholder="Secret Token" />
                      </div>
                   </div>
                </Card>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={isSaving} className="px-8"><Save className="w-4 h-4 mr-2" /> Apply Integration Logic</Button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card title="System-Wide Security Policies" headerContent={<Shield className="w-5 h-5 text-red-500" />}>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                         <div className="flex items-center justify-between">
                            <div>
                               <h4 className="text-white font-medium">Global MFA Enforcement</h4>
                               <p className="text-xs text-gray-500">Requires ALL users to use 2FA.</p>
                            </div>
                            <Switch checked={localSettings.enableGlobalMfa} onChange={() => updateConfig('enableGlobalMfa', !localSettings.enableGlobalMfa)} />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center">
                              <Activity className="w-3 h-3 mr-1" />
                              Audit Retention (Days)
                            </label>
                            <Input type="number" value={localSettings.auditRetentionDays} onChange={(e) => updateConfig('auditRetentionDays', parseInt(e.target.value))} />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Global Session Idle Timeout (Min)</label>
                            <Input type="number" value={localSettings.sessionTimeoutMinutes} onChange={(e) => updateConfig('sessionTimeoutMinutes', parseInt(e.target.value))} />
                         </div>
                      </div>
                      <div className="bg-yellow-500/5 border border-yellow-500/10 p-6 rounded-xl">
                         <h4 className="text-yellow-500 font-bold flex items-center mb-4">
                           <AlertTriangle className="w-5 h-5 mr-2" />
                           Platform Integrity Warn
                         </h4>
                         <p className="text-sm text-gray-400 leading-relaxed border-l-2 border-yellow-500/30 pl-4 py-2 italic font-serif">
                           Changing global security policies will invalidate all active sessions. 
                           Tenants will be required to re-authenticate under the new compliance rules immediately.
                         </p>
                         <div className="mt-6 flex items-center text-xs text-gray-500 uppercase font-bold tracking-widest gap-2 opacity-60">
                            <Lock className="w-3 h-3" />
                            Immutable Trail Level: High
                         </div>
                      </div>
                   </div>
                </Card>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={isSaving} variant="danger" className="px-8"><Shield className="w-4 h-4 mr-2" /> Enforce Security Update</Button>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Personal Contact Details */}
                  <div className="lg:col-span-2">
                    <Card title="Account Profile" headerContent={<UserIcon className="w-5 h-5 text-brand-primary" />}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">First Name</label>
                          <Input value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Last Name</label>
                          <Input value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Official Email</label>
                          <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Password Management */}
                  <div className="lg:col-span-1">
                    <Card title="Credentials" borderTopColor="alert">
                       <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">New Password (Empty to keep)</label>
                            <Input type="password" value={profileForm.newPassword} onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Confirm New</label>
                            <Input type="password" value={profileForm.confirmPassword} onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })} />
                          </div>
                       </div>
                    </Card>
                  </div>

                  <div className="lg:col-span-3 bg-brand-primary/5 p-6 rounded-xl border border-brand-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <h4 className="text-white font-bold flex items-center mb-1">
                        <Key className="w-4 h-4 mr-2" />
                        Verification Required
                      </h4>
                      <p className="text-xs text-gray-500 max-w-lg">
                        To commit changes to your email or password, you must verify your identity with your current session password.
                      </p>
                    </div>
                    <div className="w-full md:w-64">
                         <Input 
                            type="password" 
                            placeholder="Current Password" 
                            value={profileForm.currentPassword} 
                            onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })} 
                          />
                    </div>
                    <div>
                        <Button 
                          onClick={handleSaveProfile} 
                          disabled={isSavingProfile} 
                          className="w-full md:w-auto"
                        >
                          {isSavingProfile ? 'Confirming...' : 'Update My Profile'}
                        </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default SuperAdminSettingsPage;
