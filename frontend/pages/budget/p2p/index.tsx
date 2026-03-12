import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SecuredLayout from '../../../components/Layout/SecuredLayout';
import PageContainer from '../../../components/Layout/PageContainer';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { useCurrency } from '../../../components/context/CurrencyContext';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import {
  FileText,
  ShoppingCart,
  Receipt,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const P2PDeskPage: React.FC = () => {
  const {
    loading,
    fetchRequisitions,
    fetchPurchaseOrders,
    fetchInvoices,
    createPurchaseOrder
  } = useFinanceCore();
  const { convertToDisplay } = useCurrency();
  const [activeTab, setActiveTab] = useState<'requisitions' | 'purchase-orders' | 'invoices'>('requisitions');
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (activeTab === 'requisitions') {
        const res = await fetchRequisitions();
        setRequisitions(res.data || []);
      } else if (activeTab === 'purchase-orders') {
        const res = await fetchPurchaseOrders();
        setPurchaseOrders(res.data || []);
      } else if (activeTab === 'invoices') {
        const res = await fetchInvoices();
        setInvoices(res.data || []);
      }
    };
    loadData();
  }, [activeTab]);

  const handleIssuePO = async (reqId: string) => {
    await createPurchaseOrder(reqId);
    const res = await fetchRequisitions();
    setRequisitions(res.data || []);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config: any = {
      'PENDING_APPROVAL': { color: 'bg-alert-warning/20 text-alert-warning', icon: Clock },
      'APPROVED': { color: 'bg-alert-positive/20 text-alert-positive', icon: CheckCircle2 },
      'REJECTED': { color: 'bg-alert-critical/20 text-alert-critical', icon: AlertCircle },
      'ISSUED': { color: 'bg-brand-primary/20 text-brand-primary', icon: Package },
      'PAID': { color: 'bg-alert-positive/20 text-alert-positive', icon: CheckCircle2 },
      'RECEIVED': { color: 'bg-alert-warning/20 text-alert-warning', icon: Receipt },
    };
    const item = config[status] || { color: 'bg-gray-800 text-gray-400', icon: FileText };
    return (
      <div className={`px-2 py-1 rounded-md flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${item.color}`}>
        <item.icon className="w-3 h-3" />
        {status.replace(/_/g, ' ')}
      </div>
    );
  };

  return (
    <SecuredLayout>
      <Head>
        <title>P2P Desk | SentinelFi</title>
      </Head>
      <PageContainer
        title="Procure-to-Pay Desk"
        subtitle="The command center for corporate spend management and commitment tracking."
      >
        {/* Spend KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-brand-dark/40 border-gray-800">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Requisitions</p>
            <h3 className="text-2xl font-black text-white">{requisitions.length}</h3>
            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Ongoing approval workflows
            </p>
          </Card>
          <Card className="bg-brand-dark/40 border-gray-800">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Open Purchase Orders</p>
            <h3 className="text-2xl font-black text-brand-primary">{purchaseOrders.length}</h3>
            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" /> Committed expenditure
            </p>
          </Card>
          <Card className="bg-brand-dark/40 border-gray-800">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Pending Invoices</p>
            <h3 className="text-2xl font-black text-alert-warning">{invoices.filter(i => i.status !== 'PAID').length}</h3>
            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
              <Receipt className="w-3 h-3" /> Awaiting payment processing
            </p>
          </Card>
          <Card className="bg-brand-dark/40 border-gray-800">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Budget Runway</p>
            <h3 className="text-2xl font-black text-white">92%</h3>
            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-alert-positive" /> Within fiscal targets
            </p>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between gap-4 mb-6 border-b border-gray-800 pb-px">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('requisitions')}
              className={`pb-4 text-sm font-bold tracking-tight transition relative ${activeTab === 'requisitions' ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Requisitions
              {activeTab === 'requisitions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]" />}
            </button>
            <button
              onClick={() => setActiveTab('purchase-orders')}
              className={`pb-4 text-sm font-bold tracking-tight transition relative ${activeTab === 'purchase-orders' ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Purchase Orders
              {activeTab === 'purchase-orders' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]" />}
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`pb-4 text-sm font-bold tracking-tight transition relative ${activeTab === 'invoices' ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Invoices
              {activeTab === 'invoices' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]" />}
            </button>
          </div>
          <div className="flex gap-3 mb-3">
            <Button variant="outline" size="sm" className="bg-brand-dark/50"><Filter className="w-3.5 h-3.5 mr-2" /> Filter</Button>
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5 mr-2" />
              {activeTab === 'requisitions' ? 'New Requisition' : activeTab === 'purchase-orders' ? 'Generate PO' : 'Record Invoice'}
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-brand-dark/40 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800 bg-black/20">
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Document</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date / Requester</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Description / Cost Center</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {activeTab === 'requisitions' && requisitions.map(req => (
                <tr key={req.id} className="hover:bg-white/5 transition group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-white mb-0.5">{req.requisition_number}</p>
                    <p className="text-[10px] text-gray-500 font-medium">Requisition</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-white mb-0.5">{new Date(req.created_at).toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-500">{req.requester?.email.split('@')[0]}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-white font-medium mb-0.5 max-w-xs truncate">{req.description}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                      <p className="text-[10px] text-gray-500 uppercase font-black">{req.costCenter?.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-white">
                    {convertToDisplay(req.estimated_amount)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'PENDING_APPROVAL' && (
                      <Button
                        onClick={() => handleIssuePO(req.id)}
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition border-brand-primary/30 text-brand-primary hover:bg-brand-primary hover:text-white"
                      >
                        Issue PO
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {activeTab === 'purchase-orders' && purchaseOrders.map(po => (
                <tr key={po.id} className="hover:bg-white/5 transition group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-white mb-0.5">{po.po_number}</p>
                    <p className="text-[10px] text-gray-500 font-medium">Purchase Order</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-white mb-0.5">{new Date(po.created_at).toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{po.vendor_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-white font-medium mb-0.5 max-w-xs truncate">{po.requisition?.description}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-alert-positive" />
                      <p className="text-[10px] text-alert-positive uppercase font-black">Committed Spend</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-white">
                    {convertToDisplay(po.committed_amount)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={po.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition">View Details</Button>
                  </td>
                </tr>
              ))}
              {activeTab === 'invoices' && invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-white/5 transition group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-white mb-0.5">{inv.invoice_number}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{inv.purchase_order_id ? 'PO Linked' : 'Non-PO'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-white mb-0.5">{new Date(inv.invoice_date).toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{inv.vendor_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-alert-warning" />
                      <p className="text-[10px] text-alert-warning uppercase font-black">{inv.costCenter?.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-white">
                    {convertToDisplay(inv.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition">Process Payment</Button>
                  </td>
                </tr>
              ))}
              {((activeTab === 'requisitions' && requisitions.length === 0) ||
                (activeTab === 'purchase-orders' && purchaseOrders.length === 0) ||
                (activeTab === 'invoices' && invoices.length === 0)) && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <Package className="w-12 h-12 mb-4 text-gray-500" />
                        <p className="text-sm font-bold text-white">No {activeTab} found</p>
                        <p className="text-xs text-gray-500">Initiate a formal spending workflow to see data here.</p>
                      </div>
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </PageContainer>
    </SecuredLayout>
  );
};

export default P2PDeskPage;
