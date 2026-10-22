import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../../../../components/context/AuthContext';
import PageContainer from '../../../../components/Layout/PageContainer';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import { apiClient } from '../../../../lib/api';
import { useCurrency } from '../../../../components/context/CurrencyContext';
import { Role } from '@shared/types/role.enum';
import { DollarSign, Banknote, Plus, TrendingUp, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface BankAccount {
  id: string;
  account_name: string;
  account_number_masked: string;
  bank_name: string;
  currency_code: string;
  current_balance: number;
  status: string;
}

const BankAccountsPage: React.FC = () => {
  const { user } = useAuth();
  const { convertToDisplay } = useCurrency();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    account_number_masked: '',
    bank_name: '',
    currency_code: 'USD',
    opening_balance: '',
  });

  const role = user?.roles?.map((r: any) => r.name) || [];
  const canManage = role.includes(Role.AdminDirector) || role.includes(Role.AdminManager) || role.includes(Role.CFO) || role.includes(Role.SuperAdmin);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/api/v1/bank-reconciliation/accounts');
      const unwrapped = res?.data?.accounts || res?.data || res;
      const data: BankAccount[] = Array.isArray(unwrapped) ? unwrapped : [];
      setAccounts(data);
    } catch (e) {
      console.error('Failed to load bank accounts', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        account_name: formData.account_name.trim(),
        account_number_masked: formData.account_number_masked.trim(),
        bank_name: formData.bank_name.trim(),
        currency_code: formData.currency_code,
      };
      const opening = formData.opening_balance.trim();
      if (opening !== '') payload.opening_balance = Number(opening);
      const created: any = await apiClient.post('/api/v1/bank-reconciliation/accounts', payload);
      // apiClient resolves 4xx through validateStatus, so a rejected request
      // arrives here as a resolved value. Treat the error envelope as failure.
      if (!created || created.statusCode >= 400 || !created.id) {
        const detail = Array.isArray(created?.message) ? created.message.join(', ') : created?.message;
        throw new Error(detail || 'Failed to create bank account.');
      }
      toast.success('Bank account created successfully.');
      setFormOpen(false);
      setFormData({ account_name: '', account_number_masked: '', bank_name: '', currency_code: 'USD', opening_balance: '' });
      await loadAccounts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create bank account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Bank Accounts" subtitle="Manage tenant bank accounts.">
        <div className="p-10 flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Head><title>Bank Accounts | SentinelFi</title></Head>
      <PageContainer
        title="Bank Accounts"
        subtitle="Manage bank accounts for reconciliation."
        headerContent={
          canManage && (
            <Button variant="primary" size="sm" onClick={() => setFormOpen(true)} icon={<Plus className="w-4 h-4" />}>
              Add Account
            </Button>
          )
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <Card key={acc.id} className="p-5 border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">{acc.bank_name}</p>
                  <h3 className="text-sm font-black text-white">{acc.account_name}</h3>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-black uppercase tracking-tighter ${
                  acc.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>{acc.status}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Account Number</p>
                  <p className="text-sm font-mono text-white">{acc.account_number_masked}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Currency</p>
                  <p className="text-sm font-black text-white">{acc.currency_code}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">Current Balance</span>
                  <span className="text-lg font-black text-white">{convertToDisplay(acc.current_balance, acc.currency_code)}</span>
                </div>
              </div>
            </Card>
          ))}
          {accounts.length === 0 && (
            <Card className="p-12 text-center border-slate-800 col-span-full">
              <p className="text-slate-400 text-sm">No bank accounts configured. Add one to begin reconciliation.</p>
            </Card>
          )}
        </div>

        {formOpen && (
          <Card className="mt-6 p-6 border-slate-800">
            <h3 className="text-sm font-black text-white mb-4">Add Bank Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tighter block mb-1">Account Name *</label>
                  <Input value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} placeholder="e.g., Main Operating Account" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tighter block mb-1">Bank Name *</label>
                  <Input value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} placeholder="e.g., First National Bank" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tighter block mb-1">Account Number (masked) *</label>
                  <Input value={formData.account_number_masked} onChange={(e) => setFormData({ ...formData, account_number_masked: e.target.value })} placeholder="•••• •••• 1234" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tighter block mb-1">Currency</label>
                  <select value={formData.currency_code} onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:border-brand-primary outline-none">
                    <option value="USD">USD</option>
                    <option value="NGN">NGN</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tighter block mb-1">Opening Balance</label>
                  <Input type="number" value={formData.opening_balance} onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit" isLoading={submitting}>Create Account</Button>
              </div>
            </form>
          </Card>
        )}
      </PageContainer>
    </>
  );
};

export default BankAccountsPage;
