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
import { Banknote, Plus, ShieldCheck, Clock, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Virement {
  id: string;
  operational_budget_id: string;
  source_category_id: string;
  destination_category_id: string;
  amount: number;
  status: string;
  reason: string | null;
  created_at: string;
}

const VirementPage: React.FC = () => {
  const { user } = useAuth();
  const { convertToDisplay } = useCurrency();
  const [virements, setVirements] = useState<Virement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    operational_budget_id: '',
    source_category_id: '',
    destination_category_id: '',
    amount: '',
    reason: '',
  });

  const role = user?.roles?.map((r: any) => r.name) || [];
  const canManage = role.includes(Role.AdminDirector) || role.includes(Role.AdminManager) || role.includes(Role.CFO) || role.includes(Role.SuperAdmin);
  const canApprove = role.includes(Role.CFO) || role.includes(Role.AdminDirector) || role.includes(Role.AdminManager) || role.includes(Role.SuperAdmin) || role.includes(Role.CEO);

  useEffect(() => {
    loadVirements();
  }, []);

  const loadVirements = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/api/v1/budget-virement');
      const unwrapped = res?.data?.virements || res?.data || res;
      const data: Virement[] = Array.isArray(unwrapped) ? unwrapped : [];
      setVirements(data);
    } catch (e) {
      console.error('Failed to load virements', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/api/v1/budget-virement', formData);
      toast.success('Budget virement created successfully.');
      setFormOpen(false);
      setFormData({ operational_budget_id: '', source_category_id: '', destination_category_id: '', amount: '', reason: '' });
      await loadVirements();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create virement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Budget Virements" subtitle="Transfer budget between categories.">
        <div className="p-10 flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Head><title>Budget Virements | SentinelFi</title></Head>
      <PageContainer
        title="Budget Virements"
        subtitle="Transfer budget between OPEX categories with DOA governance."
        headerContent={
          canManage && (
            <Button variant="primary" size="sm" onClick={() => setFormOpen(true)} icon={<Plus className="w-4 h-4" />}>
              New Virement
            </Button>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 uppercase border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-black text-slate-200">Budget</th>
                <th className="px-4 py-3 font-black text-slate-200 text-right">Amount</th>
                <th className="px-4 py-3 font-black text-slate-200">Status</th>
                <th className="px-4 py-3 font-black text-slate-200 text-right">Date</th>
                <th className="px-4 py-3 font-black text-slate-200 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {virements.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{v.operational_budget_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-white">{convertToDisplay(v.amount, 'NGN')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border ${
                      v.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      v.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      v.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      v.status === 'DRAFT' ? 'bg-slate-800 text-slate-500 border-slate-700' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>{v.status}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{new Date(v.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {canApprove && v.status === 'PENDING' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Approve this virement?')) {
                            fetch(`/api/v1/budget-virement/${v.id}/approve`, { method: 'POST' }).then(() => loadVirements());
                          }
                        }}
                      >
                        Approve
                      </Button>
                    )}
                    {canApprove && v.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          if (window.confirm('Reject this virement?')) {
                            fetch(`/api/v1/budget-virement/${v.id}/reject`, { method: 'POST' }).then(() => loadVirements());
                          }
                        }}
                      >
                        Reject
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {virements.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                    No virements found. Create one to begin transferring budget between categories.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {formOpen && (
          <Card className="mt-6 p-6 border-slate-800">
            <h3 className="text-sm font-black text-white mb-4">Create Budget Virement</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tighter block mb-1">Source Category *</label>
                  <Input value={formData.source_category_id} onChange={(e) => setFormData({ ...formData, source_category_id: e.target.value })} placeholder="Category ID" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tighter block mb-1">Destination Category *</label>
                  <Input value={formData.destination_category_id} onChange={(e) => setFormData({ ...formData, destination_category_id: e.target.value })} placeholder="Category ID" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tighter block mb-1">Amount *</label>
                  <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tighter block mb-1">Reason</label>
                  <Input value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="Reason for transfer" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit" isLoading={submitting}>Create Virement</Button>
              </div>
            </form>
          </Card>
        )}
      </PageContainer>
    </>
  );
};

export default VirementPage;
