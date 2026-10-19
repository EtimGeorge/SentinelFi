import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { TableSkeleton } from '../../../components/common/LoadingSkeleton';
import EmptyState from '../../../components/common/EmptyState';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { TrendingUp, RefreshCcw, ArrowRight } from 'lucide-react';

interface StatementRow {
  accountId: string;
  code: string;
  name: string;
  amount: number;
  signed: number;
}

interface IncomeStatementReport {
  from: string | null;
  to: string | null;
  revenue: StatementRow[];
  expenses: StatementRow[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const StatementSection: React.FC<{
  title: string;
  rows: StatementRow[];
  total: number;
  totalLabel: string;
}> = ({ title, rows, total, totalLabel }) => (
  <div className="mb-6 last:mb-0">
    <h3 className="text-xs font-black uppercase text-gray-400 mb-2">
      {title}
    </h3>
    {rows.length === 0 ? (
      <p className="text-sm text-gray-600 pl-2">No activity.</p>
    ) : (
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.accountId} className="border-b border-gray-800/50">
              <td className="py-1.5 pr-3 font-mono text-xs text-gray-500 w-20">{row.code}</td>
              <td className="py-1.5 pr-3 text-gray-300">{row.name}</td>
              <td className="py-1.5 text-right font-mono text-gray-200">{fmt(row.amount)}</td>
              <td className="py-1.5 pl-2 w-6">
                <Link
                  href={`/financials/operations/account-ledger?accountId=${row.accountId}`}
                  className="text-brand-primary hover:underline"
                  title="View ledger"
                >
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-600 font-bold text-gray-100">
            <td colSpan={2} className="py-2 pr-3 text-right text-xs uppercase text-gray-400">
              {totalLabel}
            </td>
            <td className="py-2 text-right font-mono">{fmt(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    )}
  </div>
);

const IncomeStatementPage: React.FC = () => {
  const { fetchIncomeStatement } = useFinanceCore();
  const [report, setReport] = useState<IncomeStatementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range: { from?: string; to?: string } = {};
      if (from) range.from = from;
      if (to) range.to = to;
      const res: any = await fetchIncomeStatement(range);
      setReport(res && Array.isArray(res.revenue) ? res : null);
    } finally {
      setLoading(false);
    }
  }, [fetchIncomeStatement, from, to]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const empty =
    !report || (report.revenue.length === 0 && report.expenses.length === 0);
  const profitable = report ? report.netIncome >= 0 : true;

  return (
    <>
      <Head>
        <title>Income Statement | SentinelFi</title>
      </Head>
      <PageContainer
        title="Income Statement"
        subtitle="Profit & loss for the period — revenue less expenses yields net income."
        headerContent={<TrendingUp className="w-8 h-8 text-brand-primary" />}
      >
        <Card title="Period" accent="primary" className="border border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="block text-xs font-bold text-gray-400">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full rounded-md bg-brand-darker border border-gray-700 px-3 py-2 text-sm text-gray-200"
              />
            </label>
            <label className="block text-xs font-bold text-gray-400">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-md bg-brand-darker border border-gray-700 px-3 py-2 text-sm text-gray-200"
              />
            </label>
            <div className="md:col-span-2 flex items-end">
              <Button variant="primary" onClick={load} icon={<RefreshCcw className="w-4 h-4" />}>
                Apply
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Statement of Profit &amp; Loss" accent="secondary" className="border border-gray-700">
          {loading ? (
            <TableSkeleton columns={3} rows={10} />
          ) : empty ? (
            <EmptyState
              pathname="/financials/operations/income-statement"
              title="No activity in this period"
              subtitle="Revenue and expense accounts appear here as entries post to the ledger."
            />
          ) : (
            <>
              <StatementSection
                title="Revenue"
                rows={report!.revenue}
                total={report!.totalRevenue}
                totalLabel="Total Revenue"
              />
              <StatementSection
                title="Expenses"
                rows={report!.expenses}
                total={report!.totalExpenses}
                totalLabel="Total Expenses"
              />

              <div className="border-t-2 border-brand-primary/40 pt-4">
                <table className="w-full text-lg">
                  <tbody>
                    <tr className="font-bold">
                      <td className="py-2 pr-3 text-gray-200">
                        {profitable ? 'Net Income' : 'Net Loss'}
                      </td>
                      <td
                        className={`py-2 text-right font-mono ${
                          profitable ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {fmt(report!.netIncome)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default IncomeStatementPage;
