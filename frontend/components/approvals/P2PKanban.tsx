import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Truck,
  FileText,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  RotateCcw,
} from "lucide-react";
import { useFinanceCore } from "../../hooks/useFinanceCore";
import { useCurrency } from "../../components/context/CurrencyContext";
import Button from "../common/Button";
import Card from "../common/Card";
import Input from "../common/Input";
import Select from "../common/Select";
import Modal from "../common/Modal";
import Tooltip from "../common/Tooltip";
import { P2PStepper } from "./P2PStepper";

interface P2PItem {
  id: string;
  stage: "REQUISITION" | "PURCHASE_ORDER" | "INVOICE" | "PAYMENT";
  requisition_number?: string;
  po_number?: string;
  invoice_number?: string;
  description: string;
  amount: number;
  currency: string;
  vendor_name?: string;
  cost_center_name?: string;
  gl_account_name?: string;
  status: string;
  created_at: string;
  requested_by?: string;
  project_name?: string;
}

interface Stage {
  id: 'REQUISITION' | 'PURCHASE_ORDER' | 'INVOICE' | 'PAYMENT';
  label: string;
  icon: React.ElementType;
  color: string;
}

const STAGES: Stage[] = [
  {
    id: "REQUISITION",
    label: "Requisitions",
    icon: FileText,
    color: "#6366f1",
  },
  {
    id: "PURCHASE_ORDER",
    label: "Purchase Orders",
    icon: Truck,
    color: "#0ea5e9",
  },
  { id: "INVOICE", label: "Invoices", icon: FileText, color: "#f59e0b" },
  { id: "PAYMENT", label: "Payments", icon: DollarSign, color: "#22c55e" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PENDING_APPROVAL: {
    label: "Pending",
    color: "text-yellow-400",
    bg: "bg-yellow-900/30",
  },
  APPROVED: {
    label: "Approved",
    color: "text-green-400",
    bg: "bg-green-900/30",
  },
  REJECTED: { label: "Rejected", color: "text-red-400", bg: "bg-red-900/30" },
  ISSUED: { label: "Issued", color: "text-blue-400", bg: "bg-blue-900/30" },
  RECEIVED: {
    label: "Received",
    color: "text-purple-400",
    bg: "bg-purple-900/30",
  },
  PAID: { label: "Paid", color: "text-green-400", bg: "bg-green-900/30" },
  PARTIAL: {
    label: "Partial",
    color: "text-yellow-400",
    bg: "bg-yellow-900/30",
  },
};

interface KanbanColumnProps {
  stage: Stage;
  items: P2PItem[];
  onItemClick: (item: P2PItem) => void;
  onStageAction: (item: P2PItem, action: string) => void;
  isLoading: boolean;
  convertToDisplay: (amount: number, currency: string) => string;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  items,
  onItemClick,
  onStageAction,
  isLoading,
  convertToDisplay,
}) => {
  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || {
      label: status,
      color: "text-gray-400",
      bg: "bg-gray-800",
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase ${config.bg} ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-[500px] bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <stage.icon className="w-5 h-5" style={{ color: stage.color }} />
            <h3 className="font-bold text-white">{stage.label}</h3>
            <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs font-bold text-gray-400">
              —
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-700 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-gray-800/50 rounded-xl border border-gray-700 flex-shrink-0 w-80">
      <div className="p-4 border-b border-gray-700 bg-black/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <stage.icon className="w-5 h-5" style={{ color: stage.color }} />
            <h3 className="font-bold text-white">{stage.label}</h3>
          </div>
          <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs font-bold text-gray-400">
            {items.length}
          </span>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search..." className="flex-1" />
          <Button variant="ghost" size="sm" className="p-2">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <stage.icon
              className="w-12 h-12 mb-3 opacity-30"
              style={{ color: stage.color }}
            />
            <p className="text-sm font-medium">
              No {stage.label.toLowerCase()}
            </p>
            <p className="text-xs text-center">Items will appear here</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              className="group cursor-pointer p-4 bg-gray-900/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
                  {item.requisition_number ||
                    item.po_number ||
                    item.invoice_number ||
                    item.id.slice(0, 8)}
                </span>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-sm font-medium text-white truncate mb-1">
                {item.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                {item.vendor_name && (
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {item.vendor_name}
                  </span>
                )}
                {item.cost_center_name && (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {item.cost_center_name}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">
                  {convertToDisplay(item.amount, item.currency)}
                </p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip content="View details">
                    <button className="p-1.5 text-gray-500 hover:text-brand-primary rounded-lg transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {stage.id === "REQUISITION" && (
        <div className="p-4 border-t border-gray-700">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onStageAction({} as P2PItem, "create")}
          >
            <Plus className="w-4 h-4 mr-2" /> New Requisition
          </Button>
        </div>
      )}
    </div>
  );
};

export const P2PKanban: React.FC = () => {
  const {
    fetchRequisitions,
    fetchPurchaseOrders,
    fetchInvoices,
    createPurchaseOrder,
  } = useFinanceCore();
  const { convertToDisplay } = useCurrency();

  const [items, setItems] = useState<Record<string, P2PItem[]>>({
    REQUISITION: [],
    PURCHASE_ORDER: [],
    INVOICE: [],
    PAYMENT: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<P2PItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    vendor: "",
    costCenter: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, pos, invs] = await Promise.all([
        fetchRequisitions(),
        fetchPurchaseOrders(),
        fetchInvoices(),
      ]);

      setItems({
        REQUISITION: (reqs.data || []).map((r: any) => ({
          ...r,
          stage: "REQUISITION" as const,
          description: r.description,
          amount: r.estimated_amount,
          currency: r.currency,
          vendor_name: r.vendor_name,
          cost_center_name: r.costCenter?.name,
          status: r.status,
          created_at: r.created_at,
        })),
        PURCHASE_ORDER: (pos.data || []).map((p: any) => ({
          ...p,
          stage: "PURCHASE_ORDER" as const,
          description: p.requisition?.description,
          amount: p.committed_amount,
          currency: p.currency,
          vendor_name: p.vendor_name,
          cost_center_name: p.requisition?.costCenter?.name,
          status: p.status,
          created_at: p.created_at,
        })),
        INVOICE: (invs.data || []).map((i: any) => ({
          ...i,
          stage: "INVOICE" as const,
          description: i.description,
          amount: i.amount,
          currency: i.currency,
          vendor_name: i.vendor_name,
          cost_center_name: i.costCenter?.name,
          status: i.status,
          created_at: i.invoice_date,
        })),
        PAYMENT: [],
      });
    } catch (e) {
      console.error("Failed to load P2P data:", e);
    } finally {
      setLoading(false);
    }
  }, [fetchRequisitions, fetchPurchaseOrders, fetchInvoices]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStageAction = (item: P2PItem, action: string) => {
    if (action === "create") {
      // Open create requisition modal
    } else if (action === "convert_to_po" && item.stage === "REQUISITION") {
      createPurchaseOrder(item.id).then(loadData);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black text-white">P2P Kanban</h2>
          <div className="w-px h-6 bg-gray-700" />
          <P2PStepper currentStage="REQUISITION" />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search across all stages..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm w-64 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>
          <Button
            variant="outline"
            onClick={loadData}
            isLoading={loading}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div
          className="flex gap-4 min-w-max h-full"
          style={{ minWidth: "320px * 4 + 48px" }}
        >
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              items={items[stage.id] || []}
              onItemClick={setSelectedItem}
              onStageAction={handleStageAction}
              isLoading={loading}
              convertToDisplay={convertToDisplay}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default P2PKanban;
