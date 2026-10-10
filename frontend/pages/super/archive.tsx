import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { Archive, RotateCcw, Trash2, Search, Loader2, AlertTriangle } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext';
import useToast from '../../store/toastStore';
import SuperAdminLayout from '../../components/Layout/SuperAdminLayout';
import { NextPageWithLayout } from '../_app';

// A soft-deleted tenant as returned by GET /super/tenants/archived.
interface ArchivedTenant {
  tenant_id: string;
  name: string;
  schema_name: string;
  plan: string;
  created_at: string;
  deleted_at: string;
  days_until_purge: number;
  scheduled_purge_at: string;
  expired: boolean;
}

interface ArchivedResponse {
  data: ArchivedTenant[];
  retention_days: number;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  confirmText: string;
  confirmVariant?: 'primary' | 'danger';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, onClose, loading, title, message, onConfirm, confirmText, confirmVariant = 'primary',
}) => {
  if (!isOpen) return null;
  const confirmButtonClass = confirmVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-500'
    : 'bg-brand-primary hover:bg-brand-primary/90';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <Card title={title} accent={confirmVariant === 'danger' ? 'alert' : 'primary'} className="w-full max-w-sm">
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

// Days-left states: healthy → amber (≤10d) → red (≤3d) → purge pending (expired).
const DaysLeftBadge: React.FC<{ tenant: ArchivedTenant }> = ({ tenant }) => {
  if (tenant.expired) {
    return (
      <span className="text-xs font-bold px-2 py-1 rounded-md bg-red-500/15 text-red-400">
        Purge pending
      </span>
    );
  }
  if (tenant.days_until_purge <= 3) {
    return (
      <span className="text-xs font-bold px-2 py-1 rounded-md bg-red-500/15 text-red-400">
        {tenant.days_until_purge} day{tenant.days_until_purge === 1 ? '' : 's'} left
      </span>
    );
  }
  if (tenant.days_until_purge <= 10) {
    return (
      <span className="text-xs font-bold px-2 py-1 rounded-md bg-amber-500/15 text-amber-400">
        {tenant.days_until_purge} days left
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400">
      {tenant.days_until_purge} days left
    </span>
  );
};

const SuperAdminArchivePage: NextPageWithLayout = () => {
  const { user } = useAuth();
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);

  const [archived, setArchived] = useState<ArchivedTenant[]>([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [selected, setSelected] = useState<ArchivedTenant | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const fetchArchive = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await api.get<{ data: ArchivedTenant[]; retention_days: number }>(
        '/super/tenants/archived',
        { signal },
      );
      setArchived(response.data.data || []);
      setRetentionDays(response.data.retention_days ?? 30);
    } catch (e: any) {
      if (e.name === 'AbortError' || e.code === 'ERR_CANCELED') return;
      addToast(`Failed to load the archive: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    if (!user) return; // Guard: Wait for user to be loaded
    const controller = new AbortController();
    fetchArchive(controller.signal);
    return () => controller.abort();
  }, [user, fetchArchive]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return archived;
    return archived.filter(t =>
      t.name.toLowerCase().includes(q) || t.schema_name.toLowerCase().includes(q),
    );
  }, [archived, searchTerm]);

  const handleRestore = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.post(`/super/tenants/${selected.tenant_id}/restore`);
      addToast(`Tenant ${selected.name} restored. Users can sign in again.`, 'success');
      setShowRestoreConfirm(false);
      setSelected(null);
      fetchArchive();
    } catch (e: any) {
      addToast(e.response?.data?.message || 'Failed to restore tenant.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurge = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.delete(`/super/tenants/${selected.tenant_id}/purge`);
      addToast(`Tenant ${selected.name} permanently deleted, including its schema.`, 'success');
      setShowPurgeConfirm(false);
      setSelected(null);
      fetchArchive();
    } catch (e: any) {
      addToast(e.response?.data?.message || 'Failed to purge tenant.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>SuperAdmin Archive | SentinelFi</title>
      </Head>
      <PageContainer
        title="Tenant Archive"
        subtitle={`Archived tenants are suspended immediately and kept for ${retentionDays} days before permanent deletion.`}
        headerContent={<Archive className="w-8 h-8 text-brand-primary/80" />}
      >
        <div className="p-4 mb-4 rounded-lg border border-brand-primary/20 bg-brand-primary/5 flex items-start gap-3 text-sm text-gray-300">
          <AlertTriangle className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
          <p>

            Archived tenants lose all access immediately; their data and database schema are preserved.
            Restore a tenant at any point within the {retentionDays}-day retention window. After that, a
            daily sweep permanently deletes the tenant and drops its schema — or purge earlier with{' '}
            <span className="text-white font-medium">Delete Forever</span>.
          </p>
        </div>

        <Card>
          <div className="p-4 border-b border-gray-700 flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or schema..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 p-2 w-full sm:w-64 bg-brand-dark/50 border border-gray-600 rounded-lg elev-sm text-white focus:ring-brand-primary focus:border-brand-primary"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10 flex items-center justify-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading archive...
            </div>
          ) : (
            <DataTable<ArchivedTenant>
              columns={[
                { key: 'name', label: 'Tenant Name', tier: 'P0', get: (t) => <span className="text-white font-medium">{t.name}</span>, title: (t) => t.name },
                { key: 'days', label: 'Retention', tier: 'P0', get: (t) => <DaysLeftBadge tenant={t} />, title: (t) => t.expired ? 'Retention expired' : `${t.days_until_purge} day(s) left` },
                { key: 'schema', label: 'Schema Name', tier: 'P1', get: (t) => <span className="text-gray-400">{t.schema_name}</span>, title: (t) => t.schema_name },
                { key: 'archived', label: 'Archived On', tier: 'P1', get: (t) => <span className="text-gray-400">{new Date(t.deleted_at).toLocaleDateString()}</span> },
                { key: 'purge', label: 'Scheduled Purge', tier: 'P2', get: (t) => <span className={t.expired ? 'text-red-400' : 'text-gray-400'}>{new Date(t.scheduled_purge_at).toLocaleDateString()}</span> },
              ]}
              rows={filtered}
              rowKey={(t) => t.tenant_id}
              emptyMessage={archived.length === 0 ? 'The archive is empty.' : 'No archived tenants match your search.'}
              actions={[
                { key: 'restore', label: 'Restore Tenant', icon: <RotateCcw className="w-4 h-4" />, onClick: (t) => { setSelected(t); setShowRestoreConfirm(true); }, primary: true, title: 'Restore Tenant' },
                { key: 'purge', label: 'Delete Forever', icon: <Trash2 className="w-4 h-4" />, onClick: (t) => { setSelected(t); setShowPurgeConfirm(true); }, danger: true, title: 'Permanently delete (drops schema)' },
              ]}
              expandedContent={(t) => (
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 mb-4 flex items-center">
                      <Archive className="w-3 h-3 mr-2" /> Archive Details
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm py-2 border-b border-gray-800/50">
                        <span className="text-gray-400">Unique Entity ID</span>
                        <span className="text-gray-300 font-mono">{t.tenant_id}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-gray-800/50">
                        <span className="text-gray-400">Database Schema</span>
                        <span className="text-brand-secondary font-mono">{t.schema_name}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-gray-800/50">
                        <span className="text-gray-400">Onboarding Date</span>
                        <span className="text-gray-300">{new Date(t.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-brand-primary/20 bg-brand-primary/5 px-2 rounded">
                        <span className="text-brand-primary font-bold">Archived On</span>
                        <span className="text-brand-primary">{new Date(t.deleted_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-gray-800/50">
                        <span className="text-gray-400">Scheduled Purge</span>
                        <span className={t.expired ? 'text-red-400 font-bold' : 'text-gray-300'}>
                          {new Date(t.scheduled_purge_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-brand-dark/30 rounded-xl border border-gray-800 p-5">
                    <h4 className="text-xs font-bold text-red-500/80 mb-4 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-2" /> Restoration Notes
                    </h4>
                    <ul className="text-xs text-gray-500 list-disc ml-5 space-y-2">
                      <li>Restore re-enables access immediately; users sign in with their existing credentials.</li>
                      <li>Sessions were revoked when the tenant was archived, so everyone signs in again.</li>
                      <li>Delete Forever drops the database schema — this cannot be undone.</li>
                    </ul>
                  </div>
                </div>
              )}
            />
          )}
        </Card>
      </PageContainer>

      <ConfirmationModal
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        loading={actionLoading}
        title="Restore Tenant"
        message={
          <div className="space-y-3">
            <p>Restore <strong>{selected?.name}</strong> from the archive?</p>
            <ul className="text-xs text-gray-500 list-disc ml-5 space-y-1">
              <li>Access is re-enabled immediately.</li>
              <li>Users sign in again with their existing credentials.</li>
              <li>The retention countdown stops.</li>
            </ul>
          </div>
        }
        onConfirm={handleRestore}
        confirmText="Restore Tenant"
      />

      <ConfirmationModal
        isOpen={showPurgeConfirm}
        onClose={() => setShowPurgeConfirm(false)}
        loading={actionLoading}
        title="Delete Forever"
        message={
          <div className="space-y-3">
            <p>Permanently delete <strong>{selected?.name}</strong>?</p>
            <ul className="text-xs text-gray-500 list-disc ml-5 space-y-1">
              <li>The database schema is dropped and the record is hard-deleted.</li>
              <li>This cannot be undone.</li>
              {selected && !selected.expired && (
                <li className="text-red-400">Retention has not expired ({selected.days_until_purge} day(s) left) — this skips the retention window.</li>
              )}
            </ul>
          </div>
        }
        onConfirm={handlePurge}
        confirmText="Delete Forever"
        confirmVariant="danger"
      />
    </>
  );
};

SuperAdminArchivePage.getLayout = (page: React.ReactElement) => (
  <SuperAdminLayout>{page}</SuperAdminLayout>
);

export default SuperAdminArchivePage;

