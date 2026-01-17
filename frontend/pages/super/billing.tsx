import React from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import useSuperAdminBilling from '../../components/hooks/useSuperAdminBilling';
import { 
  DollarSign,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle as AlertCircleIcon
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { AlertCircle } from 'lucide-react';
import { InvoiceDto, InvoiceStatus } from 'shared/types/billing';

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

const SuperAdminBillingPage: React.FC = () => {
  const { data, loading, error } = useSuperAdminBilling();

  const handleDownload = (invoiceId: string) => {
    window.open(`/api/v1/super/billing/invoices/${invoiceId}/download`, '_blank');
  };

  return (
    <>
      <Head>
        <title>Billing & Revenue | SentinelFi SuperAdmin</title>
      </Head>

      <PageContainer
        title="Billing & Revenue"
        subtitle="Monitor financial performance and manage invoices."
        headerContent={<DollarSign className="w-8 h-8 text-brand-primary/80" />}
      >
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 bg-red-900/20 rounded-lg">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-500 font-semibold">Failed to load billing data</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 1. Billing Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total MRR"
                value={`$${(data.overview.totalMrr / 1000).toFixed(1)}k`}
                icon={<DollarSign className="w-6 h-6 text-green-400" />}
                change={`${data.overview.mrrGrowthPercentage}% vs last month`}
                changeColor="text-green-400"
              />
              <StatCard
                title="Active Subscriptions"
                value={data.overview.activeSubscriptions}
                icon={<FileText className="w-6 h-6 text-blue-400" />}
                change={`${data.overview.subscriptionGrowthPercentage}% vs last month`}
                changeColor="text-green-400"
              />
              <StatCard
                title="Pending Invoices"
                value={data.overview.pendingInvoices}
                icon={<Clock className="w-6 h-6 text-yellow-400" />}
              />
            </div>

            {/* 2. Recent Invoices Table */}
            <Card title="Recent Invoices">
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Invoice ID</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Tenant</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Amount</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Date</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Download</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {data.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{invoice.id}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{invoice.tenantName}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">${invoice.amount.toFixed(2)}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{new Date(invoice.date).toLocaleDateString()}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                          <div className="flex items-center">
                            {getStatusIcon(invoice.status)}
                            <span className="ml-2 capitalize">{invoice.status}</span>
                          </div>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleDownload(invoice.id)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Download
                          </button>
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