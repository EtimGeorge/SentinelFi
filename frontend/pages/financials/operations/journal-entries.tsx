import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import EmptyState from '../../../components/common/EmptyState';
import { TableSkeleton } from '../../../components/common/LoadingSkeleton';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import {
  JournalEntryStatus,
  JournalSourceType,
} from '@shared/types';
import {
  BookMarked,
  Plus,
  RefreshCcw,
  Filter,
  Trash2,
  CheckCircle,
  Ban,
  Eye,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface JournalLine {
  id?: string;
  glAccountId: string;
  glAccount?: { code?: string; name?: string };
  costCenterId?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  memo?: string | null;
  source_type: JournalSourceType;
  source_id?: string | null;
  status: JournalEntryStatus;
  currency: string;
  total_debit: number;
  total_credit: number;
  reversal_of_entry_id?: string | null;
  reversed_by_entry_id?: string | null;
  lines?: JournalLine[];
}

interface GlAccount {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface DraftLine {
  glAccountId: string;
  description: string;
  debit: string;
  credit: string;
}

const STATUS_BADGE: Record<JournalEntryStatus, string> = {
  [JournalEntryStatus.DRAFT]: 'bg-amber-900/30 text-amber-400',
  [JournalEntryStatus.POSTED]: 'bg-green-900/30 text-green-400',
  [JournalEntryStatus.VOID]: 'bg-gray-700/50 text-gray-400',
};

const SOURCE_BADGE: Record<string, string> = {
  MANUAL: 'bg-purple-900/30 text-purple-400',
  PAYROLL: 'bg-blue-900/30 text-blue-400',
  OPEX_EXPENSE: 'bg-orange-900/30 text-orange-400',
  PURCHASE_ORDER: 'bg-teal-900/30 text-teal-400',
  GOODS_RECEIPT: 'bg-cyan-900/30 text-cyan-400',
  VENDOR_INVOICE: 'bg-indigo-900/30 text-indigo-400',
  VENDOR_PAYMENT: 'bg-pink-900/30 text-pink-400',
  REVERSAL: 'bg-red-900/30 text-red-400',
};

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const emptyLine = (): DraftLine => ({
  glAccountId: '',
  description: '',
  debit: '',
  credit: '',
});

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  ...(Object.values(JournalSourceType) as JournalSourceType[]).map((s) => ({
    value: s,
    label: s.replace(/_/g, ' '),
  })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: JournalEntryStatus.DRAFT, label: 'Draft' },
  { value: JournalEntryStatus.POSTED, label: 'Posted' },
  { value: JournalEntryStatus.VOID, label: 'Void' },
];

const JournalEntriesPage: React.FC = () => {
  const {
    fetchJournalEntries,
    fetchJournalEntry,
    createJournalEntry,
    postJournalEntry,
    voidJournalEntry,
    fetchGlAccounts,
  } = useFinanceCore();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [sourceType, setSourceType] = useState('');

  const [detail, setDetail] = useState<JournalEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState('');
  const [createMemo, setCreateMemo] = useState('');
  const [createStatus, setCreateStatus] = useState<JournalEntryStatus>(
    JournalEntryStatus.POSTED,
  );
  const [draftLines, setDraftLines] = useState<DraftLine[]>([
    emptyLine(),
    emptyLine(),
  ]);
  const [saving, setSaving] = useState(false);

  const [voidTarget, setVoidTarget] = useState<JournalEntry | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  const accountLabel = useCallback(
    (id: string) => {
      const acc = glAccounts.find((a) => a.id === id);
      return acc ? `${acc.code} — ${acc.name}` : id;
    },
    [glAccounts],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (status) params.status = status;
      if (sourceType) params.sourceType = sourceType;
      const res: any = await fetchJournalEntries(params);
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setEntries(list);
    } finally {
      setLoading(false);
    }
  }, [fetchJournalEntries, from, to, status, sourceType]);

  const loadAccounts = useCallback(async () => {
    const res: any = await fetchGlAccounts();
    const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    setGlAccounts(list);
  }, [fetchGlAccounts]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const openDetail = async (entry: JournalEntry) => {
    setDetail(entry);
    setDetailLoading(true);
    try {
      const full: any = await fetchJournalEntry(entry.id);
      if (full) setDetail(full);
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreate = () => {
    setCreateDate(new Date().toISOString().slice(0, 10));
    setCreateMemo('');
    setCreateStatus(JournalEntryStatus.POSTED);
    setDraftLines([emptyLine(), emptyLine()]);
    setIsCreateOpen(true);
  };

  const setLine = (index: number, patch: Partial<DraftLine>) =>
    setDraftLines((lines) =>
      lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );

  const addLine = () => setDraftLines((lines) => [...lines, emptyLine()]);

  const removeLine = (index: number) =>
    setDraftLines((lines) =>
      lines.length <= 2 ? lines : lines.filter((_, i) => i !== index),
    );

  const draftTotals = draftLines.reduce(
    (acc, l) => {
      acc.debit += Number(l.debit) || 0;
      acc.credit += Number(l.credit) || 0;
      return acc;
    },
    { debit: 0, credit: 0 },
  );
  const draftBalanced =
    Math.abs(draftTotals.debit - draftTotals.credit) < 1e-6 &&
    draftTotals.debit > 0;

  const saveEntry = async () => {
    if (!draftBalanced) {
      toast.error('Entry must balance: debits must equal credits.');
      return;
    }
    const lines = draftLines
      .filter((l) => l.glAccountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map((l) => ({
        glAccountId: l.glAccountId,
        description: l.description.trim() || undefined,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }));
    if (lines.length < 2) {
      toast.error('A journal entry needs at least two lines.');
      return;
    }
    setSaving(true);
    try {
      const res = await createJournalEntry({
        entryDate: createDate || undefined,
        memo: createMemo.trim() || undefined,
        status: createStatus,
        lines,
      });
      if (res) {
        setIsCreateOpen(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePostDraft = async (entry: JournalEntry) => {
    setBusyId(entry.id);
    try {
      const res = await postJournalEntry(entry.id);
      if (res) load();
    } finally {
      setBusyId(null);
    }
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      const res = await voidJournalEntry(voidTarget.id, voidReason.trim() || undefined);
      if (res) {
        setVoidTarget(null);
        setVoidReason('');
        setDetail(null);
        load();
      }
    } finally {
      setVoiding(false);
    }
  };

  return (
    <>
      <Head>
        <title>Journal Entries | SentinelFi</title>
      </Head>
      <PageContainer
        title="Journal Entries"
        subtitle="Every ledger posting — auto-posted from business documents and manual adjustments alike."
        headerContent={<BookMarked className="w-8 h-8 text-brand-primary" />}
      >
        {/* Filters */}
        <Card title="Filters" accent="primary" className="border border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
            <Select
              label="Source"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              options={SOURCE_OPTIONS}
            />
            <div className="flex items-end gap-2">
              <Button
                variant="primary"
                onClick={load}
                icon={<Filter className="w-4 h-4" />}
              >
                Apply
              </Button>
              <Button variant="outline" onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
                Manual Entry
              </Button>
            </div>
          </div>
        </Card>

        {/* List */}
        <Card title="Entries" accent="secondary" className="border border-gray-700">
          {loading ? (
            <TableSkeleton columns={7} rows={10} />
          ) : entries.length === 0 ? (
            <EmptyState
              pathname="/financials/operations/journal-entries"
              title="No journal entries"
              subtitle="Entries appear here as invoices, payments, expenses, and payroll post to the ledger — or create a manual adjustment."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-700">
                    <th className="py-2 pr-3">Entry #</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3">Memo</th>
                    <th className="py-2 pr-3 text-right">Debit</th>
                    <th className="py-2 pr-3 text-right">Credit</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-800/60 hover:bg-brand-dark/40"
                    >
                      <td className="py-2 pr-3 font-mono text-xs text-brand-primary">
                        {entry.entry_number}
                      </td>
                      <td className="py-2 pr-3 text-gray-300">{entry.entry_date}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                            SOURCE_BADGE[entry.source_type] ?? 'bg-gray-700/50 text-gray-400'
                          }`}
                        >
                          {entry.source_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-gray-400 max-w-[18rem] truncate">
                        {entry.memo || '—'}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-gray-300">
                        {fmt(entry.total_debit)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-gray-300">
                        {fmt(entry.total_credit)}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                            STATUS_BADGE[entry.status] ?? 'bg-gray-700/50 text-gray-400'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDetail(entry)}
                          className="p-1.5 text-gray-400 hover:text-brand-primary"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {entry.status === JournalEntryStatus.DRAFT && (
                          <button
                            type="button"
                            onClick={() => handlePostDraft(entry)}
                            disabled={busyId === entry.id}
                            className="p-1.5 text-gray-400 hover:text-green-400 disabled:opacity-40"
                            title="Post draft"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {entry.status !== JournalEntryStatus.VOID && (
                          <button
                            type="button"
                            onClick={() => {
                              setVoidTarget(entry);
                              setVoidReason('');
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-400"
                            title="Void entry"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Detail modal */}
        <Modal
          isOpen={!!detail}
          onClose={() => setDetail(null)}
          title={detail ? `Entry ${detail.entry_number}` : 'Entry'}
          size="2xl"
        >
          {detail && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-gray-500 font-bold">Date</p>
                  <p className="text-gray-200">{detail.entry_date}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 font-bold">Status</p>
                  <span
                    className={`inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                      STATUS_BADGE[detail.status] ?? 'bg-gray-700/50 text-gray-400'
                    }`}
                  >
                    {detail.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 font-bold">Source</p>
                  <p className="text-gray-200">{detail.source_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 font-bold">Currency</p>
                  <p className="text-gray-200">{detail.currency}</p>
                </div>
              </div>
              {detail.memo && (
                <div>
                  <p className="text-xs uppercase text-gray-500 font-bold">Memo</p>
                  <p className="text-gray-300 text-sm">{detail.memo}</p>
                </div>
              )}

              {detailLoading ? (
                <TableSkeleton columns={4} rows={4} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-700">
                        <th className="py-2 pr-3">Account</th>
                        <th className="py-2 pr-3">Description</th>
                        <th className="py-2 pr-3 text-right">Debit</th>
                        <th className="py-2 pr-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.lines ?? []).map((line, i) => (
                        <tr key={line.id ?? i} className="border-b border-gray-800/60">
                          <td className="py-2 pr-3 text-gray-200">
                            {line.glAccount
                              ? `${line.glAccount.code} — ${line.glAccount.name}`
                              : accountLabel(line.glAccountId)}
                          </td>
                          <td className="py-2 pr-3 text-gray-400">{line.description || '—'}</td>
                          <td className="py-2 pr-3 text-right font-mono text-gray-300">
                            {Number(line.debit) > 0 ? fmt(line.debit) : ''}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono text-gray-300">
                            {Number(line.credit) > 0 ? fmt(line.credit) : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-600 font-bold text-gray-100">
                        <td colSpan={2} className="py-2 pr-3 text-right text-xs uppercase text-gray-400">
                          Totals
                        </td>
                        <td className="py-2 pr-3 text-right font-mono">{fmt(detail.total_debit)}</td>
                        <td className="py-2 pr-3 text-right font-mono">{fmt(detail.total_credit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {(detail.reversed_by_entry_id || detail.reversal_of_entry_id) && (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  {detail.reversal_of_entry_id && <span>Reversal of an earlier entry.</span>}
                  {detail.reversed_by_entry_id && <span>This entry was reversed.</span>}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {detail.status === JournalEntryStatus.DRAFT && (
                  <Button
                    variant="primary"
                    icon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => handlePostDraft(detail)}
                    disabled={busyId === detail.id}
                  >
                    Post
                  </Button>
                )}
                {detail.status !== JournalEntryStatus.VOID && (
                  <Button
                    variant="outline"
                    icon={<Ban className="w-4 h-4" />}
                    onClick={() => {
                      setVoidTarget(detail);
                      setVoidReason('');
                    }}
                  >
                    Void
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Create modal */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Manual Journal Entry"
          size="2xl"
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Entry Date"
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
              />
              <Select
                label="Save As"
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value as JournalEntryStatus)}
                options={[
                  { value: JournalEntryStatus.POSTED, label: 'Posted (affects balances)' },
                  { value: JournalEntryStatus.DRAFT, label: 'Draft (review later)' },
                ]}
              />
              <Input
                label="Memo"
                placeholder="Reason for this entry"
                value={createMemo}
                onChange={(e) => setCreateMemo(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase font-bold text-gray-400">Lines</p>
                <Button variant="outline" onClick={addLine} icon={<Plus className="w-3.5 h-3.5" />}>
                  Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {draftLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <select
                        value={line.glAccountId}
                        onChange={(e) => setLine(index, { glAccountId: e.target.value })}
                        className="w-full rounded-md bg-brand-darker border border-gray-700 px-3 py-2 text-sm text-gray-200"
                      >
                        <option value="">Select account…</option>
                        {glAccounts
                          .filter((a) => a.is_active)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) => setLine(index, { description: e.target.value })}
                        className="w-full rounded-md bg-brand-darker border border-gray-700 px-3 py-2 text-sm text-gray-200"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Debit"
                        value={line.debit}
                        onChange={(e) =>
                          setLine(index, { debit: e.target.value, credit: '' })
                        }
                        className="w-full rounded-md bg-brand-darker border border-gray-700 px-3 py-2 text-sm text-gray-200 text-right"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Credit"
                        value={line.credit}
                        onChange={(e) =>
                          setLine(index, { credit: e.target.value, debit: '' })
                        }
                        className="w-full rounded-md bg-brand-darker border border-gray-700 px-3 py-2 text-sm text-gray-200 text-right"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        disabled={draftLines.length <= 2}
                        className="p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-30"
                        title="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-6 mt-3 text-sm font-mono">
                <span className="text-gray-400">
                  Debits: <span className="text-gray-200">{fmt(draftTotals.debit)}</span>
                </span>
                <span className="text-gray-400">
                  Credits: <span className="text-gray-200">{fmt(draftTotals.credit)}</span>
                </span>
                <span
                  className={`font-bold ${
                    draftBalanced ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {draftBalanced ? 'Balanced' : 'Out of balance'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveEntry}
                isLoading={saving}
                disabled={!draftBalanced}
              >
                {createStatus === JournalEntryStatus.DRAFT ? 'Save Draft' : 'Post Entry'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Void modal */}
        <Modal
          isOpen={!!voidTarget}
          onClose={() => setVoidTarget(null)}
          title={voidTarget ? `Void ${voidTarget.entry_number}` : 'Void entry'}
        >
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-400">
              Voiding a posted entry creates a mirror-image reversing entry, then marks the
              original as void. Both remain in the ledger for audit.
            </p>
            <Input
              label="Reason (optional)"
              placeholder="Why is this entry being voided?"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setVoidTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleVoid} isLoading={voiding}>
                Void Entry
              </Button>
            </div>
          </div>
        </Modal>
      </PageContainer>
    </>
  );
};

export default JournalEntriesPage;
