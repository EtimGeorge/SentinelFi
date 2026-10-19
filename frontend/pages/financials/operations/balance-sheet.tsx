import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { TableSkeleton } from '../../../components/common/LoadingSkeleton';
import EmptyState from '../../../components/common/EmptyState';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import {
  Scale,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface StatementRow {
  accountId: string;
  code: string;
  name: string;
  amount: number;
  signed: number;
}

interface BalanceSheetReport {
  asOf: string | null;
  assets: StatementRow[];
  liabilities: StatementRow[];
  equity: StatementRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  periodResult: number;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
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
      <p className="text-sm text-gray-600 pl-2">No balances.</p>
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

const BalanceSheetPage: React.FC = () => {
  const { fetchBalanceSheet } = useFinanceCore();
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await fetchBalanceSheet(asOf ? { asOf } : undefined);
      setReport(res && Array.isArray(res.assets) ? res : null);
    } finally {
      setLoading(false);
    }
  }, [fetchBalanceSheet, asOf]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const empty =
    !report ||
    (report.assets.length === 0 &&
      report.liabilities.length === 0 &&
      report.equity.length === 0);

  return (
    <>
      <Head>
        <title>Balance Sheet | SentinelFi</title>
      </Head>
      <PageContainer
        title="Balance Sheet"
        subtitle="Statement of financial position — assets must equal liabilities plus equity (including the period result)."
        headerContent={<Scale className="w-8 h-8 text-brand-primary" />}
      >
        <Card title="Filters" accent="primary" className="border border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="block text-xs font-bold text-gray-400">
              As of
              <input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="mt-1 w-full rounded-md bg-brand-darker border border-gray-700 px-3 py-2 text-sm text-gray-200"
              />
            </label>
            <div className="md:col-span-3 flex flex-wrap items-end gap-2">
              <Button variant="primary" onClick={load} icon={<RefreshCcw className="w-4 h-4" />}>
                Apply
              </Button>
              {report && (
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded self-end pb-1.5 ${
                    report.balanced
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {report.balanced ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Balanced
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Out of balance
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </Card>

        <Card title="Statement of Financial Position" accent="secondary" className="border border-gray-700">
          {loading ? (
            <TableSkeleton columns={3} rows={12} />
          ) : empty ? (
            <EmptyState
              pathname="/financials/operations/balance-sheet"
              title="No balances yet"
              subtitle="The balance sheet fills in as entries post to the ledger."
            />
          ) : (
            <>
              <StatementSection
                title="Assets"
                rows={report!.assets}
                total={report!.totalAssets}
                totalLabel="Total Assets"
              />
              <StatementSection
                title="Liabilities"
                rows={report!.liabilities}
                total={report!.totalLiabilities}
                totalLabel="Total Liabilities"
              />

              <div className="mb-6">
                <h3 className="text-xs font-black uppercase text-gray-400 mb-2">
                  Equity
                </h3>
                <table className="w-full text-sm">
                  <tbody>
                    {report!.equity.map((row) => (
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
                    <tr className="border-b border-gray-800/50">
                      <td className="py-1.5 pr-3 w-20" />
                      <td className="py-1.5 pr-3 text-gray-400 italic">
                        Current period result
                      </td>
                      <td className="py-1.5 text-right font-mono text-gray-200">
                        {fmt(report!.periodResult)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-600 font-bold text-gray-100">
                      <td colSpan={2} className="py-2 pr-3 text-right text-xs uppercase text-gray-400">
                        Total Equity
                      </td>
                      <td className="py-2 text-right font-mono">{fmt(report!.totalEquity)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="border-t-2 border-brand-primary/40 pt-4">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="font-bold text-gray-100">
                      <td className="py-1.5 pr-3">Total Assets</td>
                      <td className="py-1.5 text-right font-mono">{fmt(report!.totalAssets)}</td>
                    </tr>
                    <tr className="font-bold text-gray-100">
                      <td className="py-1.5 pr-3">Total Liabilities &amp; Equity</td>
                      <td className="py-1.5 text-right font-mono">
                        {fmt(report!.totalLiabilitiesAndEquity)}
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

export default BalanceSheetPage;
