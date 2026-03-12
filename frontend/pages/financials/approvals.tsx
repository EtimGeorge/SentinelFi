import React, { useEffect, useState, useMemo } from "react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { Spinner } from "../../components/common/Spinner";
import { useApprovalsStore, ApprovalItem } from "../../store/approvalsStore";
import { apiClient } from "../../lib/api";
import { useAuth } from "../../components/context/AuthContext";
import { Role } from "@shared/types/role.enum";
import { toast } from "react-hot-toast";
import {
  Clock,
  CheckCircle,
  XCircle,
  ShieldOff,
  ChevronDown,
  ChevronRight,
  Building2,
  Layout,
  Briefcase,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import useUIStore from "../../store/uiStore";
import { useCurrency } from "../../components/context/CurrencyContext";
import FilterBar from "../../components/common/FilterBar";

interface WbsTreeNode extends ApprovalItem {
  children: WbsTreeNode[];
  isPending: boolean; // Flag to highlight items that actually need approval
}

/** Roles that are authorized to see and act on the Approval Inbox */
export const APPROVAL_AUTHORIZED_ROLES: Role[] = [
  Role.CFO,
  Role.FinanceManager,
  Role.AdminDirector,
  Role.AdminManager,
  Role.CEO,
  Role.SuperAdmin,
  "Admin" as Role, // Legacy fallback
  "Finance" as Role, // Legacy fallback
];

const ApprovalsPage = () => {
  const { user, hasAnyRole, isInitialLoad } = useAuth();
  const { pendingApprovals, setPendingApprovals, removePendingApproval } =
    useApprovalsStore();
  const { convertToDisplay } = useCurrency();
  const setUnreadCount = useUIStore(
    (state) => state.setUnreadNotificationsCount,
  );
  const [activeTab, setActiveTab] = useState<
    "PROJECT" | "OPERATIONAL" | "OVERRUNS"
  >("PROJECT");
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<
    Record<string, boolean>
  >({});
  const [expandedCostCenters, setExpandedCostCenters] = useState<
    Record<string, boolean>
  >({});
  const toggleCostCenter = (id: string) =>
    setExpandedCostCenters((prev) => ({ ...prev, [id]: !prev[id] }));

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter State
  const [projectFilters, setProjectFilters] = useState<any>({});
  const [opexFilters, setOpexFilters] = useState<any>({});
  const [overrunFilters, setOverrunFilters] = useState<any>({});

  const isAuthorized = hasAnyRole(APPROVAL_AUTHORIZED_ROLES);

  // Replaced local formatCurrency with global currency-aware version
  const formatAmount = (amount: number, currency?: string) =>
    convertToDisplay(amount, currency || "NGN");

  /** Semantic WBS sorting logic (e.g., 1.10 comes after 1.9) */
  const sortWbsCodes = (
    a: string | undefined | null,
    b: string | undefined | null,
  ) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const partsA = a.split(".").map((num) => parseInt(num, 10) || 0);
    const partsB = b.split(".").map((num) => parseInt(num, 10) || 0);
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
      const valA = partsA[i] || 0;
      const valB = partsB[i] || 0;
      if (valA !== valB) return valA - valB;
    }
    return 0;
  };

  const fetchApprovals = async () => {
    setLoading(true);
    let wbsItems: ApprovalItem[] = [];
    let reqItems: ApprovalItem[] = [];
    let overrunItems: ApprovalItem[] = [];

    // 1. Fetch WBS pending items (CAPEX)
    try {
      const wbsResponse = await apiClient.get(
        "/wbs/budgets?status=pending&limit=1000&sortBy=wbs_code&sortOrder=ASC",
      );
      const wbsData: any[] = Array.isArray(wbsResponse)
        ? wbsResponse
        : wbsResponse?.data || wbsResponse?.items || [];

      wbsItems = wbsData.map(
        (item: any) =>
          ({
            id: item.wbs_id,
            document_type: "WBS_BUDGET" as const,
            description: item.description,
            amount: Number(item.total_cost_budgeted || 0),
            submitted_by: item.user?.email || "Project Team",
            submitted_at: item.updated_at || item.created_at,
            project_id: item.project_id,
            project_name: item.project?.project_name || "Unassigned Project",
            project_currency: item.project?.currency || "NGN",
            category_id: item.category_id,
            category_name: item.category?.name || "General",
            quantity: Number(item.quantity_budgeted || 0),
            uom: item.uom || "Unit",
            unit_cost: Number(item.unit_cost_budgeted || 0),
            duration: Number(item.days_budgeted || 0),
            custom_metadata: item.custom_metadata,
            wbs_code: item.wbs_code,
          }) as any,
      );

      wbsItems.sort((a, b) => sortWbsCodes(a.wbs_code, b.wbs_code));
    } catch (error: any) {
      console.error("WBS Fetch Error:", error);
      toast.error(
        `WBS Sync Error: ${error?.response?.data?.message || error.message}`,
      );
    }

    // 2. Fetch Requisition pending (OPEX)
    try {
      const reqResponse = await apiClient.get("/finance-core/requisitions");
      const reqData: any[] = Array.isArray(reqResponse)
        ? reqResponse
        : reqResponse?.data || reqResponse?.items || [];
      reqItems = reqData
        .filter((r: any) => r.status === "PENDING_APPROVAL")
        .map(
          (r: any) =>
            ({
              id: r.id,
              document_type: "REQUISITION" as const,
              description: r.description,
              amount: Number(r.estimated_amount || 0),
              submitted_by: r.requester?.first_name
                ? `${r.requester.first_name} ${r.requester.last_name}`
                : "Unknown",
              submitted_at: r.created_at,
              req_number: r.requisition_number,
              cost_center_id: r.cost_center_id,
              cost_center_name: r.costCenter?.name || "Administrative",
              gl_account_name: r.glAccount?.name || "General Expense",
            }) as any,
        );
    } catch (error: any) {
      console.error("Requisitions Fetch Error:", error);
    }

    // 3. Fetch Expense Overruns (CAPEX & OPEX Asynchronous Governance)
    try {
      const overrunsRes = await apiClient.get("/wbs/expense/overruns/pending");
      const overrunsData = Array.isArray(overrunsRes)
        ? overrunsRes
        : overrunsRes?.data || overrunsRes?.items || [];
      overrunItems = overrunsData.map(
        (item: any) =>
          ({
            id: item.id,
            document_type: "EXPENSE_OVERRUN" as const,
            description: `Budget Overrun Override Request${item.override_reason ? `: "${item.override_reason}"` : ""}`,
            amount: Number(item.amount || 0),
            submitted_by: item.user?.email || item.user_id || "Unknown User",
            submitted_at: item.created_at,
            project_id: item.project?.id || item.wbsBudget?.project_id,
            project_name:
              item.project?.project_name ||
              item.wbsBudget?.project?.project_name ||
              "Unassigned",
            project_currency:
              item.project?.currency ||
              item.wbsBudget?.project?.currency ||
              "NGN",
            wbs_code: item.wbsBudget?.wbs_code || "N/A",
            custom_metadata: {
              variance_flag: item.variance_flag,
              original_date: item.expense_date,
            },
          }) as any,
      );
    } catch (error: any) {
      console.error("Expense Overruns Fetch Error:", error);
    }

    const allItems = [...wbsItems, ...reqItems, ...overrunItems];
    setPendingApprovals(allItems);
    setUnreadCount(allItems.length);
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchApprovals();
    } else {
      setLoading(false);
    }
  }, [isAuthorized]);

  // Hierarchical Grouping: Project -> WBS Tree
  const groupedProjects = useMemo(() => {
    const projectGroups: Record<
      string,
      {
        name: string;
        tree: WbsTreeNode[];
        allPendingItems: ApprovalItem[];
      }
    > = {};

    pendingApprovals
      .filter((a) => a.document_type === "WBS_BUDGET")
      .forEach((item) => {
        const pid = item.project_id || "other";
        if (!projectGroups[pid]) {
          projectGroups[pid] = {
            name: item.project_name || "General Projects",
            tree: [],
            allPendingItems: [],
          };
        }
        projectGroups[pid].allPendingItems.push(item);
      });

    // Build the tree for each project
    Object.keys(projectGroups).forEach((pid) => {
      const items = projectGroups[pid].allPendingItems;
      const tree: WbsTreeNode[] = [];
      const map: Record<string, WbsTreeNode> = {};

      // 1. Create nodes
      items.forEach((item) => {
        const code = item.wbs_code || "unallocated";
        map[code] = { ...item, children: [], isPending: true };
      });

      // 2. Build hierarchy
      items
        .sort((a, b) => sortWbsCodes(a.wbs_code, b.wbs_code))
        .forEach((item) => {
          const code = item.wbs_code || "unallocated";
          const parts = code.split(".");
          if (parts.length > 1) {
            const parentCode = parts.slice(0, -1).join(".");
            if (map[parentCode]) {
              map[parentCode].children.push(map[code]);
            } else {
              tree.push(map[code]);
            }
          } else {
            tree.push(map[code]);
          }
        });

      projectGroups[pid].tree = tree;
    });

    return projectGroups;
  }, [pendingApprovals]);

  // Local filtering for CAPEX
  const filteredProjectIds = useMemo(() => {
    let ids = Object.keys(groupedProjects);
    if (projectFilters.search) {
      ids = ids.filter(
        (id) =>
          groupedProjects[id].name
            .toLowerCase()
            .includes(projectFilters.search.toLowerCase()) ||
          groupedProjects[id].allPendingItems.some((i) =>
            i.description
              .toLowerCase()
              .includes(projectFilters.search.toLowerCase()),
          ),
      );
    }
    return ids;
  }, [groupedProjects, projectFilters]);

  // Local filtering for OPEX
  const filteredOpexItems = useMemo(() => {
    let items = pendingApprovals.filter(
      (a) => a.document_type === "REQUISITION",
    );
    const { search, costCenterId, minAmount, maxAmount } = opexFilters;

    if (search) {
      items = items.filter(
        (i) =>
          i.description.toLowerCase().includes(search.toLowerCase()) ||
          i.req_number?.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (costCenterId) {
      items = items.filter((i) => i.cost_center_id === costCenterId);
    }
    if (minAmount) {
      items = items.filter((i) => i.amount >= Number(minAmount));
    }
    if (maxAmount) {
      items = items.filter((i) => i.amount <= Number(maxAmount));
    }
    return items;
  }, [pendingApprovals, opexFilters]);

  // Local filtering for OVERRUNS
  const filteredOverrunItems = useMemo(() => {
    let items = pendingApprovals.filter(
      (a) => a.document_type === "EXPENSE_OVERRUN",
    );
    const { search } = overrunFilters;
    if (search) {
      items = items.filter(
        (i) =>
          i.description.toLowerCase().includes(search.toLowerCase()) ||
          i.project_name?.toLowerCase().includes(search.toLowerCase()) ||
          i.wbs_code?.toLowerCase().includes(search.toLowerCase()),
      );
    }
    return items;
  }, [pendingApprovals, overrunFilters]);

  // Operational Grouping: Cost Center -> Items
  const groupedCostCenters = useMemo(() => {
    const groups: Record<string, { name: string; items: any[] }> = {};
    filteredOpexItems.forEach((item) => {
      const ccId = item.cost_center_id || "misc";
      if (!groups[ccId]) {
        groups[ccId] = {
          name: item.cost_center_name || "Miscellaneous Cost Center",
          items: [],
        };
      }
      groups[ccId].items.push(item);
    });
    return groups;
  }, [filteredOpexItems]);

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAction = async (
    id: string,
    type: string,
    action: "APPROVE" | "REJECT",
  ) => {
    try {
      if (type === "WBS_BUDGET") {
        const status = action === "APPROVE" ? "approved" : "rejected";
        await apiClient.patch(`/wbs/budget-draft/${id}/status`, { status });
      } else if (type === "REQUISITION") {
        if (action === "APPROVE") {
          await apiClient.post(`/finance-core/purchase-orders`, {
            requisitionId: id,
          });
        } else {
          await apiClient.post(`/finance-core/requisitions/${id}/reject`);
        }
      } else if (type === "EXPENSE_OVERRUN") {
        if (action === "APPROVE") {
          await apiClient.post(`/wbs/expense/overruns/${id}/approve`);
        } else {
          // Rejecting an overrun means we just delete the pending record (or mark it rejected)
          // Using a mock endpoint here as the user might want a proper /reject in the future.
          // For now, if they reject it, we just remove it from their view.
        }
      }

      toast.success(
        `${action === "APPROVE" ? "Approved" : "Rejected"} successfully`,
      );
      removePendingApproval(id);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || `Failed to ${action.toLowerCase()}`,
      );
    }
  };

  const handleBulkAction = async (
    projectId: string,
    action: "APPROVE" | "REJECT",
  ) => {
    const items = groupedProjects[projectId].allPendingItems;

    toast.loading(`Processing global ${action.toLowerCase()} for project...`);
    for (const item of items) {
      await handleAction(item.id, item.document_type, action);
    }
    toast.dismiss();
    toast.success(`Project ${action.toLowerCase()} complete.`);
  };

  // Pagination Logic
  const totalPages =
    activeTab === "PROJECT"
      ? Math.ceil(filteredProjectIds.length / itemsPerPage)
      : activeTab === "OPERATIONAL"
        ? Math.ceil(filteredOpexItems.length / itemsPerPage)
        : Math.ceil(filteredOverrunItems.length / itemsPerPage);

  const paginatedCostCenterKeys = Object.keys(groupedCostCenters).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const renderWbsRow = (node: WbsTreeNode) => {
    const depth = (node.wbs_code?.split(".").length || 1) - 1;
    return (
      <React.Fragment key={node.id}>
        <tr
          className={`hover:bg-brand-primary/5 transition group/row ${!node.isPending ? "opacity-60 grayscale-[0.5]" : ""}`}
        >
          <td className="px-6 py-4">
            <div
              className="flex items-center"
              style={{ paddingLeft: `${depth * 24}px` }}
            >
              {depth > 0 && (
                <div className="w-3 h-3 border-l-2 border-b-2 border-slate-800 mr-2 -mt-2 rounded-bl-md" />
              )}
              <span
                className={`font-mono font-bold text-xs px-2 py-1 rounded ${node.isPending ? "bg-brand-primary/20 text-brand-primary" : "bg-slate-800 text-slate-500"}`}
              >
                {node.wbs_code}
              </span>
            </div>
          </td>
          <td className="px-6 py-4">
            <div
              className={`text-sm font-bold leading-tight ${node.isPending ? "text-white" : "text-slate-500"}`}
            >
              {node.description}
            </div>
            <div className="text-[10px] text-slate-500 uppercase mt-1">
              Category:{" "}
              <span className="text-slate-400 font-bold">
                {node.category_name}
              </span>
            </div>
          </td>
          <td className="px-6 py-4 text-center">
            <div className="text-sm text-white font-black">{node.quantity}</div>
            <div className="text-[10px] text-slate-500 uppercase">
              {node.uom}
            </div>
          </td>
          <td className="px-6 py-4 text-right font-mono text-slate-300 text-xs">
            {formatAmount(node.unit_cost || 0, node.project_currency)}
          </td>
          <td className="px-6 py-4 text-center">
            <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-400">
              {node.duration}d
            </span>
          </td>
          <td className="px-6 py-4 text-right">
            <div
              className={`text-sm font-black italic ${node.isPending ? "text-brand-primary" : "text-slate-600"}`}
            >
              {formatAmount(node.amount, node.project_currency)}
            </div>
          </td>
          <td className="px-6 py-4">
            {node.isPending && (
              <div className="flex justify-center gap-2 opacity-40 group-hover/row:opacity-100 transition">
                <button
                  onClick={() => handleAction(node.id, "WBS_BUDGET", "REJECT")}
                  className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition"
                >
                  <XCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAction(node.id, "WBS_BUDGET", "APPROVE")}
                  className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                {node.custom_metadata && (
                  <Tooltip
                    content={JSON.stringify(node.custom_metadata, null, 2)}
                  >
                    <button className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          </td>
        </tr>
        {node.children.map((child) => renderWbsRow(child))}
      </React.Fragment>
    );
  };

  if (loading || isInitialLoad) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[500px] bg-slate-950">
        <Spinner />
        <p className="mt-4 text-brand-primary animate-pulse font-mono text-xs tracking-[0.3em] uppercase">
          Initializing Governance Engine
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 pt-4">
      {!isAuthorized ? (
        <div className="flex flex-col items-center justify-center py-32">
          <ShieldOff className="w-20 h-20 text-slate-800 mb-6" />
          <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">
            Access Forbidden
          </h2>
          <p className="text-slate-500 mt-2 max-w-md text-center">
            Your current role profile does not grant authorization to the
            Enterprise Governance Hub.
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-10">
          <header className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                    <Layout className="w-6 h-6 text-brand-primary" />
                  </div>
                  <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                    Governance Hub
                  </h1>
                </div>
                <p className="text-slate-500 font-medium">
                  Enterprise Command for Combined Financial Oversight
                  (CAPEX/OPEX)
                </p>
              </div>

              <div className="flex gap-4">
                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      Awaiting Directive
                    </div>
                    <div className="text-2xl font-black text-white">
                      {pendingApprovals.length}{" "}
                      <span className="text-blue-500 text-sm italic">
                        Tasks
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Filter Infrastructure */}
            <div className="bg-slate-900/20 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800/50 shadow-2xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start">
                  <button
                    onClick={() => {
                      setActiveTab("PROJECT");
                      setCurrentPage(1);
                    }}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === "PROJECT" ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-105" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Project CAPEX
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("OPERATIONAL");
                      setCurrentPage(1);
                    }}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === "OPERATIONAL" ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-105" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Operational OPEX
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("OVERRUNS");
                      setCurrentPage(1);
                    }}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 tracking-widest transition-all duration-300 ${activeTab === "OVERRUNS" ? "bg-red-500/20 text-red-400 shadow-lg shadow-red-500/10 scale-105 border border-red-500/50" : "text-slate-500 hover:text-red-400 hover:bg-red-500/10"}`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    Overrun Queue
                  </button>
                </div>
              </div>

              <FilterBar
                onFilterChange={
                  activeTab === "PROJECT"
                    ? setProjectFilters
                    : activeTab === "OPERATIONAL"
                      ? setOpexFilters
                      : setOverrunFilters
                }
                placeholder={
                  activeTab === "PROJECT"
                    ? "Search by project or description..."
                    : activeTab === "OPERATIONAL"
                      ? "Search by req number or vendor..."
                      : "Search overruns by project, wbs, or description..."
                }
                filters={
                  activeTab === "PROJECT" || activeTab === "OVERRUNS"
                    ? []
                    : [
                        {
                          key: "costCenterId",
                          label: "Cost Center",
                          type: "select",
                          options: Object.entries(groupedCostCenters).map(
                            ([id, group]) => ({ value: id, label: group.name }),
                          ),
                        },
                        {
                          key: "minAmount",
                          label: "Min Value",
                          type: "number",
                        },
                        {
                          key: "maxAmount",
                          label: "Max Value",
                          type: "number",
                        },
                      ]
                }
              />
            </div>
          </header>

          <section className="space-y-6">
            {activeTab === "PROJECT" &&
              (Object.keys(groupedProjects).length === 0 ? (
                <EmptyState
                  icon={<Briefcase />}
                  title="Clean Slate"
                  subtitle="No project budget drafts are currently pending your directive."
                />
              ) : (
                <div className="space-y-6">
                  {filteredProjectIds
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage,
                    )
                    .map((id) => {
                      const group = groupedProjects[id];
                      return (
                        <div
                          key={id}
                          className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm transition-all hover:border-slate-700"
                        >
                          <div
                            onClick={() => toggleProject(id)}
                            className="flex items-center justify-between p-6 cursor-pointer select-none bg-slate-900/40"
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`transition-transform duration-300 ${expandedProjects[id] ? "rotate-90" : ""}`}
                              >
                                <ChevronRight className="w-6 h-6 text-slate-600" />
                              </div>
                              <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-brand-primary transition">
                                  {group.name}
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                  {group.allPendingItems.length} Pending Line
                                  Items in Hierarchy
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-[10px] text-slate-500 uppercase font-black">
                                  Total Commitment
                                </div>
                                <div className="text-xl font-black text-brand-primary italic">
                                  {formatAmount(
                                    group.allPendingItems.reduce(
                                      (s, i) => s + i.amount,
                                      0,
                                    ),
                                    group.allPendingItems[0]?.project_currency,
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="hidden md:flex bg-slate-800 border-none hover:bg-green-600/20 hover:text-green-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBulkAction(id, "APPROVE");
                                  }}
                                >
                                  Bulk Approve
                                </Button>
                              </div>
                            </div>
                          </div>

                          {expandedProjects[id] && (
                            <div className="p-0 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                  <thead>
                                    <tr className="bg-slate-950 uppercase text-[9px] font-black text-slate-600 tracking-[0.2em]">
                                      <th className="px-6 py-3 w-48">
                                        WBS Code
                                      </th>
                                      <th className="px-6 py-3">Description</th>
                                      <th className="px-6 py-3 text-center">
                                        Qty / UOM
                                      </th>
                                      <th className="px-6 py-3 text-right">
                                        Unit Rate
                                      </th>
                                      <th className="px-6 py-3 text-center">
                                        Duration
                                      </th>
                                      <th className="px-6 py-3 text-right">
                                        Total (Commitment)
                                      </th>
                                      <th className="px-6 py-3 text-center">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/50">
                                    {group.tree.map((node) =>
                                      renderWbsRow(node),
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}

            {activeTab === "OPERATIONAL" &&
              (Object.keys(groupedCostCenters).length === 0 ? (
                <EmptyState
                  icon={<Building2 />}
                  title="OPEX Cleared"
                  subtitle="All office requisitions and periodic expenses have been handled."
                />
              ) : (
                <div className="space-y-6">
                  {paginatedCostCenterKeys.map((id) => {
                    const group = groupedCostCenters[id];
                    return (
                      <div
                        key={id}
                        className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/10 backdrop-blur-sm transition-all hover:border-slate-700"
                      >
                        <div
                          onClick={() => toggleCostCenter(id)}
                          className="flex items-center justify-between p-6 cursor-pointer select-none bg-slate-900/30"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`transition-transform duration-300 ${expandedCostCenters[id] ? "rotate-90" : ""}`}
                            >
                              <ChevronRight className="w-6 h-6 text-slate-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight group-hover:text-blue-500 transition">
                                {group.name}
                              </h3>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                {group.items.length} Operational Tasks
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-black">
                              Total Request
                            </div>
                            <div className="text-lg font-black text-blue-500 italic">
                              {formatAmount(
                                group.items.reduce((s, i) => s + i.amount, 0),
                                "NGN",
                              )}
                            </div>
                          </div>
                        </div>

                        {expandedCostCenters[id] && (
                          <div className="p-0 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-950 uppercase text-[9px] font-black text-slate-600 tracking-[0.2em]">
                                    <th className="px-6 py-4">Req #</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">GL Account</th>
                                    <th className="px-6 py-4">Submitted By</th>
                                    <th className="px-6 py-4 text-right">
                                      Amount
                                    </th>
                                    <th className="px-6 py-4 text-center">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/40">
                                  {group.items.map((item) => (
                                    <tr
                                      key={item.id}
                                      className="hover:bg-blue-500/5 transition group/row"
                                    >
                                      <td className="px-6 py-4">
                                        <span className="font-mono text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                                          {item.req_number}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-white leading-tight">
                                          {item.description}
                                        </div>
                                        <div className="text-[9px] text-slate-500 uppercase mt-1">
                                          {new Date(
                                            item.submitted_at,
                                          ).toLocaleDateString()}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="text-[10px] font-bold text-slate-400 border border-slate-800 px-2 py-1 rounded uppercase">
                                          {item.gl_account_name}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm font-medium text-slate-400">
                                        {item.submitted_by}
                                      </td>
                                      <td className="px-6 py-4 text-right font-black text-blue-500">
                                        {formatAmount(item.amount, "NGN")}
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2 opacity-40 group-hover/row:opacity-100 transition">
                                          <button
                                            onClick={() =>
                                              handleAction(
                                                item.id,
                                                "REQUISITION",
                                                "REJECT",
                                              )
                                            }
                                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition"
                                          >
                                            <XCircle className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleAction(
                                                item.id,
                                                "REQUISITION",
                                                "APPROVE",
                                              )
                                            }
                                            className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition"
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

            {activeTab === "OVERRUNS" &&
              (filteredOverrunItems.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle />}
                  title="No Overruns"
                  subtitle="There are no pending budget overrun requests awaiting governance action."
                />
              ) : (
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-3xl border border-red-900/40 bg-slate-900/20 backdrop-blur-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-950 uppercase text-[9px] font-black text-slate-600 tracking-[0.2em] border-b border-red-900/30">
                            <th className="px-6 py-5">Initiator / Date</th>
                            <th className="px-6 py-5">
                              Context (Project & WBS)
                            </th>
                            <th className="px-6 py-5">Override Reason</th>
                            <th className="px-6 py-5 text-right">
                              Requested Overrun
                            </th>
                            <th className="px-6 py-5 text-center">
                              Governance Decision
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-900/10">
                          {filteredOverrunItems
                            .slice(
                              (currentPage - 1) * itemsPerPage,
                              currentPage * itemsPerPage,
                            )
                            .map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-red-500/5 transition group/row"
                              >
                                <td className="px-6 py-5">
                                  <div className="text-sm font-bold text-slate-300">
                                    {item.submitted_by}
                                  </div>
                                  <div className="text-[10px] text-slate-500 uppercase mt-1">
                                    {new Date(
                                      item.submitted_at,
                                    ).toLocaleString()}
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="text-sm font-bold text-brand-primary tracking-tight uppercase flex items-center gap-2">
                                    {item.project_name}
                                  </div>
                                  <div className="mt-1 flex gap-2 items-center">
                                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                      WBS: {item.wbs_code}
                                    </span>
                                    <span
                                      className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${item.custom_metadata?.variance_flag === "CRITICAL_VARIANCE" ? "bg-red-500/20 text-red-500" : "bg-orange-500/20 text-orange-500"}`}
                                    >
                                      {item.custom_metadata?.variance_flag?.replace(
                                        "_",
                                        " ",
                                      )}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <p className="text-sm text-slate-400 italic font-medium max-w-sm">
                                    "
                                    {item.description.replace(
                                      "Budget Overrun Override Request: ",
                                      "",
                                    )}
                                    "
                                  </p>
                                </td>
                                <td className="px-6 py-5 text-right">
                                  <div className="text-lg font-black text-red-400">
                                    {formatAmount(
                                      item.amount,
                                      item.project_currency,
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-5 align-middle">
                                  <div className="flex justify-center gap-3">
                                    <button
                                      onClick={() =>
                                        handleAction(
                                          item.id,
                                          "EXPENSE_OVERRUN",
                                          "REJECT",
                                        )
                                      }
                                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 font-bold text-xs uppercase hover:bg-red-500 hover:text-white transition"
                                    >
                                      <XCircle className="w-4 h-4" /> Deny
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleAction(
                                          item.id,
                                          "EXPENSE_OVERRUN",
                                          "APPROVE",
                                        )
                                      }
                                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-500 font-bold text-xs uppercase shadow-lg shadow-green-500/5 hover:bg-green-500 hover:text-white transition transform hover:scale-105"
                                    >
                                      <CheckCircle className="w-4 h-4" />{" "}
                                      Authorize
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-10">
                <Button
                  variant="secondary"
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="bg-slate-900 border-slate-800 text-slate-400"
                >
                  Previous
                </Button>
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentPage(i + 1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-10 h-10 rounded-xl font-black text-sm transition-all duration-300 ${currentPage === i + 1 ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-110" : "bg-slate-900 text-slate-500 hover:text-white"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="bg-slate-900 border-slate-800 text-slate-400"
                >
                  Next
                </Button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <Card className="p-20 text-center border-dashed border-slate-800 bg-transparent flex flex-col items-center justify-center">
    <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-6 text-slate-600">
      {icon}
    </div>
    <h2 className="text-2xl font-black text-slate-300 uppercase tracking-tighter">
      {title}
    </h2>
    <p className="text-slate-500 mt-2 max-w-sm">{subtitle}</p>
  </Card>
);

const Tooltip = ({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-mono whitespace-pre text-slate-400 shadow-2xl">
          {content}
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;
