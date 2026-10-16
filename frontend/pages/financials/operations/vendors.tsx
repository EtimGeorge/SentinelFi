import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import DataTable from '../../../components/common/DataTable';
import EmptyState from '../../../components/common/EmptyState';
import { TableSkeleton } from '../../../components/common/LoadingSkeleton';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { Building2, Plus, Edit3, Ban, CheckCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Vendor {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  taxId?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  paymentTermsDays?: number | null;
  currency?: string | null;
  notes?: string | null;
}

const emptyForm = {
  code: '',
  name: '',
  taxId: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  paymentTermsDays: '',
  currency: 'NGN',
  notes: '',
};

const VendorMasterPage: React.FC = () => {
  const { fetchVendors, createVendor, updateVendor, setVendorStatus } = useFinanceCore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Vendor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await fetchVendors({
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];
      setVendors(list);
    } finally {
      setLoading(false);
    }
  }, [fetchVendors, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({
      code: v.code || '',
      name: v.name || '',
      taxId: v.taxId || '',
      contactName: v.contactName || '',
      email: v.email || '',
      phone: v.phone || '',
      address: v.address || '',
      paymentTermsDays: v.paymentTermsDays != null ? String(v.paymentTermsDays) : '',
      currency: v.currency || 'NGN',
      notes: v.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Vendor code and name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        code: form.code.trim(),
        name: form.name.trim(),
        taxId: form.taxId.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        paymentTermsDays: form.paymentTermsDays ? Number(form.paymentTermsDays) : undefined,
        currency: form.currency || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        delete payload.code;
        await updateVendor(editing.id, payload);
      } else {
        await createVendor(payload);
      }
      setIsFormOpen(false);
      load();
    } catch {
      // Hook already toasted the failure.
    } finally {
      setSaving(false);
    }
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    const next = statusTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await setVendorStatus(statusTarget.id, next);
      setStatusTarget(null);
      load();
    } catch {
      // Hook already toasted the failure.
    }
  };

  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <Head><title>Vendor Master | SentinelFi</title></Head>
      <PageContainer
        title="Vendor Master"
        subtitle="Approved supplier register backing requisitions and purchase orders."
        headerContent={<Building2 className="w-8 h-8 text-brand-primary" />}
      >
        <Card title="Filters & Actions" accent="primary" className="border border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Search" placeholder="Name, code, or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
            <div className="flex items-end gap-2">
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                New Vendor
              </Button>
              <Button variant="outline" icon={<Search className="w-4 h-4" />} onClick={load}>
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Vendor Register" accent="secondary" className="border border-gray-700">
          {loading ? (
            <TableSkeleton columns={5} rows={6} />
          ) : vendors.length === 0 ? (
            <EmptyState
              pathname="/financials/operations/vendors"
              title="No vendors registered"
              subtitle="Add your first approved supplier to unblock requisitions."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'vendor', label: 'Vendor', tier: 'P0', get: (v: Vendor) => (
                    <>
                      <p className="text-sm font-bold text-gray-200">{v.name}</p>
                      <span className="font-mono text-xs font-black text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {v.code}
                      </span>
                    </>
                  ),
                },
                {
                  key: 'contact', label: 'Contact', tier: 'P1', get: (v: Vendor) => (
                    <span className="text-sm text-gray-300">
                      {[v.contactName, v.email, v.phone].filter(Boolean).join(' · ') || '—'}
                    </span>
                  ),
                },
                {
                  key: 'terms', label: 'Terms', tier: 'P2', get: (v: Vendor) => (
                    <span className="text-sm text-gray-300">
                      {v.paymentTermsDays != null ? `${v.paymentTermsDays} days` : '—'}
                      {v.currency ? ` · ${v.currency}` : ''}
                    </span>
                  ),
                },
                {
                  key: 'status', label: 'Status', tier: 'P0', get: (v: Vendor) => (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 rounded ${v.status === 'ACTIVE' ? 'bg-green-900/30 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                      {v.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                      {v.status}
                    </span>
                  ),
                },
              ]}
              rows={vendors}
              rowKey={(v) => v.id}
              actions={[
                { key: 'edit', label: 'Edit', icon: <Edit3 className="w-4 h-4" />, onClick: openEdit },
                {
                  key: 'status',
                  label: 'Activate / Deactivate',
                  icon: <Ban className="w-4 h-4" />,
                  onClick: (v: Vendor) => setStatusTarget(v),
                },
              ]}
            />
          )}
        </Card>

        <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Vendor' : 'New Vendor'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <Input label="Vendor Code" placeholder="e.g. ACME-001" value={form.code} onChange={set('code')} />
            <Input label="Vendor Name" placeholder="e.g. Acme Supplies Ltd" value={form.name} onChange={set('name')} />
            <Input label="Tax ID" placeholder="Optional" value={form.taxId} onChange={set('taxId')} />
            <Input label="Contact Name" placeholder="Optional" value={form.contactName} onChange={set('contactName')} />
            <Input label="Email" placeholder="vendor@example.com" value={form.email} onChange={set('email')} />
            <Input label="Phone" placeholder="Optional" value={form.phone} onChange={set('phone')} />
            <Input label="Address" placeholder="Optional" value={form.address} onChange={set('address')} />
            <Input label="Payment Terms (days)" placeholder="e.g. 30" value={form.paymentTermsDays} onChange={set('paymentTermsDays')} />
            <Input label="Currency" placeholder="NGN" value={form.currency} onChange={set('currency')} />
            <Input label="Notes" placeholder="Optional" value={form.notes} onChange={set('notes')} />
          </div>
          <div className="flex gap-3 justify-end pt-6">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={saving}>
              {editing ? 'Save Changes' : 'Create Vendor'}
            </Button>
          </div>
        </Modal>

        <ConfirmDialog
          open={!!statusTarget}
          title={statusTarget?.status === 'ACTIVE' ? 'Deactivate Vendor' : 'Activate Vendor'}
          message={statusTarget ? `"${statusTarget.name}" will be ${statusTarget.status === 'ACTIVE' ? 'deactivated and hidden from new requisitions' : 'reactivated for procurement'}.` : ''}
          confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          cancelLabel="Cancel"
          tone={statusTarget?.status === 'ACTIVE' ? 'danger' : 'default'}
          onConfirm={confirmStatusChange}
          onCancel={() => setStatusTarget(null)}
        />
      </PageContainer>
    </>
  );
};

export default VendorMasterPage;
