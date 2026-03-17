import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PageContainer from '../components/Layout/PageContainer';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useAuth, Role } from '../components/context/AuthContext';
import { useCurrency } from '../components/context/CurrencyContext';
import { useSecuredApi } from '../components/hooks/useSecuredApi';
import { toast } from 'react-hot-toast';
import {
  Settings,
  Users,
  Plug,
  Shield,
  CreditCard,
  Bell,
  Globe,
  Mail,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Server,
  Zap,
  Clock,
  Activity,
  Database,
  Eye,
  EyeOff,
  ChevronRight,
  Save,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface TenantSettings {
  isDcsEnabled: boolean;
  isApiEnabled: boolean;
  isMfaRequired: boolean;
  isAuditLogPublic: boolean;
  useCustomSmtp: boolean;
  smtpConfigured: boolean;
  sendgridConfigured: boolean;
  erpConfigured: boolean;
  smtpServer?: string;
  erpProvider?: string;
  notifyOnApproval: boolean;
  notifyOnBudgetBreach: boolean;
  budgetBreachThresholdPct: number;
  auditRetentionDays: number;
  sessionTimeoutMinutes: number;
  timezone: string;
  companyLogoUrl?: string;
}

interface SubscriptionMetrics {
  plan: string;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  isExpired: boolean;
  activeUsers: number;
  maxUsers: number;
  userConsumptionPct: number;
  maxStorageGb: number;
  storageUsedGb: number;
  storageConsumptionPct: number;
  isDcsEnabled: boolean;
  isApiEnabled: boolean;
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

/** Animated toggle switch */
const Toggle: React.FC<{
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label?: string;
}> = ({ enabled, onChange, disabled, label }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900 ${
      enabled ? 'bg-brand-primary' : 'bg-gray-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    aria-label={label}
    disabled={disabled}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

/** Consumption progress bar */
const ConsumptionBar: React.FC<{
  label: string;
  used: number;
  max: number;
  pct: number;
  icon: React.ReactNode;
  unit?: string;
}> = ({ label, used, max, pct, icon, unit = '' }) => {
  const color =
    pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-brand-primary';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-gray-300">
          {icon}
          {label}
        </span>
        <span className="text-gray-400 font-mono">
          {used}{unit} / {max}{unit}
          <span className={`ml-2 font-semibold ${pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-yellow-400' : 'text-brand-primary'}`}>
            ({pct}%)
          </span>
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
};

/** Masked secret input */
const SecretInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}> = ({ value, onChange, placeholder, id }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-700/60 border border-gray-600 rounded-lg p-2 pr-10 text-white placeholder-gray-500 focus:ring-1 focus:ring-brand-primary outline-none text-sm"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
};

// ─── Tab definitions ────────────────────────────────────────────────────────
type TabId = 'preferences' | 'integrations' | 'notifications' | 'security' | 'subscription' | 'team';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'preferences', label: 'Preferences', icon: <Settings size={16} /> },
  { id: 'integrations', label: 'DCS & API', icon: <Plug size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  { id: 'subscription', label: 'Subscription', icon: <CreditCard size={16} /> },
  { id: 'team', label: 'Team & Access', icon: <Users size={16} /> },
];

// ─── Main Page ───────────────────────────────────────────────────────────────
const SettingsPage: React.FC = () => {
  const { hasAnyRole, user } = useAuth();
  const { currencies, userCurrency, setUserCurrencyCode } = useCurrency();
  const api = useSecuredApi();

  const [activeTab, setActiveTab] = useState<TabId>('preferences');
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingErp, setTestingErp] = useState(false);

  // User preference state (independent of tenant settings)
  const { updateProfile } = useAuth();
  const [personalInfo, setPersonalInfo] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  });
  const [selectedCurrency, setSelectedCurrency] = useState(userCurrency.code);

  // SMTP form
  const [smtpServer, setSmtpServer] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpTls, setSmtpTls] = useState(true);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [sendgridKey, setSendgridKey] = useState('');

  // ERP form
  const [erpProvider, setErpProvider] = useState('');
  const [erpBaseUrl, setErpBaseUrl] = useState('');
  const [erpApiKey, setErpApiKey] = useState('');

  const isAdmin = hasAnyRole([Role.AdminDirector, Role.TechnicalDirector, Role.SuperAdmin]);

  // ─── Fetch settings ──────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const { data } = await api.get('/settings');
      setSettings(data);
    } catch {
      toast.error('Could not load settings.');
    } finally {
      setLoadingSettings(false);
    }
  }, [api]);

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const { data } = await api.get('/settings/subscription');
      setMetrics(data);
    } catch {
      toast.error('Could not load subscription metrics.');
    } finally {
      setLoadingMetrics(false);
    }
  }, [api]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => {
    if (activeTab === 'subscription') fetchMetrics();
  }, [activeTab, fetchMetrics]);
  useEffect(() => { setSelectedCurrency(userCurrency.code); }, [userCurrency]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleToggle = async (field: keyof TenantSettings, value: boolean) => {
    if (!isAdmin) return;
    const prev = settings;
    setSettings((s) => s ? { ...s, [field]: value } : s);
    try {
      await api.patch('/settings', { [field]: value });
      toast.success('Setting updated.');
    } catch {
      setSettings(prev);
      toast.error('Failed to update setting.');
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile(personalInfo);
      toast.success('Profile updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCurrency = async () => {
    try {
      await api.patch('/auth/profile', { display_currency_code: selectedCurrency });
      setUserCurrencyCode(selectedCurrency);
      toast.success('Currency preference saved.');
    } catch { toast.error('Failed to save preference.'); }
  };

  const handleSaveSmtp = async () => {
    setIsSaving(true);
    try {
      await api.patch('/settings', {
        useCustomSmtp: settings?.useCustomSmtp,
        smtpConfig: { server: smtpServer, port: Number(smtpPort), user: smtpUser, pass: smtpPass, from: smtpFrom, useTls: smtpTls },
        ...(sendgridKey ? { sendgridApiKey: sendgridKey } : {}),
      });
      toast.success('Email integration saved.');
      await fetchSettings();
    } catch { toast.error('Failed to save email settings.'); }
    finally { setIsSaving(false); }
  };

  const handleSaveErp = async () => {
    setIsSaving(true);
    try {
      await api.patch('/settings', {
        isApiEnabled: settings?.isApiEnabled,
        erpConfig: { provider: erpProvider, baseUrl: erpBaseUrl, apiKey: erpApiKey },
      });
      toast.success('ERP integration saved.');
      await fetchSettings();
    } catch { toast.error('Failed to save ERP settings.'); }
    finally { setIsSaving(false); }
  };

  const handleTestSmtp = async () => {
    if (!smtpTestEmail) { toast.error('Enter a recipient email.'); return; }
    setTestingSmtp(true);
    try {
      const { data } = await api.post('/settings/test-smtp', { to: smtpTestEmail });
      data.success ? toast.success(data.message) : toast.error(data.message);
    } catch { toast.error('SMTP test request failed.'); }
    finally { setTestingSmtp(false); }
  };

  const handleTestErp = async () => {
    setTestingErp(true);
    try {
      const { data } = await api.post('/settings/test-erp', {});
      data.success ? toast.success(data.message) : toast.error(data.message);
    } catch { toast.error('ERP test request failed.'); }
    finally { setTestingErp(false); }
  };

  const handleSaveSecurity = async (payload: object) => {
    setIsSaving(true);
    try {
      await api.patch('/settings', payload);
      toast.success('Security settings saved.');
    } catch { toast.error('Failed to save.'); }
    finally { setIsSaving(false); }
  };

  // ─── Section rendering ───────────────────────────────────────────────────

  const renderPreferences = () => (
    <div className="space-y-6">
      <Card title="Personal Information" subtitle="Update your display name for platform auditing and reporting." borderTopColor="primary">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">First Name</label>
            <input 
              value={personalInfo.first_name} 
              onChange={(e) => setPersonalInfo(s => ({ ...s, first_name: e.target.value }))}
              placeholder="e.g. John"
              className="w-full bg-gray-700/60 border border-gray-600 rounded-lg p-2 text-white focus:ring-1 focus:ring-brand-primary outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Last Name</label>
            <input 
              value={personalInfo.last_name} 
              onChange={(e) => setPersonalInfo(s => ({ ...s, last_name: e.target.value }))}
              placeholder="e.g. Doe"
              className="w-full bg-gray-700/60 border border-gray-600 rounded-lg p-2 text-white focus:ring-1 focus:ring-brand-primary outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2 pt-1">
            <Button 
               onClick={handleSaveProfile} 
               isLoading={isSaving} 
               variant="primary" 
               size="sm" 
               icon={<Save size={14} />}
               disabled={!personalInfo.first_name || !personalInfo.last_name || (personalInfo.first_name === user?.first_name && personalInfo.last_name === user?.last_name)}
            >
              Update Profile
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Display Currency" subtitle="All financial figures will be converted to your preferred currency." borderTopColor="primary">
        <div className="space-y-4 mt-2">
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="w-full sm:w-72 bg-gray-700/60 border border-gray-600 rounded-lg p-2 text-white focus:ring-1 focus:ring-brand-primary outline-none text-sm"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
          <Button onClick={handleSaveCurrency} disabled={selectedCurrency === userCurrency.code} variant="primary" size="sm" icon={<Save size={14} />}>
            Save Preference
          </Button>
        </div>
      </Card>

      <Card title="Company Locale" subtitle="Timezone settings for consistent date & time handling across the platform." borderTopColor="secondary">
        <div className="mt-2 space-y-3">
          <label className="block text-sm text-gray-400">Timezone</label>
          <select
            value={settings?.timezone ?? 'UTC'}
            onChange={(e) => handleToggle('timezone' as any, e.target.value as any)}
            disabled={!isAdmin}
            className="w-full sm:w-72 bg-gray-700/60 border border-gray-600 rounded-lg p-2 text-white focus:ring-1 focus:ring-brand-primary outline-none text-sm disabled:opacity-50"
          >
            {['UTC', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Cairo', 'Africa/Accra', 'Europe/London', 'America/New_York', 'Asia/Dubai'].map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </Card>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-6">

      {/* ── DCS Section ── */}
      <div className="border-l-2 border-brand-secondary pl-4 mb-1">
        <h3 className="text-white font-semibold text-base">Document Control System (DCS)</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          The DCS manages document uploads, version control, and scheduled report distribution across all projects.
        </p>
      </div>

      <Card borderTopColor="secondary">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 text-brand-secondary shrink-0" size={20} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">Enable Document Control System</h3>
                {settings?.isDcsEnabled
                  ? <span className="text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={11}/> Active</span>
                  : <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1"><XCircle size={11}/> Disabled</span>
                }
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                When disabled, all DCS endpoints return <code className="bg-gray-700 px-1 rounded text-xs text-red-300">403 Forbidden</code> — even if called directly via API.
                No document uploads, scheduled reports, or DCS-related features will function.
              </p>
              {!settings?.isDcsEnabled && (
                <div className="flex items-start gap-2 mt-2 text-xs text-yellow-300 bg-yellow-900/20 px-3 py-2 rounded-lg">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
                  DCS is currently OFF. All scheduled report features are blocked platform-wide for your organisation.
                </div>
              )}
            </div>
          </div>
          <Toggle enabled={settings?.isDcsEnabled ?? true} onChange={(v) => handleToggle('isDcsEnabled', v)} disabled={!isAdmin} label="Toggle DCS" />
        </div>
      </Card>

      {/* DCS Setup Guide */}
      <Card title="DCS Integration Guide" borderTopColor="secondary">
        <div className="space-y-4 mt-2">
          <p className="text-sm text-gray-400">The DCS exposes the following platform API endpoint for scheduling automated financial reports:</p>
          <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs space-y-1">
            <div><span className="text-green-400">POST</span> <span className="text-white">/api/v1/dcs/schedule-report</span></div>
            <div><span className="text-blue-400">GET</span>  <span className="text-white">/api/v1/dcs/status</span></div>
          </div>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Enable DCS above', desc: 'Toggle DCS to Active. This unlocks all /api/v1/dcs endpoints for your organisation.' },
              { step: '2', title: 'Authenticate your requests', desc: 'Every DCS request must include your user JWT in the Authorization header: Authorization: Bearer <your_token>' },
              { step: '3', title: 'Schedule a report', desc: 'POST to /api/v1/dcs/schedule-report with body: { reportType: "Variance" | "WBS" | "Executive", wbsCategory: "string", emailRecipients: ["email@example.com"], schedule: "Daily EOD" | "Weekly" | "Manual" }' },
              { step: '4', title: 'Configure email delivery', desc: 'Set up your SMTP or SendGrid key in the Email Integration section below so DCS reports are delivered successfully.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-secondary/20 text-brand-secondary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{step}</div>
                <div>
                  <p className="text-sm text-white font-medium">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── ERP / API Section ── */}
      <div className="border-l-2 border-alert-critical pl-4 mt-6 mb-1">
        <h3 className="text-white font-semibold text-base">ERP & External API Integration</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Connect SentinelFi to your enterprise ERP system (SAP, Oracle, Odoo, Sage, etc.) to sync purchase orders, invoices, and financial data.
        </p>
      </div>

      <Card borderTopColor="alert">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-300 font-medium">Enable ERP / API Integration</span>
              <p className="text-xs text-gray-500 mt-0.5">
                When disabled, all outbound ERP sync calls are blocked and the ERP API endpoints return{' '}
                <code className="bg-gray-700 px-1 rounded text-xs text-red-300">403 Forbidden</code>.
              </p>
            </div>
            <Toggle enabled={settings?.isApiEnabled ?? false} onChange={(v) => handleToggle('isApiEnabled', v)} disabled={!isAdmin} />
          </div>

          {settings?.erpConfigured && (
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 px-3 py-2 rounded-lg">
              <CheckCircle size={14} /> Connected to <span className="font-semibold">{settings.erpProvider}</span> — endpoint reachable.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-700">
            <div>
              <label className="block text-xs text-gray-400 mb-1">ERP Provider Name *</label>
              <select value={erpProvider} onChange={(e) => setErpProvider(e.target.value)} className="input-field text-sm">
                <option value="">Select provider…</option>
                {['SAP', 'Oracle ERP', 'Microsoft Dynamics', 'Odoo', 'Sage 300', 'QuickBooks', 'Xero', 'Custom'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Base URL *</label>
              <input value={erpBaseUrl} onChange={(e) => setErpBaseUrl(e.target.value)} placeholder="https://erp.company.com/api/v2" className="input-field text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">API Key / Bearer Token *</label>
              <SecretInput value={erpApiKey} onChange={setErpApiKey} placeholder="Paste your API key or Bearer token here" />
              <p className="text-xs text-gray-500 mt-1">This is stored encrypted and never returned in API responses.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button onClick={handleSaveErp} isLoading={isSaving} variant="primary" size="sm" icon={<Save size={14} />} disabled={!isAdmin || !erpProvider || !erpBaseUrl}>Save ERP Config</Button>
            <Button onClick={handleTestErp} isLoading={testingErp} variant="outline" size="sm" icon={<Zap size={14} />} disabled={!settings?.isApiEnabled || !settings?.erpConfigured}>
              Test Connection
            </Button>
          </div>
          {!settings?.isApiEnabled && (
            <p className="text-xs text-yellow-400 flex items-center gap-1 mt-1"><AlertTriangle size={12}/>Enable API Integration above before testing the connection.</p>
          )}
        </div>
      </Card>

      {/* ERP Connection Guide */}
      <Card title="ERP Connection Guide">
        <div className="space-y-3 mt-2">
          <p className="text-sm text-gray-400">Follow these steps to connect your ERP system to SentinelFi:</p>
          <div className="space-y-3">
            {[
              {
                step: '1',
                title: 'Obtain your ERP API credentials',
                desc: 'In your ERP admin panel, generate an API key or OAuth 2.0 client credential with read/write access to Purchase Orders, Invoices, and Chart of Accounts.',
              },
              {
                step: '2',
                title: 'Enter your ERP Base URL',
                desc: 'This is typically your ERP\'s REST API root, e.g. https://my.sap.com/api/v2 or https://odoo.company.com/jsonrpc. Confirm with your ERP vendor.',
              },
              {
                step: '3',
                title: 'Save and test the connection',
                desc: 'Click "Save ERP Config", then enable the API toggle and click "Test Connection". SentinelFi will probe the endpoint and report the HTTP status code.',
              },
              {
                step: '4',
                title: 'Verify sync is live',
                desc: 'Once connected, SentinelFi will sync P2P Purchase Orders and approvals with your ERP on a scheduled basis. Check the Audit Log for WEBHOOK_ERP_SYNC events.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{step}</div>
                <div>
                  <p className="text-sm text-white font-medium">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-xs text-gray-400 border border-gray-700 mt-2">
            <span className="text-white font-semibold block mb-1">Supported ERP Systems</span>
            SAP S/4HANA · Oracle Fusion · Microsoft Dynamics 365 · Odoo 16/17 · Sage 300 · QuickBooks Online · Xero · Custom REST APIs
          </div>
        </div>
      </Card>

      {/* ── Email Integration ── */}
      <div className="border-l-2 border-brand-primary pl-4 mt-6 mb-1">
        <h3 className="text-white font-semibold text-base">Email Delivery</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Configure how SentinelFi sends notification, approval, and DCS report emails from your organisation's domain.
        </p>
      </div>

      <Card title="Email Provider" borderTopColor="primary">
        <div className="space-y-4 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-300 font-medium">Use Custom SMTP Server</span>
              <p className="text-xs text-gray-500 mt-0.5">
                When off, SentinelFi uses the platform's managed Resend service — zero configuration needed.
                Enable this only if you need emails sent from your own mail server domain.
              </p>
            </div>
            <Toggle enabled={settings?.useCustomSmtp ?? false} onChange={(v) => handleToggle('useCustomSmtp', v)} disabled={!isAdmin} />
          </div>

          {settings?.useCustomSmtp && (
            <div className="space-y-3 pt-3 border-t border-gray-700">
              {settings.smtpConfigured && (
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 px-3 py-2 rounded-lg">
                  <CheckCircle size={14} /> Custom SMTP configured ({settings.smtpServer})
                </div>
              )}
              <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-3 text-xs text-blue-300 space-y-1">
                <p className="font-medium text-white">Quick SMTP reference:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-400 mt-1">
                  <span>Gmail / Workspace:</span><span className="text-gray-200">smtp.gmail.com : 587 (TLS)</span>
                  <span>Office 365:</span><span className="text-gray-200">smtp.office365.com : 587</span>
                  <span>Amazon SES:</span><span className="text-gray-200">email-smtp.*.amazonaws.com : 587</span>
                  <span>Mailgun:</span><span className="text-gray-200">smtp.mailgun.org : 587</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">SMTP Server *</label>
                  <input value={smtpServer} onChange={(e) => setSmtpServer(e.target.value)} placeholder="smtp.company.com" className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Port *</label>
                  <input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" type="number" className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Username *</label>
                  <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="noreply@company.com" className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password / App Password *</label>
                  <SecretInput value={smtpPass} onChange={setSmtpPass} placeholder="••••••••••" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">From Address *</label>
                  <input value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="SentinelFi <noreply@company.com>" className="input-field text-sm" />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Toggle enabled={smtpTls} onChange={setSmtpTls} label="Use TLS" />
                  <span className="text-sm text-gray-400">Enable STARTTLS encryption</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-gray-700">
            <label className="block text-xs text-gray-400 mb-1">
              SendGrid API Key
              <span className="ml-2 text-gray-500">— optional, overrides SMTP for transactional + marketing emails</span>
            </label>
            {settings?.sendgridConfigured && (
              <p className="text-xs text-green-400 mb-1 flex items-center gap-1"><CheckCircle size={11}/> SendGrid key is configured and active</p>
            )}
            <SecretInput value={sendgridKey} onChange={setSendgridKey} placeholder="SG.••••••••••••••••••••••••••••••••" />
            <p className="text-xs text-gray-500 mt-1">
              Get your key from <span className="text-brand-primary">SendGrid Dashboard → Settings → API Keys</span>.
              Assign the "Mail Send" permission only.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSaveSmtp} isLoading={isSaving} variant="primary" size="sm" icon={<Save size={14} />} disabled={!isAdmin}>Save Email Config</Button>
            <div className="flex gap-2 items-center">
              <input
                value={smtpTestEmail}
                onChange={(e) => setSmtpTestEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="input-field text-sm w-52"
              />
              <Button onClick={handleTestSmtp} isLoading={testingSmtp} variant="outline" size="sm" icon={<Mail size={14} />}>
                Send Test Email
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      {[
        { label: 'Approval Requests', desc: 'Send email when a requisition or LPO is submitted for approval.', field: 'notifyOnApproval' as keyof TenantSettings },
        { label: 'Budget Breach Alerts', desc: `Send email when any budget reaches ${settings?.budgetBreachThresholdPct ?? 90}% consumption.`, field: 'notifyOnBudgetBreach' as keyof TenantSettings },
      ].map(({ label, desc, field }) => (
        <Card key={field}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 text-brand-secondary shrink-0" size={18} />
              <div>
                <h3 className="text-white font-medium text-sm">{label}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
            <Toggle enabled={!!settings?.[field]} onChange={(v) => handleToggle(field, v)} disabled={!isAdmin} />
          </div>
        </Card>
      ))}
      <Card title="Budget Alert Threshold" borderTopColor="alert">
        <div className="space-y-3 mt-2">
          <p className="text-sm text-gray-400">Alert when any budget line is consumed beyond:</p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={50} max={100} step={5}
              value={settings?.budgetBreachThresholdPct ?? 90}
              onChange={(e) => setSettings((s) => s ? { ...s, budgetBreachThresholdPct: Number(e.target.value) } : s)}
              className="w-48 accent-brand-primary"
              disabled={!isAdmin}
            />
            <span className="text-2xl font-bold text-brand-primary">{settings?.budgetBreachThresholdPct ?? 90}%</span>
          </div>
          <Button size="sm" onClick={() => handleSaveSecurity({ budgetBreachThresholdPct: settings?.budgetBreachThresholdPct })} isLoading={isSaving} disabled={!isAdmin} icon={<Save size={14} />}>Save Threshold</Button>
        </div>
      </Card>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-4">
      {[
        { label: 'Require MFA for All Users', desc: 'Force multi-factor authentication for every user in this company.', field: 'isMfaRequired' as keyof TenantSettings, danger: true },
        { label: 'Public Audit Log', desc: 'Allow non-admin users to view the audit trail (read-only).', field: 'isAuditLogPublic' as keyof TenantSettings, danger: false },
      ].map(({ label, desc, field, danger }) => (
        <Card key={field} borderTopColor={danger ? 'alert' : undefined}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Shield className={`mt-0.5 shrink-0 ${danger ? 'text-red-400' : 'text-brand-secondary'}`} size={18} />
              <div>
                <h3 className="text-white font-medium text-sm">{label}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
            <Toggle enabled={!!settings?.[field]} onChange={(v) => handleToggle(field, v)} disabled={!isAdmin} />
          </div>
        </Card>
      ))}
      <Card title="Session & Audit Retention" borderTopColor="secondary">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Session Timeout (minutes)</label>
            <input
              type="number" min={5} max={1440}
              value={settings?.sessionTimeoutMinutes ?? 60}
              onChange={(e) => setSettings((s) => s ? { ...s, sessionTimeoutMinutes: Number(e.target.value) } : s)}
              className="input-field text-sm w-full"
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Audit Log Retention (days)</label>
            <input
              type="number" min={7} max={3650}
              value={settings?.auditRetentionDays ?? 90}
              onChange={(e) => setSettings((s) => s ? { ...s, auditRetentionDays: Number(e.target.value) } : s)}
              className="input-field text-sm w-full"
              disabled={!isAdmin}
            />
          </div>
        </div>
        <Button
          className="mt-4" size="sm"
          onClick={() => handleSaveSecurity({ sessionTimeoutMinutes: settings?.sessionTimeoutMinutes, auditRetentionDays: settings?.auditRetentionDays })}
          isLoading={isSaving} disabled={!isAdmin} icon={<Save size={14} />}
        >
          Save Security Settings
        </Button>
      </Card>
    </div>
  );

  const renderSubscription = () => {
    if (loadingMetrics) return <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-brand-primary" /></div>;
    if (!metrics) return <p className="text-gray-400 text-sm py-8 text-center">No subscription data available.</p>;

    const expiryColor = metrics.isExpired ? 'text-red-400' : (metrics.daysUntilExpiry ?? 9999) <= 14 ? 'text-yellow-400' : 'text-green-400';
    const planBadgeColor = { basic: 'bg-gray-600', professional: 'bg-brand-primary', enterprise: 'bg-purple-600' }[metrics.plan.toLowerCase()] ?? 'bg-gray-600';

    return (
      <div className="space-y-6">
        {/* Plan overview banner */}
        <div className="bg-gradient-to-r from-brand-primary/20 to-brand-secondary/10 border border-brand-primary/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-white ${planBadgeColor}`}>{metrics.plan}</span>
              <h2 className="text-white font-semibold text-lg">Current Plan</h2>
            </div>
            <p className={`text-sm font-medium ${expiryColor}`}>
              {metrics.isExpired
                ? '⚠️ Subscription has expired'
                : metrics.expiresAt
                ? `Expires in ${metrics.daysUntilExpiry} days (${new Date(metrics.expiresAt).toLocaleDateString()})`
                : '✓ No expiry date set'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {metrics.isExpired && (
              <span className="flex items-center gap-1 text-red-400 text-xs bg-red-900/30 px-3 py-1 rounded-full"><AlertTriangle size={12} /> Renew Immediately</span>
            )}
            <Button variant="secondary" size="sm" icon={<ChevronRight size={14} />}>Contact Sales to Upgrade</Button>
          </div>
        </div>

        {/* Consumption metrics */}
        <Card title="Resource Consumption" subtitle="Live utilisation vs. your plan limits." borderTopColor="primary">
          <div className="space-y-5 mt-3">
            <ConsumptionBar
              label="Active Users"
              used={metrics.activeUsers}
              max={metrics.maxUsers}
              pct={metrics.userConsumptionPct}
              icon={<Users size={14} />}
            />
            <ConsumptionBar
              label="Storage"
              used={metrics.storageUsedGb}
              max={metrics.maxStorageGb}
              pct={metrics.storageConsumptionPct}
              icon={<Database size={14} />}
              unit=" GB"
            />
          </div>
        </Card>

        {/* Feature availability */}
        <Card title="Included Features" borderTopColor="secondary">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {[
              { label: 'Document Control (DCS)', enabled: metrics.isDcsEnabled },
              { label: 'ERP / API Access', enabled: metrics.isApiEnabled },
              { label: 'WBS Budget Management', enabled: true },
              { label: 'P2P Requisition Engine', enabled: true },
              { label: 'Multi-Currency Forex', enabled: true },
              { label: 'Executive Reporting', enabled: metrics.plan !== 'basic' },
            ].map(({ label, enabled }) => (
              <div key={label} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${enabled ? 'bg-green-900/20 text-green-300' : 'bg-gray-700/50 text-gray-500'}`}>
                {enabled ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {label}
              </div>
            ))}
          </div>
        </Card>

        <div className="text-xs text-gray-500 text-center">
          <RefreshCw size={11} className="inline mr-1" />
          Metrics refreshed at {new Date().toLocaleTimeString()}.
          <button onClick={fetchMetrics} className="ml-2 text-brand-primary hover:underline">Refresh</button>
        </div>
      </div>
    );
  };

  const renderTeam = () => (
    <div className="space-y-4">
      {hasAnyRole([Role.AdminDirector, Role.TechnicalDirector, Role.SuperAdmin]) && (
        <Link href="/admin/users">
          <Card className="hover:bg-gray-700/40 cursor-pointer transition" borderTopColor="alert">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Users className="text-red-400 mt-0.5 shrink-0" size={20} />
                <div>
                  <h3 className="text-white font-semibold">User & Role Management</h3>
                  <p className="text-sm text-gray-400 mt-0.5">Create, manage, and assign RBAC roles to your team members.</p>
                </div>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </div>
          </Card>
        </Link>
      )}
      {hasAnyRole([Role.AdminDirector, Role.FinanceManager, Role.SuperAdmin]) && (
        <Link href="/wbs-manager">
          <Card className="hover:bg-gray-700/40 cursor-pointer transition" borderTopColor="primary">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Activity className="text-brand-primary mt-0.5 shrink-0" size={20} />
                <div>
                  <h3 className="text-white font-semibold">WBS Category Manager</h3>
                  <p className="text-sm text-gray-400 mt-0.5">Define and modify top-level WBS headers and budget defaults.</p>
                </div>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </div>
          </Card>
        </Link>
      )}
      <Link href="/audit">
        <Card className="hover:bg-gray-700/40 cursor-pointer transition">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Shield className="text-brand-secondary mt-0.5 shrink-0" size={20} />
              <div>
                <h3 className="text-white font-semibold">Audit Log (Immutable)</h3>
                <p className="text-sm text-gray-400 mt-0.5">View the immutable financial audit trail for compliance and governance.</p>
              </div>
            </div>
            <ChevronRight className="text-gray-500" size={20} />
          </div>
        </Card>
      </Link>
    </div>
  );

  const tabContent: Record<TabId, () => React.ReactNode> = {
    preferences: renderPreferences,
    integrations: renderIntegrations,
    notifications: renderNotifications,
    security: renderSecurity,
    subscription: renderSubscription,
    team: renderTeam,
  };

  return (
    <>
      <Head><title>Settings | SentinelFi</title></Head>

      {/* Persistent styles for input fields */}
      <style jsx global>{`
        .input-field {
          width: 100%;
          background: rgba(55, 65, 81, 0.6);
          border: 1px solid rgba(75, 85, 99, 1);
          border-radius: 0.5rem;
          padding: 0.4rem 0.6rem;
          color: white;
          outline: none;
        }
        .input-field:focus { box-shadow: 0 0 0 1px #6366f1; }
        .input-field::placeholder { color: #6b7280; }
        .input-field:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <PageContainer
        title="Settings & Administration"
        subtitle="Manage integrations, security, team access, and your subscription."
        headerContent={<Settings className="w-7 h-7 text-brand-secondary" />}
      >
        {loadingSettings ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-7 h-7 animate-spin text-brand-primary" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6">
            {/* ── Sidebar nav ── */}
            <nav className="flex sm:flex-col gap-1 sm:w-44 shrink-0 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-brand-primary/20 text-brand-primary ring-1 ring-brand-primary/40'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* ── Content area ── */}
            <div className="flex-1 min-w-0">
              {tabContent[activeTab]()}
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
};

export default SettingsPage;
