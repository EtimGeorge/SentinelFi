import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../../../lib/api";
import Card from "../../common/Card";
import Modal from "../../common/Modal";
import Button from "../../common/Button";
import Input from "../../common/Input";
import WBSSelect from "../WBSSelect";
import DataTable from "../../common/DataTable";
import { useFormAutoSave } from "../../../lib/formAutoSave";
import { useCurrency } from "../../context/CurrencyContext";
import { useAuth } from "../../context/AuthContext";
import { Role } from "../../../../shared/types/role.enum";
import {
  Plus,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  Trash2,
  Edit,
  AlertTriangle,
} from "lucide-react";
import { apiErrorMessage } from "./errors";
import { ProjectDetail, LpoData, WbsRollupNode } from "./types";

interface LpoTabProps {
  project: ProjectDetail;
  lpos: LpoData[];
  onChanged: () => void;
}

interface CreateLpoForm {
  wbs_id: string;
  vendor_name: string;
  description: string;
  amount_committed: number;
  expected_delivery_date: string;
  override_reason: string;
}

const EMPTY_CREATE_FORM: CreateLpoForm = {
  wbs_id: "",
  vendor_name: "",
  description: "",
  amount_committed: 0,
  expected_delivery_date: "",
  override_reason: "",
};

const APPROVAL_BADGES: Record<string, { label: string; cls: string }> = {
  PENDING_APPROVAL: {
    label: "Awaiting Approval",
    cls: "bg-yellow-900/20 text-yellow-400 border-yellow-800",
  },
  APPROVED: {
    label: "Approved",
    cls: "bg-green-900/20 text-green-400 border-green-800",
  },
  REJECTED: {
    label: "Rejected",
    cls: "bg-red-900/20 text-red-400 border-red-800",
  },
};

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  CANCELLED: {
    label: "Cancelled",
    cls: "bg-red-900/20 text-red-400 border-red-800",
  },
  CLOSED: {
    label: "Closed",
    cls: "bg-green-900/20 text-green-400 border-green-800",
  },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    cls: "bg-blue-900/20 text-blue-400 border-blue-800",
  },
  OPEN: {
    label: "Open",
    cls: "bg-yellow-900/20 text-yellow-400 border-yellow-800",
  },
};

const LpoTab: React.FC<LpoTabProps> = ({ project, lpos, onChanged }) => {
  const { convertToDisplay } = useCurrency();
  const { hasAnyRole } = useAuth();
  const currency = project.currency || "NGN";

  const canManage = hasAnyRole([
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.SuperAdmin,
    Role.CEO,
  ]);

  const {
    autoSave: autoSaveLpo,
    restoreData: restoreLpo,
    clearData: clearLpoData,
  } = useFormAutoSave(`project-${project.project_id}-lpo`);

  // --- Create modal state ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateLpoForm>(EMPTY_CREATE_FORM);
  const [rollupNodes, setRollupNodes] = useState<Record<string, WbsRollupNode>>(
    {},
  );

  // --- Payment modal state ---
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentLpo, setPaymentLpo] = useState<LpoData | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  // --- Edit modal state ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editLpo, setEditLpo] = useState<LpoData | null>(null);
  const [editForm, setEditForm] = useState({
    vendor_name: "",
    description: "",
    expected_delivery_date: "",
  });

  // --- Confirm modal state (reject / cancel) ---
  const [confirmAction, setConfirmAction] = useState<{
    type: "reject" | "cancel";
    lpo: LpoData;
  } | null>(null);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);

  const loadRollup = useCallback(async () => {
    try {
      const res = await api.get<WbsRollupNode[]>(
        `/wbs/budget/rollup?projectId=${project.project_id}`,
      );
      const map: Record<string, WbsRollupNode> = {};
      res.data.forEach((n) => {
        map[n.wbs_id] = n;
      });
      setRollupNodes(map);
    } catch {
      setRollupNodes({});
    }
  }, [project.project_id]);

  useEffect(() => {
    if (isCreateOpen) {
      loadRollup();
      const restored = restoreLpo();
      if (restored && confirm("Restore previous LPO draft?")) {
        setCreateForm({ ...EMPTY_CREATE_FORM, ...restored });
      }
    }
  }, [isCreateOpen]);

  const selectedNode = createForm.wbs_id
    ? rollupNodes[createForm.wbs_id]
    : null;
  const remainingCapacity = selectedNode
    ? Math.max(
        0,
        (selectedNode.total_cost_budgeted_rollup ??
          selectedNode.total_cost_budgeted ??
          0) -
          (selectedNode.total_committed_lpo ?? 0) -
          (selectedNode.total_paid_rollup ?? 0),
      )
    : 0;
  const wouldExceed = selectedNode
    ? createForm.amount_committed > remainingCapacity
    : false;

  const resetCreateForm = () => {
    setCreateForm(EMPTY_CREATE_FORM);
  };

  const handleCreateLpo = async () => {
    if (
      !createForm.wbs_id ||
      !createForm.vendor_name.trim() ||
      !createForm.description.trim() ||
      !createForm.amount_committed
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmittingCreate(true);
    try {
      const payload: Record<string, any> = {
        project_id: project.project_id,
        wbs_id: createForm.wbs_id,
        vendor_name: createForm.vendor_name.trim(),
        description: createForm.description.trim(),
        amount_committed: Number(createForm.amount_committed),
      };
      if (createForm.expected_delivery_date)
        payload.expected_delivery_date = createForm.expected_delivery_date;
      if (createForm.override_reason.trim())
        payload.override_reason = createForm.override_reason.trim();

      const res = await api.post<LpoData>("/projects/lpo", payload);
      clearLpoData();
      setIsCreateOpen(false);
      resetCreateForm();
      if (res.data?.approval_status === "PENDING_APPROVAL") {
        toast.success("LPO lodged and routed for approval (over-budget).");
      } else {
        toast.success("LPO lodged. Commitment booked.");
      }
      onChanged();
    } catch (e: any) {
      toast.error(`Failed to lodge LPO: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleApprove = async (lpo: LpoData) => {
    try {
      await api.patch(`/projects/lpo/${lpo.id}/approve`);
      toast.success(`LPO ${lpo.lpo_number} approved. Commitment booked.`);
      onChanged();
    } catch (e: any) {
      toast.error(`Approval failed: ${apiErrorMessage(e)}`);
    }
  };

  const openPayment = (lpo: LpoData) => {
    setPaymentLpo(lpo);
    setPaymentAmount("");
    setPaymentReference("");
    setIsPaymentOpen(true);
  };

  const handlePayment = async () => {
    if (!paymentLpo) return;
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const payload: Record<string, any> = { amount };
      if (paymentReference.trim())
        payload.payment_reference = paymentReference.trim();
      await api.patch(`/projects/lpo/${paymentLpo.id}/payment`, payload);
      setIsPaymentOpen(false);
      toast.success("Payment recorded against LPO.");
      onChanged();
    } catch (e: any) {
      toast.error(`Payment failed: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openEdit = (lpo: LpoData) => {
    setEditLpo(lpo);
    setEditForm({
      vendor_name: lpo.vendor_name,
      description: lpo.description,
      expected_delivery_date: lpo.expected_delivery_date
        ? String(lpo.expected_delivery_date).slice(0, 10)
        : "",
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editLpo) return;
    setIsSubmittingEdit(true);
    try {
      const payload: Record<string, any> = {};
      if (editForm.vendor_name.trim())
        payload.vendor_name = editForm.vendor_name.trim();
      if (editForm.description.trim())
        payload.description = editForm.description.trim();
      if (editForm.expected_delivery_date)
        payload.expected_delivery_date = editForm.expected_delivery_date;
      await api.patch(`/projects/lpo/${editLpo.id}`, payload);
      setIsEditOpen(false);
      toast.success("LPO details updated.");
      onChanged();
    } catch (e: any) {
      toast.error(`Update failed: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setIsSubmittingConfirm(true);
    try {
      if (confirmAction.type === "reject") {
        await api.patch(`/projects/lpo/${confirmAction.lpo.id}/reject`);
        toast.success(`LPO ${confirmAction.lpo.lpo_number} rejected.`);
      } else {
        await api.patch(`/projects/lpo/${confirmAction.lpo.id}/cancel`);
        toast.success(
          `LPO ${confirmAction.lpo.lpo_number} cancelled. Commitment released.`,
        );
      }
      setConfirmAction(null);
      onChanged();
    } catch (e: any) {
      toast.error(`Action failed: ${apiErrorMessage(e)}`);
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  const paymentStatus = (lpo: LpoData) => {
    if (lpo.status === "CANCELLED") return "CANCELLED";
    if (lpo.status === "CLOSED") return "CLOSED";
    if (
      Number(lpo.amount_paid) > 0 &&
      Number(lpo.amount_paid) < Number(lpo.amount_committed)
    )
      return "PARTIALLY_PAID";
    return "OPEN";
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card
        title="Committed Costs (LPOs)"
        accent="secondary"
        className="border border-gray-700 bg-brand-dark/10"
      >
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-400 font-medium">
            Track legal commitments and pending payments to vendors. Over-budget
            commitments require authorisation.
          </p>
          {canManage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> New LPO
            </Button>
          )}
        </div>
        {lpos.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
            No LPOs recorded for this project.
          </div>
        ) : (
          <DataTable<LpoData>
            rows={lpos}
            rowKey={(lpo) => lpo.id}
            columns={[
              {
                key: "lpo_number",
                label: "LPO #",
                tier: "P0",
                get: (lpo) => (
                  <span className="text-sm font-bold text-brand-primary font-mono">{lpo.lpo_number}</span>
                ),
                title: (lpo) => lpo.lpo_number,
              },
              {
                key: "committed",
                label: "Committed",
                tier: "P0",
                cellClassName: "text-right",
                get: (lpo) => (
                  <span className="text-sm text-white font-mono font-bold">{convertToDisplay(lpo.amount_committed, currency)}</span>
                ),
              },
              {
                key: "vendor",
                label: "Vendor",
                tier: "P1",
                get: (lpo) => (
                  <div>
                    <div className="text-sm text-gray-300 truncate">{lpo.vendor_name}</div>
                    {lpo.expected_delivery_date && (
                      <div className="text-xs text-gray-500">
                        Deliver {new Date(lpo.expected_delivery_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ),
                title: (lpo) => lpo.vendor_name,
              },
              {
                key: "raised",
                label: "Raised",
                tier: "P1",
                get: (lpo) => (
                  <div className="text-xs text-gray-500 leading-tight">
                    {lpo.created_at ? new Date(lpo.created_at).toLocaleDateString() : ""}
                    <div>{lpo.createdBy?.email || "System"}</div>
                  </div>
                ),
              },
              {
                key: "wbs",
                label: "WBS",
                tier: "P1",
                get: (lpo) => (
                  <span className="text-sm text-gray-400 font-mono">{lpo.wbsItem?.wbs_code || lpo.wbs_id?.slice(0, 8) || "â€”"}</span>
                ),
              },
              {
                key: "paid",
                label: "Paid",
                tier: "P2",
                cellClassName: "text-right",
                get: (lpo) => (
                  <span className="text-sm text-green-400 font-mono">{convertToDisplay(lpo.amount_paid, currency)}</span>
                ),
              },
              {
                key: "balance",
                label: "Balance",
                tier: "P2",
                cellClassName: "text-right",
                get: (lpo) => (
                  <span className="text-sm text-yellow-400 font-mono">{convertToDisplay(Number(lpo.amount_committed) - Number(lpo.amount_paid), currency)}</span>
                ),
              },
              {
                key: "approval",
                label: "Approval",
                tier: "P2",
                get: (lpo) => {
                  const approval = APPROVAL_BADGES[lpo.approval_status || "APPROVED"] || APPROVAL_BADGES.APPROVED;
                  return (
                    <span className={`px-2 py-1 text-xs font-bold rounded capitalize border ${approval.cls}`}>
                      {approval.label}
                    </span>
                  );
                },
              },
              {
                key: "status",
                label: "Status",
                tier: "P2",
                get: (lpo) => {
                  const status = STATUS_BADGES[paymentStatus(lpo)] || STATUS_BADGES.OPEN;
                  return (
                    <span className={`px-2 py-1 text-xs font-bold rounded capitalize border ${status.cls}`}>
                      {status.label}
                    </span>
                  );
                },
              },
            ]}
            actions={canManage ? [
              {
                key: "approve",
                label: "Approve & book commitment",
                icon: <Check className="w-4 h-4" />,
                primary: true,
                onClick: handleApprove,
                visible: (lpo) => lpo.approval_status === "PENDING_APPROVAL" && lpo.status !== "CANCELLED",
              },
              {
                key: "payment",
                label: "Record payment",
                icon: <CreditCard className="w-4 h-4" />,
                primary: true,
                onClick: openPayment,
                visible: (lpo) => lpo.approval_status === "APPROVED" && lpo.status !== "CANCELLED" && lpo.status !== "CLOSED",
              },
              {
                key: "edit",
                label: "Edit details",
                icon: <Edit className="w-4 h-4" />,
                primary: true,
                onClick: openEdit,
                visible: (lpo) => lpo.status !== "CLOSED" && lpo.status !== "CANCELLED",
              },
              {
                key: "reject",
                label: "Reject",
                icon: <X className="w-4 h-4" />,
                danger: true,
                onClick: (lpo) => setConfirmAction({ type: "reject", lpo }),
                visible: (lpo) => lpo.approval_status === "PENDING_APPROVAL" && lpo.status !== "CANCELLED",
              },
              {
                key: "cancel",
                label: "Cancel LPO",
                icon: <Trash2 className="w-4 h-4" />,
                danger: true,
                onClick: (lpo) => setConfirmAction({ type: "cancel", lpo }),
                visible: (lpo) => lpo.status !== "CLOSED" && lpo.status !== "CANCELLED" && Number(lpo.amount_paid) === 0,
              },
            ] : undefined}
          />
        )}
      </Card>

      {/* New LPO Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Lodge New LPO Commitment"
        size="md"
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateLpo}
              disabled={isSubmittingCreate}
              isLoading={isSubmittingCreate}
            >
              {isSubmittingCreate ? "Lodging..." : "Lodge LPO"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl">
            <p className="text-xs text-brand-secondary font-bold ">
              Government Check
            </p>
            <p className="text-xs text-gray-500 mt-1">
              An LPO is a legal commitment. Over-budget commitments are routed
              to the approvals queue unless a senior authorizer supplies an
              override.
            </p>
          </div>

          <WBSSelect
            projectId={project.project_id}
            value={createForm.wbs_id}
            onChange={(val) => {
              const updated = { ...createForm, wbs_id: val };
              setCreateForm(updated);
              autoSaveLpo(updated);
            }}
            label="WBS Node"
          />

          {selectedNode && (
            <div
              className={`p-3 rounded-lg border ${remainingCapacity > 0 ? "bg-brand-dark/50 border-gray-700" : "bg-yellow-900/10 border-yellow-800/40"}`}
            >
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">
                  {selectedNode.wbs_code} remaining capacity
                </span>
                <span className="text-white font-mono">
                  {convertToDisplay(remainingCapacity, currency)}
                </span>
              </div>
              {wouldExceed && (
                <div className="mt-2 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-yellow-200/80 leading-relaxed">
                    This commitment exceeds the node&apos;s remaining capacity and
                    will be routed to the pending-approvals queue unless
                    overridden by an authorised senior role.
                  </p>
                </div>
              )}
            </div>
          )}

          <Input
            label="Vendor Name"
            placeholder="e.g., Enerco Power Ltd"
            value={createForm.vendor_name}
            onChange={(e) => {
              const updated = { ...createForm, vendor_name: e.target.value };
              setCreateForm(updated);
              autoSaveLpo(updated);
            }}
          />

          <Input
            label="Description"
            placeholder="e.g., Supply & installation of 5.5kVA generator"
            value={createForm.description}
            onChange={(e) => {
              const updated = { ...createForm, description: e.target.value };
              setCreateForm(updated);
              autoSaveLpo(updated);
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Committed Amount"
              type="number"
              value={createForm.amount_committed}
              onChange={(e) => {
                const updated = {
                  ...createForm,
                  amount_committed: parseFloat(e.target.value),
                };
                setCreateForm(updated);
                autoSaveLpo(updated);
              }}
            />
            <Input
              label="Expected Delivery"
              type="date"
              value={createForm.expected_delivery_date}
              onChange={(e) => {
                const updated = {
                  ...createForm,
                  expected_delivery_date: e.target.value,
                };
                setCreateForm(updated);
                autoSaveLpo(updated);
              }}
            />
          </div>

          {wouldExceed && (
            <Input
              label="Override Justification (required for inline approval by CFO/CEO/Admin Director)"
              placeholder="Business case for exceeding the WBS capacity..."
              value={createForm.override_reason}
              onChange={(e) => {
                const updated = {
                  ...createForm,
                  override_reason: e.target.value,
                };
                setCreateForm(updated);
                autoSaveLpo(updated);
              }}
            />
          )}
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title={`Record Payment â€” ${paymentLpo?.lpo_number || ""}`}
        size="md"
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="secondary" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePayment}
              isLoading={isSubmittingPayment}
              disabled={isSubmittingPayment}
            >
              {isSubmittingPayment ? "Recording..." : "Confirm Payment"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Committed:{" "}
            <span className="text-white font-mono font-bold">
              {convertToDisplay(paymentLpo?.amount_committed || 0, currency)}
            </span>{" "}
            Â· Paid:{" "}
            <span className="text-green-400 font-mono font-bold">
              {convertToDisplay(paymentLpo?.amount_paid || 0, currency)}
            </span>{" "}
            Â· Balance:{" "}
            <span className="text-yellow-400 font-mono font-bold">
              {convertToDisplay(
                Number(paymentLpo?.amount_committed || 0) -
                  Number(paymentLpo?.amount_paid || 0),
                currency,
              )}
            </span>
          </p>
          <Input
            label={`Payment Amount (${currency})`}
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />
          <Input
            label="Payment Reference (optional)"
            placeholder="e.g., Teller / transfer ref"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
          />
        </div>
      </Modal>

      {/* Edit LPO Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit LPO â€” ${editLpo?.lpo_number || ""}`}
        size="md"
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleEditSubmit}
              isLoading={isSubmittingEdit}
              disabled={isSubmittingEdit}
            >
              {isSubmittingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-lg flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-brand-primary leading-relaxed">
              Financial fields (amount, WBS line, LPO number) are immutable to
              preserve the commitment audit trail.
            </p>
          </div>
          <Input
            label="Vendor Name"
            value={editForm.vendor_name}
            onChange={(e) =>
              setEditForm({ ...editForm, vendor_name: e.target.value })
            }
          />
          <Input
            label="Description"
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
          />
          <Input
            label="Expected Delivery"
            type="date"
            value={editForm.expected_delivery_date}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                expected_delivery_date: e.target.value,
              })
            }
          />
        </div>
      </Modal>

      {/* Reject / Cancel Confirm Modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.type === "reject" ? "Reject LPO" : "Cancel LPO"}
      >
        <div className="space-y-4 pt-4 text-center">
          <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">
            {confirmAction?.type === "reject"
              ? "Reject this commitment?"
              : "Cancel this LPO?"}
          </h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            {confirmAction?.type === "reject" ? (
              <>
                Rejecting <strong>{confirmAction?.lpo?.lpo_number}</strong>{" "}
                voids the commitment. No value is booked against the budget.
              </>
            ) : (
              <>
                Cancelling <strong>{confirmAction?.lpo?.lpo_number}</strong>{" "}
                releases its committed value from the WBS budget.
              </>
            )}
          </p>
          <div className="flex gap-2 justify-center pt-6">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              Keep LPO
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={handleConfirmAction}
              isLoading={isSubmittingConfirm}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LpoTab;
