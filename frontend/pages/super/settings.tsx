import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import useToast from '../../store/toastStore';
import { Settings, Save, Server, Mail, Shield, Database } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Switch from '../../components/common/Switch';
import { SettingsEntity, UpdateSettingsDto, SendTestEmailDto } from 'shared/types/settings';
import useSuperAdminSettings from '../../components/hooks/useSuperAdminSettings';
import { Spinner } from '../../components/common/Spinner';
import { AlertCircle } from 'lucide-react';
import api from '../../lib/api'; // Import the API instance

import SuperAdminLayout from '../../components/Layout/SuperAdminLayout'; // Import SuperAdminLayout
import { NextPageWithLayout } from '../_app'; // Import NextPageWithLayout

const SuperAdminSettingsPage: NextPageWithLayout = () => {
  const addToast = useToast(state => state.addToast);
  const { settings, loading, error, updateSettings, refetch } = useSuperAdminSettings();

  const [localSettings, setLocalSettings] = useState<SettingsEntity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false); // New state for test email button

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
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
      };
      await updateSettings(dto);
      addToast('Settings updated successfully.', 'success');
    } catch (e) {
      addToast('Failed to save settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!localSettings?.supportEmail) {
      addToast('Please provide a support email address to send a test email.', 'error');
      return;
    }

    setIsSendingTestEmail(true);
    try {
      const dto: SendTestEmailDto = { to: localSettings.supportEmail };
      const response = await api.post('/super/settings/test-email', dto);
      addToast(response.data.message, 'success');
    } catch (e: any) {
      addToast(e.response?.data?.message || 'Failed to send test email.', 'error');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const updateConfig = (key: keyof SettingsEntity, value: any) => {
    setLocalSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  if (loading) {
    return (
      <PageContainer
        title="System Configuration"
        subtitle="Manage global platform settings and defaults."
        headerContent={<Settings className="w-8 h-8 text-brand-primary/80" />}
      >
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      </PageContainer>
    );
  }

  if (error || !localSettings) {
    return (
      <PageContainer
        title="System Configuration"
        subtitle="Manage global platform settings and defaults."
        headerContent={<Settings className="w-8 h-8 text-brand-primary/80" />}
      >
        <div className="flex flex-col items-center justify-center h-64 bg-red-900/20 rounded-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-red-500 font-semibold">Failed to load settings</p>
          <p className="text-red-400 text-sm mt-1">{error || 'Unknown error'}</p>
          <Button onClick={refetch} className="mt-4">Retry</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Head>
        <title>Global Settings | SentinelFi SuperAdmin</title>
      </Head>

      <PageContainer
        title="System Configuration"
        subtitle="Manage global platform settings and defaults."
        headerContent={<Settings className="w-8 h-8 text-brand-primary/80" />}
      >
        <div className="space-y-6">

          {/* 1. Platform Status & Access */}
          <Card title="Platform Access Control" headerContent={<Shield className="w-5 h-5 text-gray-400" />}>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div>
                  <h4 className="text-white font-medium flex items-center">
                    <Database className="w-4 h-4 mr-2 text-brand-primary" />
                    Maintenance Mode
                  </h4>
                  <p className="text-sm text-gray-400 mt-1">
                    When enabled, only SuperAdmins can log in. All other users will see a maintenance page.
                  </p>
                </div>
                <Switch
                  checked={localSettings.maintenanceMode}
                  onChange={() => updateConfig('maintenanceMode', !localSettings.maintenanceMode)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div>
                  <h4 className="text-white font-medium">Allow New Tenant Registrations</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    If disabled, the public "Sign Up" form will be hidden. SuperAdmins can still creates tenants manually.
                  </p>
                </div>
                <Switch
                  checked={localSettings.allowNewRegistrations}
                  onChange={() => updateConfig('allowNewRegistrations', !localSettings.allowNewRegistrations)}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>

          {/* 2. Default Quotas */}
          <Card title="Default Tenant Quotas" headerContent={<Server className="w-5 h-5 text-gray-400" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default Max Users</label>
                <Input
                  type="number"
                  value={localSettings.defaultUserQuota}
                  onChange={(e) => updateConfig('defaultUserQuota', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500 mt-1">Applied to new tenants unless overridden.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default Storage (GB)</label>
                <Input
                  type="number"
                  value={localSettings.defaultStorageQuotaGB}
                  onChange={(e) => updateConfig('defaultStorageQuotaGB', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500 mt-1">Max database size before warning.</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={isSaving}>Save Defaults</Button>
            </div>
          </Card>

          {/* 3. SMTP / Email Config */}
          <Card title="Email Configuration (SMTP)" headerContent={<Mail className="w-5 h-5 text-gray-400" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">System Support Email</label>
                <Input
                  type="email"
                  value={localSettings.supportEmail || ''}
                  onChange={(e) => updateConfig('supportEmail', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Server Host</label>
                <Input
                  value={localSettings.smtpServer || ''}
                  onChange={(e) => updateConfig('smtpServer', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Port</label>
                <Input
                  type="number"
                  value={localSettings.smtpPort || ''}
                  onChange={(e) => updateConfig('smtpPort', parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Username</label>
                <Input
                  value={localSettings.smtpUser || ''}
                  onChange={(e) => updateConfig('smtpUser', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Password</label>
                <Input
                  type="password"
                  value={localSettings.smtpPass || ''}
                  onChange={(e) => updateConfig('smtpPass', e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-3">
              <Button variant="secondary" onClick={handleTestEmail} disabled={isSendingTestEmail}>
                {isSendingTestEmail ? 'Sending...' : 'Send Test Email'}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>Save Config</Button>
            </div>
          </Card>

        </div>
      </PageContainer>
    </>
  );
};

import { ReactElement } from 'react'; // Import ReactElement

SuperAdminSettingsPage.getLayout = function getLayout(page: ReactElement) {
  return <SuperAdminLayout>{page}</SuperAdminLayout>;
};

export default SuperAdminSettingsPage;
