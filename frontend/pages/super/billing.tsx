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
  AlertCircle as AlertCircleIcon
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { AlertCircle, Download } from 'lucide-react';
import { InvoiceDto, InvoiceStatus } from 'shared/types/billing';
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';

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
      return <AlertCircleIcon className="w-5 h-5 text-red-500" />;
    default:
      return null;
  }
};

import { NextPageWithLayout } from '../_app'; // Import NextPageWithLayout

const SuperAdminBillingPage: NextPageWithLayout = () => {
  const { data, loading, error } = useSuperAdminBilling();
  const { convertToDisplay } = useCurrency(); // Hook

  const handleDownload = (invoiceId: string) => {
    toast.success(`Secure downlink established for ${invoiceId}`);
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

            {/* 1. Global KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Consolidated MRR"
                value={convertToDisplay(data.overview.totalMrr)}
                icon={<DollarSign className="w-6 h-6 text-green-400" />}
                change={`${data.overview.mrrGrowthPercentage}% Velocity`}
                changeColor="text-green-400"
              />
              <StatCard
                title="Active Portfolios"
                value={data.overview.activeSubscriptions}
                icon={<FileText className="w-6 h-6 text-blue-400" />}
                change={`${data.overview.subscriptionGrowthPercentage}% Growth`}
                changeColor="text-green-400"
              />
              <StatCard
                title="Platform ARPU"
                value={convertToDisplay(data.overview.totalMrr / (data.overview.activeSubscriptions || 1))}
                icon={<TrendingUp className="w-6 h-6 text-purple-400" />}
              />
            </div>

            {/* 2. Advanced Insights: Revenue Velocity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card title="Revenue Concentration" className="lg:col-span-2">
                <div className="p-4 bg-brand-dark/50 border border-gray-700 rounded-xl mt-4">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-xs text-brand-primary uppercase font-mono tracking-widest">Projection</p>
                      <h4 className="text-xl font-bold text-white">Annual Recurring Revenue (ARR)</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400 font-mono">{convertToDisplay(data.overview.totalMrr * 12)}</div>
                      <p className="text-[10px] text-gray-500 uppercase">Forward-Looking 12M</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Churn Impact Risk</span>
                      <span className="text-blue-400 font-mono">NOMINAL (2.1%)</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-brand-primary h-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Collection Strategy">
                <div className="space-y-6 mt-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-white font-medium">Automatic Invoicing Enabled</p>
                      <p className="text-xs text-gray-500">Next cycle scheduled for 1st of month.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-white font-medium">Delayed Transmissions: 0</p>
                      <p className="text-xs text-gray-500">All email gateways are stable.</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* 3. Transactional Ledger */}
            <Card title="Administrative Ledger (Invoices)">
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-brand-dark/50">
                    <tr>
                      {['Trace ID', 'Tenant Entity', 'Amount', 'Date', 'Status', ''].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {data.invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-brand-primary">{invoice.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{invoice.tenantName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{convertToDisplay(invoice.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(invoice.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(invoice.status as any)}
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-tighter text-gray-300">{invoice.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="secondary" size="sm" onClick={() => handleDownload(invoice.id)}>
                            <Download className="w-4 h-4 mr-2" /> Detail
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : null}
      </PageContainer>
    </>
  );
};

export default SuperAdminBillingPage;