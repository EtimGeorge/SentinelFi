import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import useToast from '../../store/toastStore';
import { 
  Settings, Save, Server, Mail, Shield, ShieldCheck, Database, Plug, User as UserIcon, Activity, Key, Globe, Lock, RefreshCw, AlertTriangle
} from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Switch from '../../components/common/Switch';
import { SettingsEntity, UpdateSettingsDto, SendTestEmailDto } from '@shared/types/settings';
import useSuperAdminSettings from '../../components/hooks/useSuperAdminSettings';
import { Spinner } from '../../components/common/Spinner';
import { AlertCircle } from 'lucide-react';
import api, { superAdminMfaApi, SuperAdminMfaStatus, SuperAdminMfaEnrollment } from '../../lib/api';
import { useAuth } from '../../components/context/AuthContext';
import EmailDeliverabilityCard from '../../components/super/EmailDeliverabilityCard';
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
  const [emailStatsRefresh, setEmailStatsRefresh] = useState(0);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', email: '', currentPassword: '', newPassword: '', confirmPassword: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // MFA Self-Service State
  const [mfaStatus, setMfaStatus] = useState<SuperAdminMfaStatus | null>(null);
  const [mfaEnrollment, setMfaEnrollment] = useState<SuperAdminMfaEnrollment | null>(null);
  const [mfaConfirmCode, setMfaConfirmCode] = useState('');
  const [mfaDisablePassword, setMfaDisablePassword] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    superAdminMfaApi
      .getStatus()
      .then(setMfaStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
    if (currentUser) {
      setProfileForm(prev => ({
        ...prev, firstName: currentUser.first_name || '', lastName: currentUser.last_name || '', email: currentUser.email || ''
      }));
    }
  }, [settings, currentUser]);

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    setIsSaving(true);
    try {
      const dto: UpdateSettingsDto = {
        maintenanceMode: localSettings.maintenanceMode, allowNewRegistrations: localSettings.allowNewRegistrations, defaultUserQuota: localSettings.defaultUserQuota, defaultStorageQuotaGB: localSettings.defaultStorageQuotaGB, smtpServer: localSettings.smtpServer, smtpPort: localSettings.smtpPort, smtpUser: localSettings.smtpUser, smtpPass: localSettings.smtpPass, supportEmail: localSettings.supportEmail, auditRetentionDays: localSettings.auditRetentionDays, sessionTimeoutMinutes: localSettings.sessionTimeoutMinutes, enableGlobalMfa: localSettings.enableGlobalMfa, gracePeriodDays: localSettings.gracePeriodDays, archiveRetentionDays: localSettings.archiveRetentionDays,
        // Phase 6 Integrations
        sendgridApiKey: localSettings.sendgridApiKey, erpProvider: localSettings.erpProvider, erpApiKey: localSettings.erpApiKey, erpBaseUrl: localSettings.erpBaseUrl,
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
        firstName: profileForm.firstName, lastName: profileForm.lastName, email: profileForm.email, currentPassword: profileForm.currentPassword, newPassword: profileForm.newPassword || undefined
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
      setEmailStatsRefresh((n) => n + 1);
    } catch (e: any) {
      addToast(e.response?.data?.message || 'Test email delivery failed.', 'error');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const updateConfig = (key: keyof SettingsEntity, value: any) => {
    setLocalSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleStartMfaEnrollment = async () => {
    setMfaLoading(true);
    try {
      const result = await superAdminMfaApi.enroll();
      setMfaEnrollment(result);
      setMfaConfirmCode('');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to start MFA enrollment.', 'error');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmMfaEnrollment = async () => {
    setMfaLoading(true);
    try {
      await superAdminMfaApi.confirm(mfaConfirmCode.trim());
      addToast('Two-factor authentication enabled successfully.', 'success');
      setMfaEnrollment(null);
      setMfaConfirmCode('');
      setMfaStatus(await superAdminMfaApi.getStatus());
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Invalid verification code. Please try again.', 'error');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!mfaDisablePassword) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure you want to disable two-factor authentication? All active sessions will be revoked.')) return;
    setMfaLoading(true);
    try {
      await superAdminMfaApi.disable(mfaDisablePassword);
      addToast('Two-factor authentication disabled. All sessions revoked.', 'success');
      setMfaDisablePassword('');
      setMfaStatus(await superAdminMfaApi.getStatus());
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to disable MFA.', 'error');
    } finally {
      setMfaLoading(false);
    }
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
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden elev-lg">
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
                        <label className="block text-xs font-bold text-gray-500  mb-2">Default User Seat Limit</label>
                        <Input type="number" value={localSettings.defaultUserQuota} onChange={(e) => updateConfig('defaultUserQuota', parseInt(e.target.value))} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500  mb-2">Default Storage Cap (GB)</label>
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
                        <label className="block text-xs font-bold text-gray-500  mb-2">Platform SendGrid API Key (Phase 6)</label>
                        <Input 
                          type="password" 
                          placeholder="SG.xxxxxx" 
                          value={localSettings.sendgridApiKey || ''} 
                          onChange={(e) => updateConfig('sendgridApiKey', e.target.value)} 
                        />
                      </div>
                      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-dashed border-gray-700 rounded-lg">
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

                <EmailDeliverabilityCard refreshKey={emailStatsRefresh} />

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
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Grace Period After Expiry (Days)</label>
                            <Input type="number" value={localSettings.gracePeriodDays} onChange={(e) => updateConfig('gracePeriodDays', Math.max(0, parseInt(e.target.value) || 0))} />
                            <p className="text-xs text-gray-600 mt-1">Expired tenants stay online until grace ends so their admins can renew.</p>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Archive Retention (Days)</label>
                            <Input type="number" value={localSettings.archiveRetentionDays} onChange={(e) => updateConfig('archiveRetentionDays', Math.max(0, parseInt(e.target.value) || 0))} />
                            <p className="text-xs text-gray-600 mt-1">Purge permanently deletes archived tenant data older than this.</p>
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
<div className="mt-6 flex items-center text-xs text-gray-500 uppercase font-bold  gap-2 opacity-60">
                             <Lock className="w-3 h-3" />
                             Immutable Trail Level: High
                          </div>
                       </div>
                    </div>
                 </Card>

                 <Card title="Your Two-Factor Authentication" headerContent={<Key className="w-5 h-5 text-brand-primary" />}>
                    <div className="space-y-6">
                       {mfaStatus && (
                          <div className={`flex items-start gap-3 p-4 rounded-lg ${mfaStatus.mfaEnabled ? 'bg-green-500/5 border border-green-500/10' : 'bg-orange-500/5 border border-orange-500/10'}`}>
                             {mfaStatus.mfaEnabled
                               ? <ShieldCheck className="w-5 h-5 flex-shrink-0 text-green-400" />
                               : <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-400" />}
                             <div>
                                <p className={`text-sm font-medium ${mfaStatus.mfaEnabled ? 'text-green-400' : 'text-orange-400'}`}>
                                  {mfaStatus.mfaEnabled ? 'Two-factor authentication is enabled' : 'Two-factor authentication is NOT enabled'}
                                </p>
                                {mfaStatus.globalMfaRequired && !mfaStatus.mfaEnabled && (
                                  <p className="text-xs text-orange-400/80 mt-1">
                                    Global MFA enforcement is ON — you must enable MFA to continue signing in.
                                  </p>
                                )}
                                {mfaStatus.pendingEnrollment && !mfaStatus.mfaEnabled && (
                                  <p className="text-xs text-brand-primary mt-1">
                                    Enrollment is pending — scan and enter a code below to activate.
                                  </p>
                                )}
                             </div>
                          </div>
                       )}

                       {mfaEnrollment && (
                          <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-lg space-y-4">
                             <div>
                                <h4 className="text-white font-medium flex items-center"><Key className="w-4 h-4 mr-2 text-brand-primary" /> Scan this setup with your authenticator app</h4>
                                <p className="text-xs text-gray-500 mt-1">Open your authenticator app and scan the QR-equivalent link below, or enter the secret manually.</p>
                                <div className="mt-3 p-3 bg-gray-900/60 rounded-lg text-sm">
                                   <p className="text-gray-300 break-all"><span className="text-gray-500 uppercase text-xs font-bold">otpauth:</span> {mfaEnrollment.otpauthUrl}</p>
                                   <p className="text-gray-300 break-all mt-2"><span className="text-gray-500 uppercase text-xs font-bold">Secret:</span> <span className="font-mono">{mfaEnrollment.secret}</span></p>
                                </div>
                             </div>
                             <div className="bg-red-950/30 border border-red-700/30 p-4 rounded-lg">
                                <h4 className="text-red-400 font-medium flex items-center mb-3"><AlertTriangle className="w-4 h-4 mr-2" /> Save your recovery codes now</h4>
                                <p className="text-xs text-gray-400 mb-3">Each code works exactly once. They are your only way back in if you lose your device. Copy them somewhere secure, then confirm below.</p>
                                <div className="font-mono text-sm bg-gray-900/50 p-4 rounded-lg text-gray-200 space-y-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                   {mfaEnrollment.recoveryCodes.map(code => <div key={code} className="flex items-center gap-2"><Lock className="w-3 h-3 text-gray-600 flex-shrink-0" />{code}</div>)}
                                </div>
                             </div>
                             <div className="flex items-end gap-3">
                                <div className="flex-1">
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Confirm code from authenticator</label>
                                   <Input
                                     value={mfaConfirmCode}
                                     onChange={(e) => setMfaConfirmCode(e.target.value.replace(/\D/g, ''))}
                                     maxLength={6}
                                     placeholder="000000"
                                     inputMode="numeric"
                                   />
                                </div>
                                <Button onClick={handleConfirmMfaEnrollment} disabled={mfaLoading || mfaConfirmCode.length !== 6}>
                                  {mfaLoading ? 'Activating...' : 'Activate MFA'}
                                </Button>
                             </div>
                          </div>
                       )}

                       {mfaEnrollment ? (
                          <p className="text-xs text-gray-600">Keep this browser tab open until activation completes.</p>
                       ) : (
                          <div className="flex items-center justify-end gap-3">
                             <Button onClick={handleStartMfaEnrollment} disabled={mfaLoading || !!mfaStatus?.mfaEnabled}>
                               <Key className="w-4 h-4 mr-2" /> {mfaStatus?.pendingEnrollment ? 'Restart Enrollment' : 'Set Up MFA'}
                             </Button>
                          </div>
                       )}

                       {mfaStatus?.mfaEnabled && (
                          <div className="border-t border-gray-700 pt-4 flex items-end gap-3">
                             <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Disable MFA — enter current password</label>
                                <Input
                                  type="password"
                                  value={mfaDisablePassword}
                                  onChange={(e) => setMfaDisablePassword(e.target.value)}
                                  placeholder="Current password"
                                />
                             </div>
                             <Button variant="danger" onClick={handleDisableMfa} disabled={mfaLoading || !mfaDisablePassword}>
                               {mfaLoading ? 'Disabling...' : 'Disable MFA'}
                             </Button>
                          </div>
                       )}
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
                    <Card title="Credentials" accent="alert">
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
