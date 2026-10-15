import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable, { DataColumn, DataAction } from '../../components/common/DataTable';
import { Spinner } from '../../components/common/Spinner';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
  Radar, RefreshCcw, Play, RotateCcw, Rocket, AlertTriangle,
  CheckCircle2, Clock, Server,
} from 'lucide-react';
import { NextPageWithLayout } from '../_app';

// ─── Types (mirror GET /billing/provisioning-exceptions) ─────────────────────

interface FailedWebhookRow {
  id: string;
  provider: string;
  gateway_event_id: string;
  status: 'PROCESSING' | 'FAILED';
  attempts: number;
  subscription_id: string | null;
  last_error: string | null;
  claimed_at: string | null;
  processed_at: string;
  fulfilled_at: string | null;
}

interface UnprovisionedPaidRow {
  id: string;
  company_name: string | null;
  admin_email: string | null;
  plan: string;
  gateway: string | null;
  gateway_reference: string | null;
  created_at: string;
  provisioning_attempts: number;
  provisioning_error: string | null;
  schema_name_preview: string | null;
}

interface ExceptionsPayload {
  generated_at: string;
  counts: { failed_webhooks: number; unprovisioned_paid: number };
  failed_webhooks: FailedWebhookRow[];
  unprovisioned_paid: UnprovisionedPaidRow[];
}

const MAX_ATTEMPTS = 10; // mirrors backend MAX_FULFILLMENT_ATTEMPTS
const AUTO_REFRESH_MS = 30_000;

const fmtAge = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const fmtTs = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString() : '—';

// Status badge — FAILED rows red, dead PROCESSING claims amber.
const StatusBadge: React.FC<{ row: FailedWebhookRow }> = ({ row }) => {
  const exhausted = row.attempts >= MAX_ATTEMPTS;
  if (row.status === 'PROCESSING') {
    return (
      <span className="px-2 py-1 rounded text-xs font-bold uppercase tracking-tighter bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-mono">
        Dead claim
      </span>
    );
  }
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-tighter font-mono ${
        exhausted
          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}
    >
      {exhausted ? 'Exhausted' : 'Failed'}
    </span>
  );
};

const ProvisioningPage: NextPageWithLayout = () => {
  const [data, setData] = useState<ExceptionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  // Confirm dialog state — which action is pending confirmation.
  const [confirm, setConfirm] = useState<
    | { kind: 'replay'; row: FailedWebhookRow; force: boolean }
    | { kind: 'provision'; row: UnprovisionedPaidRow }
    | null
  >(null);
  const inFlight = useRef(false);

  const fetchExceptions = useCallback(async () => {
    // Auto-refresh must not stack requests on a slow backend.
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await api.get<ExceptionsPayload>('/billing/provisioning-exceptions');
      setData(res.data);
      setLastSync(new Date());
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load provisioning exceptions.');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchExceptions, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [autoRefresh, fetchExceptions]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const runReplay = async (row: FailedWebhookRow, force: boolean) => {
    setBusyRowId(row.id);
    try {
      const res = await api.post(`/billing/provisioning/webhooks/${row.id}/replay`, {
        force,
      });
      if (res.data.replayed) {
        toast.success(
          `Event ${row.gateway_event_id} fulfilled — subscription ${res.data.subscription_id ?? 'n/a'} activated.`,
        );
      } else {
        toast.error(
          `Replay failed (${res.data.terminal ? 'terminal' : 'retryable'}): ${res.data.error}`,
        );
      }
    } catch (error: any) {
      // 409 Conflict: already fulfilled / budget exhausted / concurrent claim.
      toast.error(error.response?.data?.message || 'Replay request rejected.');
    } finally {
      setBusyRowId(null);
      setConfirm(null);
      fetchExceptions();
    }
  };

  const runProvision = async (row: UnprovisionedPaidRow) => {
    setBusyRowId(row.id);
    try {
      const res = await api.post(`/billing/provisioning/subscriptions/${row.id}/provision`);
      if (res.data.provisioned) {
        toast.success(
          `${row.company_name ?? row.id} provisioned — tenant ${res.data.tenant_id} is live.`,
        );
      } else {
        toast.error(
          `Provisioning failed (${res.data.terminal ? 'terminal' : 'retryable'}): ${res.data.error}`,
        );
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Provisioning request rejected.');
    } finally {
      setBusyRowId(null);
      setConfirm(null);
      fetchExceptions();
    }
  };

  const failed = data?.failed_webhooks ?? [];
  const stuck = data?.unprovisioned_paid ?? [];
  const exhausted = failed.filter((r) => r.attempts >= MAX_ATTEMPTS).length;
  const healthy = failed.length === 0 && stuck.length === 0;

  // ─── Column definitions ───────────────────────────────────────────────────

  const failedColumns: DataColumn<FailedWebhookRow>[] = [
    { key: 'status', label: 'Status', tier: 'P0', get: (r) => <StatusBadge row={r} /> },
    {
      key: 'event', label: 'Gateway Event', tier: 'P0',
      get: (r) => (
        <div>
          <p className="text-sm text-white font-mono">{r.gateway_event_id}</p>
          <p className="text-xs text-gray-500">{r.provider}</p>
        </div>
      ),
      title: (r) => r.gateway_event_id,
    },
    {
      key: 'attempts', label: 'Attempts', tier: 'P1',
      get: (r) => (
        <span
          className={`font-mono text-sm font-bold ${
            r.attempts >= MAX_ATTEMPTS ? 'text-red-400' : 'text-yellow-400'
          }`}
        >
          {r.attempts}/{MAX_ATTEMPTS}
        </span>
      ),
    },
    {
      key: 'sub', label: 'Subscription', tier: 'P1',
      get: (r) => (
        <span className="font-mono text-xs text-gray-400">
          {r.subscription_id ?? 'unattributed'}
        </span>
      ),
      title: (r) => r.subscription_id ?? '',
    },
    {
      key: 'error', label: 'Last Error', tier: 'P2',
      get: (r) => (
        <span className="text-xs text-red-300/80 line-clamp-2 max-w-xs" title={r.last_error ?? ''}>
          {r.last_error ?? '—'}
        </span>
      ),
    },
    {
      key: 'seen', label: 'First Seen', tier: 'P3',
      get: (r) => (
        <span className="text-xs text-gray-500 font-mono" title={fmtTs(r.processed_at)}>
          {fmtAge(r.processed_at)}
        </span>
      ),
    },
  ];

  const failedActions: DataAction<FailedWebhookRow>[] = [
    {
      key: 'replay',
      label: 'Replay',
      icon: <Play className="w-4 h-4" />,
      primary: true,
      title: 'Replay this gateway event now',
      visible: (r) => r.attempts < MAX_ATTEMPTS,
      onClick: (r) => setConfirm({ kind: 'replay', row: r, force: false }),
    },
    {
      key: 'force-replay',
      label: 'Force Replay',
      icon: <RotateCcw className="w-4 h-4" />,
      danger: true,
      title: 'Reset the attempt budget and replay',
      visible: (r) => r.attempts >= MAX_ATTEMPTS,
      onClick: (r) => setConfirm({ kind: 'replay', row: r, force: true }),
    },
  ];

  const stuckColumns: DataColumn<UnprovisionedPaidRow>[] = [
    {
      key: 'company', label: 'Company', tier: 'P0',
      get: (r) => (
        <div>
          <p className="text-sm text-white font-medium">{r.company_name ?? '—'}</p>
          <p className="text-xs text-gray-500">{r.admin_email ?? '—'}</p>
        </div>
      ),
      title: (r) => `${r.company_name ?? ''} <${r.admin_email ?? ''}>`,
    },
    {
      key: 'schema', label: 'Schema Preview', tier: 'P1',
      get: (r) =>
        r.schema_name_preview ? (
          <span className="font-mono text-xs text-brand-primary">{r.schema_name_preview}</span>
        ) : (
          <span
            className="px-2 py-1 rounded text-xs font-bold uppercase tracking-tighter bg-red-500/10 text-red-400 border border-red-500/20"
            title="deriveSchemaName would reject this company name — fix it before replaying"
          >
            Unusable name
          </span>
        ),
    },
    {
      key: 'plan', label: 'Plan / Gateway', tier: 'P1',
      get: (r) => (
        <div>
          <p className="text-xs text-white capitalize">{r.plan}</p>
          <p className="text-xs text-gray-500 font-mono">{r.gateway ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'ref', label: 'Gateway Ref', tier: 'P2',
      get: (r) => (
        <span className="font-mono text-xs text-gray-400">{r.gateway_reference ?? '—'}</span>
      ),
      title: (r) => r.gateway_reference ?? '',
    },
    {
      key: 'stuck', label: 'Stuck For', tier: 'P2',
      get: (r) => (
        <span className="text-xs text-yellow-400/90 font-mono" title={fmtTs(r.created_at)}>
          {fmtAge(r.created_at)}
        </span>
      ),
    },
    {
      key: 'attempts', label: 'Attempts', tier: 'P3',
      get: (r) => (
        <span className="font-mono text-sm text-gray-400">{r.provisioning_attempts}</span>
      ),
    },
  ];

  const stuckActions: DataAction<UnprovisionedPaidRow>[] = [
    {
      key: 'provision',
      label: 'Provision Now',
      icon: <Rocket className="w-4 h-4" />,
      primary: true,
      title: 'Verify the charge in the gateway dashboard, then provision directly',
      onClick: (r) => setConfirm({ kind: 'provision', row: r }),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Provisioning Ops | SentinelFi SuperAdmin</title>
      </Head>

      <PageContainer
        title="Provisioning Ops Console"
        subtitle="Paid → provisioned chain: webhook fulfillment, tenant creation, schema gaps. Replay, force-replay, provision."
        headerContent={<Radar className="w-8 h-8 text-brand-primary/80" />}
      >
        <div className="space-y-6">
          {/* 1. Alert strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-500/10 mr-4">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Failed webhook events</p>
                  <p className="text-2xl font-bold text-white font-mono">{failed.length}</p>
                  {exhausted > 0 && (
                    <p className="text-xs text-red-400 mt-1">
                      {exhausted} past attempt cap — needs force replay
                    </p>
                  )}
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-500/10 mr-4">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Paid, not provisioned</p>
                  <p className="text-2xl font-bold text-white font-mono">{stuck.length}</p>
                  <p className="text-xs text-gray-500 mt-1">verify charge → Provision Now</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`p-3 rounded-full mr-4 ${
                      healthy ? 'bg-green-500/10' : 'bg-brand-primary/10'
                    }`}
                  >
                    <Server
                      className={`w-6 h-6 ${healthy ? 'text-green-400' : 'text-brand-primary'}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Chain status</p>
                    <p
                      className={`text-lg font-bold font-mono ${
                        healthy ? 'text-green-400' : 'text-white'
                      }`}
                    >
                      {healthy ? 'NOMINAL' : 'DEGRADED'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      last sync {lastSync ? lastSync.toLocaleTimeString() : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    onClick={fetchExceptions}
                    disabled={loading}
                    className="!px-3"
                  >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant={autoRefresh ? 'primary' : 'secondary'}
                    onClick={() => setAutoRefresh((v) => !v)}
                    className="!px-3 text-[11px]"
                    title="Auto-refresh every 30s"
                  >
                    {autoRefresh ? 'AUTO' : 'PAUSED'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* 2. Failed webhook ledger rows */}
          <Card
            title="Webhook Fulfillment Failures"
            headerContent={<AlertTriangle className="w-5 h-5 text-red-400" />}
          >
            {loading && !data ? (
              <div className="p-10 text-center text-gray-500">
                <Spinner size="lg" className="mx-auto mb-2" />
                Scanning fulfillment ledger…
              </div>
            ) : (
              <DataTable<FailedWebhookRow>
                columns={failedColumns}
                rows={failed}
                rowKey={(r) => r.id}
                actions={failedActions}
                emptyMessage="No failed webhook events — the fulfillment chain is clean."
                expandedContent={(r) => (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                          Failure detail
                        </h4>
                        <p className="text-red-300/90 font-mono text-xs whitespace-pre-wrap">
                          {r.last_error ?? '—'}
                        </p>
                      </div>
                      <div className="space-y-1 text-xs text-gray-400 font-mono">
                        <p>ledger row: {r.id}</p>
                        <p>event id: {r.gateway_event_id}</p>
                        <p>provider: {r.provider}</p>
                        <p>attempts: {r.attempts}/{MAX_ATTEMPTS}</p>
                        <p>first seen: {fmtTs(r.processed_at)}</p>
                        <p>claim started: {fmtTs(r.claimed_at)}</p>
                        <p>fulfilled at: {fmtTs(r.fulfilled_at)}</p>
                        <p>subscription: {r.subscription_id ?? 'unattributed'}</p>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </Card>

          {/* 3. Paid-but-unprovisioned subscriptions */}
          <Card
            title="Paid, Not Provisioned"
            headerContent={<Clock className="w-5 h-5 text-yellow-400" />}
          >
            {loading && !data ? (
              <div className="p-10 text-center text-gray-500">
                <Spinner size="lg" className="mx-auto mb-2" />
                Cross-checking subscriptions…
              </div>
            ) : (
              <DataTable<UnprovisionedPaidRow>
                columns={stuckColumns}
                rows={stuck}
                rowKey={(r) => r.id}
                actions={stuckActions}
                emptyMessage="No paid subscriptions are stuck — every charge reached provisioning."
                expandedContent={(r) => (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                          Provisioning error
                        </h4>
                        <p className="text-red-300/90 font-mono text-xs whitespace-pre-wrap">
                          {r.provisioning_error ??
                            'No error recorded — the webhook may never have arrived.'}
                        </p>
                      </div>
                      <div className="space-y-1 text-xs text-gray-400 font-mono">
                        <p>subscription: {r.id}</p>
                        <p>company: {r.company_name ?? '—'}</p>
                        <p>admin: {r.admin_email ?? '—'}</p>
                        <p>plan: {r.plan}</p>
                        <p>gateway: {r.gateway ?? '—'} / {r.gateway_reference ?? 'no ref'}</p>
                        <p>
                          schema preview:{' '}
                          {r.schema_name_preview ?? 'UNUSABLE — fix company name first'}
                        </p>
                        <p>provisioning attempts: {r.provisioning_attempts}</p>
                        <p>checkout started: {fmtTs(r.created_at)} ({fmtAge(r.created_at)})</p>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </Card>
        </div>
      </PageContainer>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirm?.kind === 'replay'}
        title={
          confirm?.kind === 'replay' && confirm.force
            ? 'Force replay event'
            : 'Replay webhook event'
        }
        message={
          confirm?.kind === 'replay'
            ? confirm.force
              ? `The attempt budget for ${confirm.row.gateway_event_id} is exhausted (${confirm.row.attempts}/${MAX_ATTEMPTS}). Force replay RESETS the budget and re-runs fulfillment from the stored payload. Only do this after verifying the underlying cause is fixed.`
              : `Re-run fulfillment for ${confirm.row.gateway_event_id} now? Safe to run alongside gateway retries — the claim is CAS-protected.`
            : ''
        }
        confirmLabel={confirm?.kind === 'replay' && confirm.force ? 'Force replay' : 'Replay now'}
        busy={!!busyRowId}
        tone={confirm?.kind === 'replay' && confirm.force ? 'danger' : 'default'}
        onConfirm={() => {
          if (confirm?.kind === 'replay') runReplay(confirm.row, confirm.force);
        }}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.kind === 'provision'}
        title="Provision subscription directly"
        message={
          confirm?.kind === 'provision'
            ? `Verify ${confirm.row.gateway_reference ?? 'the charge'} in the ${confirm.row.gateway ?? 'gateway'} dashboard FIRST. This activates ${confirm.row.company_name ?? confirm.row.id} and provisions its tenant + schema through the standard path.`
            : ''
        }
        confirmLabel="Provision now"
        busy={!!busyRowId}
        onConfirm={() => {
          if (confirm?.kind === 'provision') runProvision(confirm.row);
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

ProvisioningPage.getLayout = (page) => page;

export default ProvisioningPage;


