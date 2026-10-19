import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { TableSkeleton } from '../../../components/common/LoadingSkeleton';
import EmptyState from '../../../components/common/EmptyState';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { BookOpen, RefreshCcw, ArrowLeft } from 'lucide-react';

interface LedgerEntry {
  id: string;
  entryId: string;
  entryNumber: string;
  entryDate: string;
  memo: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
}

interface AccountLedgerReport {
  account: { id: string; code: string; name: string; isActive: boolean } | null;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntry[];
}

interface GlAccountOption {
  id: string;
  code: string;
  name: string;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
};

const AccountLedgerPage: React.FC = () => {
  const router = useRouter();
  const { fetchAccountLedger, fetchGlAccounts } = useFinanceCore();

  const queryAccountId =
    typeof router.query.accountId === 'string' ? router.query.accountId : '';

  const [accounts, setAccounts] = useState<GlAccountOption[]>([]);
  const [accountId, setAccountId] = useState('');
  const [report, setReport] = useState<AccountLedgerReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (queryAccountId) setAccountId(queryAccountId);
  }, [queryAccountId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res: any = await fetchGlAccounts();
      if (!mounted) return;
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setAccounts(
        list.map((a: any) => ({ id: a.id, code: a.code, name: a.name })),
      );
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const range: { from?: string; to?: string } = {};
      if (from) range.from = from;
      if (to) range.to = to;
      const res: any = await fetchAccountLedger(accountId, range);
      setReport(
        res && res.account
          ? res
          : { account: null, openingBalance: 0, closingBalance: 0, entries: [] },
      );
    } finally {
      setLoading(false);
    }
  }, [fetchAccountLedger, accountId, from, to]);

  useEffect(() => {
    if (accountId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const empty = !report || !report.account || report.entries.length === 0;

  return (
    <>
      <Head>
        <title>Account Ledger | SentinelFi</title>
      </Head>
      <PageContainer
        title="Account Ledger"
        subtitle="Every posted journal line for one account, with a running balance."
        headerContent={<BookOpen className="w-8 h-8 text-brand-primary" />}
      >
        <Card title="Filters" accent="primary" className="border border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="block text-xs font-bold text-gray-400 md:col-span-1">
              Account
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full rounded-md bg-brand-darker border border-gray-700 px-3 py-2 text-sm text-gray-200"
              >
                <option value="">Select an account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </label>
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
            <div className="flex items-end gap-2">
              <Button
                variant="primary"
                onClick={load}
                disabled={!accountId}
                icon={<RefreshCcw className="w-4 h-4" />}
              >
                Apply
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/financials/operations/trial-balance')}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Trial Balance
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Ledger" accent="secondary" className="border border-gray-700">
          {!accountId ? (
            <EmptyState
              pathname="/financials/operations/account-ledger"
              title="Choose an account"
              subtitle="Pick a GL account above to see its posted journal lines."
            />
          ) : loading ? (
            <TableSkeleton columns={6} rows={10} />
          ) : empty ? (
            <EmptyState
              pathname="/financials/operations/account-ledger"
              title="No posted entries"
              subtitle="This account has no posted journal lines in the selected period."
            />
          ) : (
            <div className="overflow-x-auto">
              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                <span className="font-mono text-xs font-black text-brand-primary bg-brand-primary/10 px-2 py-1 rounded">
                  {report!.account!.code}
                </span>
                <span className="font-bold text-gray-200">{report!.account!.name}</span>
                {!report!.account!.isActive && (
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-gray-700/50 text-gray-400">
                    Inactive
                  </span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  Closing balance:{' '}
                  <span className="font-mono font-bold text-gray-200">{fmt(report!.closingBalance)}</span>
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-700">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Entry #</th>
                    <th className="py-2 pr-3">Memo / Description</th>
                    <th className="py-2 pr-3 text-right">Debit</th>
                    <th className="py-2 pr-3 text-right">Credit</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {report!.entries.map((e) => (
                    <tr key={e.id} className="border-b border-gray-800/60 hover:bg-brand-dark/40">
                      <td className="py-2 pr-3 text-gray-300 whitespace-nowrap">{fmtDate(e.entryDate)}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-400">{e.entryNumber ?? '—'}</td>
                      <td className="py-2 pr-3 text-gray-200">
                        {e.description || e.memo || '—'}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-gray-300">
                        {e.debit ? fmt(e.debit) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-gray-300">
                        {e.credit ? fmt(e.credit) : '—'}
                      </td>
                      <td className="py-2 text-right font-mono text-gray-200">{fmt(e.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default AccountLedgerPage;
