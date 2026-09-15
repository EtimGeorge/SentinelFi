import React from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import useSuperAdminBilling from '../../components/hooks/useSuperAdminBilling';
import { useCurrency } from '../../components/context/CurrencyContext'; // Import Hook
import {
  DollarSign,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle as AlertCircleIcon,
  AlertTriangle,
  CalendarClock,
  Users,
  Download,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import DataTable from "../../components/common/DataTable";
import { InvoiceDto, InvoiceStatus } from 'shared/types/billing';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, changeColor }) => (
  <Card>
    <div className="flex items-center">
      <div className="p-3 rounded-full bg-gray-700 mr-4">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
    {change && (
      <div className={`mt-2 text-xs flex items-center ${changeColor}`}>
        <TrendingUp className="w-4 h-4 mr-1" />
        {change}
      </div>
    )}
  </Card>
);

const getStatusIcon = (status: InvoiceStatus) => {
  switch (status) {
    case InvoiceStatus.Paid:
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case InvoiceStatus.Pending:
      return <Clock className="w-5 h-5 text-yellow-500" />;
    case InvoiceStatus.Overdue:
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    default:
      return null;
  }
};

interface HealthRowProps {
  label: string;
  value: number;
  tone: string;
}

const HealthRow: React.FC<HealthRowProps> = ({ label, value, tone }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-gray-400">{label}</span>
    <span className={`font-mono font-bold ${tone}`}>{value}</span>
  </div>
);

interface SnapshotStatProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}

const SnapshotStat: React.FC<SnapshotStatProps> = ({
  label,
  value,
  sub,
  icon,
}) => (
  <div className="flex items-start">
    <div className="p-3 rounded-full bg-gray-700 mr-4">{icon}</div>
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-lg font-bold text-white font-mono">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  </div>
);

interface EmailTileProps {
  label: string;
  value: number;
  tone: string;
}

const EmailTile: React.FC<EmailTileProps> = ({ label, value, tone }) => (
  <div className="p-3 bg-brand-dark/50 border border-gray-700 rounded-xl">
    <p className={`text-xl font-bold font-mono ${tone}`}>{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

import { NextPageWithLayout } from '../_app'; // Import NextPageWithLayout

const SuperAdminBillingPage: NextPageWithLayout = () => {
  const { data, loading, error } = useSuperAdminBilling();
  const { convertToDisplay } = useCurrency(); // Hook

  const maxPlanMrr = data
    ? data.overview.mrrByPlan.reduce((m, r) => Math.max(m, r.mrrUsd), 0)
    : 0;
  const churnRate = data?.overview.churnRate30d ?? 0;
  const churnTone =
    churnRate < 5 ? 'text-green-400' : churnRate < 10 ? 'text-yellow-400' : 'text-red-400';
  const emailRate = data?.emailStats.deliveryRate;
  const emailRateTone =
    emailRate === null || emailRate === undefined
      ? 'text-gray-400'
      : emailRate >= 95
        ? 'text-green-400'
        : emailRate >= 90
          ? 'text-yellow-400'
          : 'text-red-400';
  const topTemplates = data?.emailStats.byTemplate.slice(0, 4) ?? [];
  const dailyRecent = data?.emailStats.daily.slice(-14) ?? [];
  const dailyPeak = dailyRecent.reduce((m, d) => Math.max(m, d.total), 0);

  const handleDownload = async (invoiceId: string) => {
    try {
      const res = await api.get(
        `/super/billing/invoices/${invoiceId}/download`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinelfi-invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded.');
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to download invoice.',
      );
    }
  };

  return (
    <>
      <Head>
        <title>Financial Control | SentinelFi SuperAdmin</title>
      </Head>

      <PageContainer
        title="Financial Control"
        subtitle="Platform revenue orchestration and receivable management."
        headerContent={<DollarSign className="w-8 h-8 text-brand-primary/80" />}
      >
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 bg-red-900/10 border border-red-900/20 rounded-xl">
            <AlertCircleIcon className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Financial Gateway Error</h3>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">

            {/* 1. Global KPIs — real data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Consolidated MRR"
                value={convertToDisplay(data.overview.totalMrr, 'USD')}
                icon={<DollarSign className="w-6 h-6 text-green-400" />}
                change={`${data.overview.mrrGrowthPercentage}% Velocity`}
                changeColor="text-green-400"
              />
              <StatCard
                title="Annual Recurring Revenue"
                value={convertToDisplay(data.overview.arr, 'USD')}
                icon={<CalendarClock className="w-6 h-6 text-blue-400" />}
                change="Forward-Looking 12M"
                changeColor="text-blue-400"
              />
              <StatCard
                title="Active Portfolios"
                value={data.overview.activeSubscriptions}
                icon={<FileText className="w-6 h-6 text-purple-400" />}
                change={`${data.overview.subscriptionGrowthPercentage}% Growth`}
                changeColor="text-green-400"
              />
              <StatCard
                title="Platform ARPU"
                value={convertToDisplay(data.overview.totalMrr / (data.overview.activeSubscriptions || 1), 'USD')}
                icon={<TrendingUp className="w-6 h-6 text-cyan-400" />}
                change="Average per portfolio / month"
                changeColor="text-gray-400"
              />
            </div>

            {/* 2. Real revenue mix + subscriber health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card title="Subscription Revenue Mix" className="lg:col-span-2">
                <div className="p-4 bg-brand-dark/50 border border-gray-700 rounded-xl mt-4">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-xs text-brand-primary uppercase font-mono ">MRR by plan</p>
                      <h4 className="text-xl font-bold text-white">Recurring Revenue Concentration</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400 font-mono">{convertToDisplay(data.overview.arr, 'USD')}</div>
                      <p className="text-xs text-gray-500 uppercase">Annual Recurring Revenue</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {data.overview.mrrByPlan.length === 0 ? (
                      <p className="text-sm text-gray-500">No active paying subscriptions yet.</p>
                    ) : (
                      data.overview.mrrByPlan.map((row) => {
                        const pct = maxPlanMrr > 0 ? Math.round((row.mrrUsd / maxPlanMrr) * 100) : 0;
                        return (
                          <div key={row.plan}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400 capitalize">{row.plan}</span>
                              <span className="text-blue-400 font-mono">{convertToDisplay(row.mrrUsd, 'USD')}/mo</span>
                            </div>
                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-brand-primary h-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex justify-between text-sm pt-4 mt-4 border-t border-gray-700">
                    <span className="text-gray-400">30-Day Gross Churn</span>
                    <span className={`font-mono font-bold ${churnTone}`}>{data.overview.churnRate30d}%</span>
                  </div>
                </div>
              </Card>

              <Card title="Subscriber Health">
                <div className="mt-4 space-y-3">
                  <HealthRow label="Active" value={data.overview.activeSubscriptions} tone="text-green-400" />
                  <HealthRow label="Trialing" value={data.overview.trialSubscriptions} tone="text-yellow-400" />
                  <HealthRow label="Expiring in 7 days" value={data.overview.expiringSoon7d} tone="text-orange-400" />
                  <HealthRow label="Free tier (active)" value={data.overview.freeSubscriptions} tone="text-blue-400" />
                  <HealthRow label="Paused" value={data.overview.pausedSubscriptions} tone="text-gray-400" />
                  <HealthRow label="Cancelled" value={data.overview.cancelledSubscriptions} tone="text-red-400" />
                  <HealthRow label="Expired" value={data.overview.expiredSubscriptions} tone="text-red-400" />
                </div>
              </Card>
            </div>

            {/* 3. Receivables + email deliverability — real data */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card title="Receivables Snapshot" className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <SnapshotStat
                    label="Outstanding (Pending)"
                    value={convertToDisplay(data.overview.collection.pendingAmount, 'USD')}
                    icon={<Clock className="w-6 h-6 text-yellow-400" />}
                  />
                  <SnapshotStat
                    label="Overdue"
                    value={convertToDisplay(data.overview.collection.overdueAmount, 'USD')}
                    sub={`${data.overview.collection.overdueInvoices} overdue invoices`}
                    icon={<AlertTriangle className="w-6 h-6 text-red-400" />}
                  />
                  <SnapshotStat
                    label="Collected (30d)"
                    value={convertToDisplay(data.overview.collection.paidAmount30d, 'USD')}
                    icon={<DollarSign className="w-6 h-6 text-green-400" />}
                  />
                </div>
              </Card>

              <Card title="Email Deliverability (30d)">
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Delivery Rate</p>
                    <p className={`text-3xl font-bold font-mono ${emailRateTone}`}>
                      {emailRate === null || emailRate === undefined ? '\u2014' : `${emailRate}%`}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <EmailTile label="Sent" value={data.emailStats.totals.sent} tone="text-green-400" />
                    <EmailTile label="Failed" value={data.emailStats.totals.failed} tone="text-red-400" />
                    <EmailTile label="Previewed" value={data.emailStats.totals.preview} tone="text-gray-400" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Unique Recipients</span>
                    <span className="flex items-center gap-1 font-mono text-white">{data.emailStats.uniqueRecipients} <Users className="w-3.5 h-3.5 text-gray-500" /></span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Last Successful Send</span>
                    <span className="text-gray-300">{data.emailStats.lastSentAt ? new Date(data.emailStats.lastSentAt).toLocaleString() : 'Never'}</span>
                  </div>
                  {dailyPeak > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Daily Volume (14d)</p>
                      <div className="flex items-end gap-1 h-12">
                        {dailyRecent.map((d) => (
                          <div
                            key={d.day}
                            title={`${d.day}: ${d.total} (${d.failed} failed)`}
                            className={d.failed > 0 ? 'bg-red-500/70' : 'bg-brand-primary/70'}
                            style={{ height: `${Math.max(4, (d.total / dailyPeak) * 100)}%`, flex: 1 }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {topTemplates.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Top Templates</p>
                      <div className="space-y-1">
                        {topTemplates.map((t) => (
                          <div key={t.template} className="flex justify-between items-center text-xs">
                            <span className="text-gray-400 truncate mr-2">{t.template}</span>
                            <span className="font-mono text-gray-300">{t.total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* 4. Transactional Ledger */}
            <Card title="Administrative Ledger (Invoices)">
              <DataTable<InvoiceDto>
                className="mt-4"
                columns={[
                  { key: 'tenant', label: 'Tenant Entity', tier: 'P0', get: (inv) => <span className="text-white">{inv.tenantName}</span>, title: (inv) => inv.tenantName },
                  { key: 'amount', label: 'Amount', tier: 'P0', get: (inv) => <span className="font-mono text-white">{convertToDisplay(inv.amount, 'USD')}</span>, title: (inv) => convertToDisplay(inv.amount, 'USD') },
                  { key: 'trace', label: 'Trace ID', tier: 'P1', get: (inv) => <span className="font-mono text-brand-primary">{inv.id}</span>, title: (inv) => inv.id },
                  { key: 'status', label: 'Status', tier: 'P1', get: (inv) => (
                    <div className="flex items-center">
                      {getStatusIcon(inv.status as any)}
                      <span className="ml-2 text-xs font-bold uppercase tracking-tighter text-gray-300">{inv.status}</span>
                    </div>
                  ) },
                  { key: 'date', label: 'Date', tier: 'P2', get: (inv) => <span className="text-gray-400">{new Date(inv.date).toLocaleDateString()}</span> },
                ]}
                rows={data.invoices}
                rowKey={(inv) => inv.id}
                actions={[
                  { key: 'detail', label: 'Download Invoice', icon: <Download className="w-4 h-4" />, onClick: (inv) => handleDownload(inv.id), primary: true, title: 'Download PDF invoice for this transaction' },
                ]}
              />
            </Card>
          </div>
        ) : null}
      </PageContainer>
    </>
  );
};

export default SuperAdminBillingPage;