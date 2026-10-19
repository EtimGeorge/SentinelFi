import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { TableSkeleton } from '../../../components/common/LoadingSkeleton';
import EmptyState from '../../../components/common/EmptyState';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import {
  AccountClassType,
  NormalBalance,
  ACCOUNT_CLASS_NORMAL_BALANCE,
} from '@shared/types';
import { Scale, RefreshCcw, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  baseType: AccountClassType;
  normalBalance: NormalBalance;
  debit: number;
  credit: number;
  balance: number;
}

interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

const BASE_TYPE_BADGE: Record<AccountClassType, string> = {
  [AccountClassType.ASSET]: 'bg-teal-900/30 text-teal-400',
  [AccountClassType.LIABILITY]: 'bg-blue-900/30 text-blue-400',
  [AccountClassType.EQUITY]: 'bg-purple-900/30 text-purple-400',
  [AccountClassType.REVENUE]: 'bg-green-900/30 text-green-400',
  [AccountClassType.EXPENSE]: 'bg-orange-900/30 text-orange-400',
};

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TrialBalancePage: React.FC = () => {
  const { fetchTrialBalance } = useFinanceCore();

  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range: { from?: string; to?: string } = {};
      if (from) range.from = from;
      if (to) range.to = to;
      const res: any = await fetchTrialBalance(range);
      setReport(
        res && Array.isArray(res.rows)
          ? res
          : { rows: [], totalDebit: 0, totalCredit: 0, balanced: true },
      );
    } finally {
      setLoading(false);
    }
  }, [fetchTrialBalance, from, to]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    if (!report) return [];
    const map = new Map<AccountClassType, TrialBalanceRow[]>();
    for (const row of report.rows) {
      if (!map.has(row.baseType)) map.set(row.baseType, []);
      map.get(row.baseType)!.push(row);
    }
    const order: AccountClassType[] = [
      AccountClassType.ASSET,
      AccountClassType.LIABILITY,
      AccountClassType.EQUITY,
      AccountClassType.REVENUE,
      AccountClassType.EXPENSE,
    ];
    return order
      .filter((t) => map.has(t))
      .map((t) => ({ type: t, rows: map.get(t)! }));
  }, [report]);

  const empty = !report || report.rows.length === 0;

  return (
    <>
      <Head>
        <title>Trial Balance | SentinelFi</title>
      </Head>
      <PageContainer
        title="Trial Balance"
        subtitle="Sum of every posted journal line per account — debits must equal credits."
        headerContent={<Scale className="w-8 h-8 text-brand-primary" />}
      >
        <Card title="Filters" accent="primary" className="border border-gray-700 mb-6">
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
            <div className="md:col-span-2 flex flex-wrap items-end gap-2">
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

        <Card title="Accounts" accent="secondary" className="border border-gray-700">
          {loading ? (
            <TableSkeleton columns={5} rows={10} />
          ) : empty ? (
            <EmptyState
              pathname="/financials/operations/trial-balance"
              title="No posted entries yet"
              subtitle="The trial balance fills in as invoices, payments, expenses, and payroll post to the ledger."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-700">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Account</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3 text-right">Debit</th>
                    <th className="py-2 pr-3 text-right">Credit</th>
                    <th className="py-2 text-right">Balance</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((group) => (
                    <React.Fragment key={group.type}>
                      <tr className="bg-brand-darker/60">
                        <td colSpan={7} className="py-2 px-2">
                          <span
                            className={`text-[11px] font-black uppercase px-2 py-0.5 rounded ${
                              BASE_TYPE_BADGE[group.type] ?? 'bg-gray-700/50 text-gray-400'
                            }`}
                          >
                            {group.type}
                          </span>
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={row.accountId} className="border-b border-gray-800/60 hover:bg-brand-dark/40">
                          <td className="py-2 pr-3 font-mono text-xs text-gray-300">{row.code}</td>
                          <td className="py-2 pr-3 text-gray-200">{row.name}</td>
                          <td className="py-2 pr-3 text-xs text-gray-500">
                            {ACCOUNT_CLASS_NORMAL_BALANCE[row.baseType] === NormalBalance.DEBIT
                              ? 'Dr-normal'
                              : 'Cr-normal'}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono text-gray-300">{fmt(row.debit)}</td>
                          <td className="py-2 pr-3 text-right font-mono text-gray-300">{fmt(row.credit)}</td>
                          <td className="py-2 text-right font-mono text-gray-200">{fmt(row.balance)}</td>
                          <td className="py-2 text-right">
                            <Link
                              href={`/financials/operations/account-ledger?accountId=${row.accountId}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline"
                            >
                              Ledger <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-600 font-bold text-gray-100">
                    <td colSpan={3} className="py-3 pr-3 text-right text-xs uppercase text-gray-400">
                      Totals
                    </td>
                    <td className="py-3 pr-3 text-right font-mono">{fmt(report!.totalDebit)}</td>
                    <td className="py-3 pr-3 text-right font-mono">{fmt(report!.totalCredit)}</td>
                    <td className="py-3 text-right font-mono">
                      {fmt(report!.totalDebit - report!.totalCredit)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default TrialBalancePage;
