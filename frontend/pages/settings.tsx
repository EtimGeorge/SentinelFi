import React from 'react';
import Head from 'next/head';
import PageContainer from '../components/Layout/PageContainer';
import { Settings, Users, Plug, Activity } from 'lucide-react';
import Link from 'next/link';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useAuth, Role } from '../components/context/AuthContext';
import { useCurrency } from '../components/context/CurrencyContext';
import { useSecuredApi } from '../components/hooks/useSecuredApi';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const { hasAnyRole, user } = useAuth();
  const { currencies, userCurrency, setUserCurrencyCode } = useCurrency();
  const api = useSecuredApi();
  const [selectedCurrency, setSelectedCurrency] = useState(userCurrency.code);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with context when it changes
  useEffect(() => {
    setSelectedCurrency(userCurrency.code);
  }, [userCurrency]);

  const handleSavePreference = async () => {
    setIsSaving(true);
    try {
      await api.patch('/auth/profile', { display_currency_code: selectedCurrency });
      setUserCurrencyCode(selectedCurrency); // Update context and localStorage
      toast.success('Currency preference saved successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save preference');
    } finally {
      setIsSaving(false);
    }
  };

  // Admin and IT Head have user management privileges
  const isAdminOrITHead = hasAnyRole([Role.Admin, Role.ITHead]);

  return (
    <>
      <Head><title>User Settings | SentinelFi</title></Head>
      <PageContainer
        title="System Settings & Administration"
        subtitle="Manage global user accounts, integrations, and system configurations."
        headerContent={<Settings className="w-8 h-8 text-brand-secondary" />}
      >
        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* User Preferences Card */}
          <Card className="h-full bg-brand-dark/30" borderTopColor="primary">
            <Settings className="w-8 h-8 text-brand-primary mb-3" />
            <h2 className="text-xl font-semibold text-white mb-4">My Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Display Currency</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full bg-brand-dark border border-gray-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">This will convert all financial figures to your preferred currency.</p>
              </div>
              <Button
                onClick={handleSavePreference}
                disabled={isSaving || selectedCurrency === userCurrency.code}
                variant="primary"
                className="w-full"
              >
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </Card>

          {/* User Management Card (For Admin/IT Head) - CRITICAL LINK */}
          {isAdminOrITHead && (
            <Link href="/admin/users" className="block">
              <Card className="hover:bg-gray-700/50 transition h-full" borderTopColor="alert">
                <Users className="w-8 h-8 text-alert-critical mb-3" />
                <h2 className="text-xl font-semibold text-white">User & Role Management</h2>
                <p className="text-sm text-gray-400 mt-1">Create, delete, and assign RBAC roles to project personnel.</p>
              </Card>
            </Link>
          )}

          {/* WBS Category Management (For Admin/Finance) */}
          {(hasAnyRole([Role.Admin, Role.Finance])) && (
            <Link href="/wbs-manager" className="block">
              <Card className="hover:bg-gray-700/50 transition h-full" borderTopColor="primary">
                <Activity className="w-8 h-8 text-brand-primary mb-3" />
                <h2 className="text-xl font-semibold text-white">WBS Category Manager</h2>
                <p className="text-sm text-gray-400 mt-1">Define and modify top-level WBS headers and defaults.</p>
              </Card>
            </Link>
          )}

          {/* Integrations Card */}
          <Card borderTopColor="secondary" className="h-full">
            <Plug className="w-8 h-8 text-brand-secondary mb-3" />
            <h2 className="text-xl font-semibold text-white">DCS & API Integration</h2>
            <p className="text-sm text-gray-400 mt-1">Configure SendGrid/SMTP and ERP API keys (Phase 6).</p>
          </Card>

          {/* Audit Log Card */}
          <Card borderTopColor="positive" className="h-full">
            <Activity className="w-8 h-8 text-alert-positive mb-3" />
            <h2 className="text-xl font-semibold text-white">Audit Log (Immutable)</h2>
            <p className="text-sm text-gray-400 mt-1">View immutable logs of all financial transactions for compliance.</p>
          </Card>
        </div>
      </PageContainer>
    </>
  );
};

export default SettingsPage;
