import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  Search, X, ChevronRight, FileText, DollarSign, Briefcase, Users, Building2, BarChart2, AlertTriangle, Zap, FolderOpen, LayoutDashboard, Settings,
} from "lucide-react";
import { useRouter } from "next/router";
import { apiClient } from "../../lib/api";

interface SearchResult {
  type:
    | "project"
    | "budget"
    | "expense"
    | "requisition"
    | "purchaseOrder"
    | "invoice"
    | "page"
    | "report"
    | "user"
    | "wbs";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  metadata?: Record<string, any>;
}

interface SearchGroup {
  label: string;
  icon: React.ReactNode;
  results: SearchResult[];
  color: string;
}

const SEARCH_GROUPS: SearchGroup[] = [
  {
    label: "Projects", icon: <FolderOpen className="w-4 h-4" />, results: [], color: "text-brand-primary",
  },
  {
    label: "Budgets & WBS", icon: <DollarSign className="w-4 h-4" />, results: [], color: "text-brand-secondary",
  },
  {
    label: "Expenses", icon: <Zap className="w-4 h-4" />, results: [], color: "text-alert-critical",
  },
  {
    label: "Procurement (P2P)", icon: <Briefcase className="w-4 h-4" />, results: [], color: "text-opx-cyan",
  },
  {
    label: "Reports & Analytics", icon: <BarChart2 className="w-4 h-4" />, results: [], color: "text-alert-positive",
  },
  {
    label: "Pages & Actions", icon: <LayoutDashboard className="w-4 h-4" />, results: [], color: "text-gray-400",
  },
];

const PAGE_RESULTS: SearchResult[] = [
  {
    type: "page", id: "dashboard", title: "Dashboard", subtitle: "Executive overview", href: "/dashboard/home", icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    type: "page", id: "financial-intelligence", title: "Financial Intelligence", subtitle: "CAPEX/OPEX analytics", href: "/financials/intelligence", icon: <BarChart2 className="w-4 h-4" />,
  },
  {
    type: "page", id: "wbs", title: "WBS Manager", subtitle: "Hierarchical cost structure", href: "/financials/projects/wbs", icon: <FolderOpen className="w-4 h-4" />,
  },
  {
    type: "page", id: "budgets", title: "Budget Management", subtitle: "View & approve budgets", href: "/financials/projects/budgets", icon: <DollarSign className="w-4 h-4" />,
  },
  {
    type: "page", id: "expenses", title: "Expense Management", subtitle: "Live expense tracking", href: "/financials/projects/expenses", icon: <Zap className="w-4 h-4" />,
  },
  {
    type: "page", id: "procurement", title: "P2P Desk", subtitle: "Requisitions → PO → Invoice", href: "/financials/operations/procurement", icon: <Briefcase className="w-4 h-4" />,
  },
  {
    type: "page", id: "approvals", title: "Approvals Hub", subtitle: "Pending approvals", href: "/financials/approvals", icon: <AlertTriangle className="w-4 h-4" />,
  },
  {
    type: "page", id: "reporting", title: "Reporting", subtitle: "Variance & performance", href: "/reporting", icon: <FileText className="w-4 h-4" />,
  },
  {
    type: "page", id: "projects", title: "Project Portfolio", subtitle: "All projects overview", href: "/financials/projects", icon: <Briefcase className="w-4 h-4" />,
  },
  {
    type: "page", id: "settings", title: "Settings", subtitle: "User & tenant settings", href: "/settings", icon: <Settings className="w-4 h-4" />,
  },
];

const GROUP_KEYWORDS: Record<string, string[]> = {
  projects: ["project", "portfolio"], budgets: ["budget", "wbs", "capex", "cost structure"], expenses: ["expense", "spend", "actual", "variance", "log expense"], procurement: [
    "procurement",
    "requisition",
    "purchase order",
    "po",
    "invoice",
    "p2p",
    "vendor",
  ], reports: [
    "report",
    "analytics",
    "variance",
    "forecast",
    "performance",
    "intelligence",
  ], pages: ["dashboard", "settings", "approval", "approvals"],
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
};

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isMobile = useIsMobile();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(SEARCH_GROUPS.map((g) => ({ ...g, results: [] })));
      return;
    }

    setIsLoading(true);
    const lowerQuery = q.toLowerCase();

    const pageMatches = PAGE_RESULTS.filter(
      (p) =>
        p.title.toLowerCase().includes(lowerQuery) ||
        p.subtitle.toLowerCase().includes(lowerQuery),
    );

    const groupedResults = SEARCH_GROUPS.map((group) => ({
      ...group, results: [] as SearchResult[],
    }));

    pageMatches.forEach((page) => {
      for (const [groupKey, keywords] of Object.entries(GROUP_KEYWORDS)) {
        if (
          keywords.some(
            (k) =>
              page.title.toLowerCase().includes(k) ||
              page.subtitle.toLowerCase().includes(k),
          )
        ) {
          const groupIndex = SEARCH_GROUPS.findIndex((g) =>
            g.label.toLowerCase().includes(groupKey),
          );
          if (groupIndex >= 0) {
            groupedResults[groupIndex].results.push(page);
          }
        }
      }
    });

    try {
      if (lowerQuery.length >= 2) {
        const [projectsRes, budgetsRes, expensesRes] = await Promise.allSettled(
          [
            apiClient.get(
              "/projects?search=" + encodeURIComponent(q) + "&limit=5",
            ), apiClient.get(
              "/wbs/budgets?search=" + encodeURIComponent(q) + "&limit=5",
            ), apiClient.get(
              "/wbs/expenses?search=" + encodeURIComponent(q) + "&limit=5",
            ),
          ],
        );

        if (projectsRes.status === "fulfilled") {
          const projects =
            projectsRes.value.data?.projects || projectsRes.value || [];
          groupedResults[0].results.push(
            ...projects.map((p: any) => ({
              type: "project" as const, id: p.project_id, title: p.project_name, subtitle: p.description || "Project", href: `/projects/${p.project_id}/overview`, icon: <FolderOpen className="w-4 h-4" />,
            })),
          );
        }

        if (budgetsRes.status === "fulfilled") {
          const budgets = budgetsRes.value.data || budgetsRes.value || [];
          groupedResults[1].results.push(
            ...budgets.map((b: any) => ({
              type: "budget" as const, id: b.wbs_id, title: `${b.wbs_code} - ${b.description}`, subtitle: `Budget: ${b.total_cost_budgeted} | Status: ${b.status}`, href: `/financials/projects/budgets?id=${b.wbs_id}`, icon: <DollarSign className="w-4 h-4" />,
            })),
          );
        }

        if (expensesRes.status === "fulfilled") {
          const expenses = expensesRes.value.data || expensesRes.value || [];
          groupedResults[2].results.push(
            ...expenses.map((e: any) => ({
              type: "expense" as const, id: e.id, title: e.description, subtitle: `Amount: ${e.amount} | ${e.variance_flag}`, href: `/financials/projects/expenses?id=${e.id}`, icon: <Zap className="w-4 h-4" />,
            })),
          );
        }
      }
    } catch (e) {
      console.debug("Backend search failed, using local results only");
    }

    const finalResults = groupedResults
      .map((g) => ({ ...g, results: g.results.slice(0, 5) }))
      .filter((g) => g.results.length > 0);

    setResults(finalResults);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      search(query);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(-1);
  }, []);

  const navigateToSelected = useCallback(() => {
    let count = 0;
    for (const group of results) {
      for (const result of group.results) {
        if (count === selectedIndex) {
          router.push(result.href);
          setIsOpen(false);
          setQuery("");
          setSelectedIndex(-1);
          return;
        }
        count++;
      }
    }
  }, [results, selectedIndex, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const totalResults = results.reduce(
        (sum, g) => sum + g.results.length, 0,
      );
      if (totalResults === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, totalResults - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          navigateToSelected();
          break;
        case "Escape":
          closeSearch();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, navigateToSelected, closeSearch]);

  const handleFocus = () => {
    if (query.trim()) setIsOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => {}, 200);
  };

  const handleClear = () => {
    setQuery("");
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const totalResults = results.reduce((sum, g) => sum + g.results.length, 0);

  const resultsList = (
    <>
      {isLoading && (
        <div className="p-6 text-center">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Searching…</p>
        </div>
      )}

      {!isLoading && totalResults === 0 && query.trim() && (
        <div className="p-6 text-center">
          <Search className="w-12 h-12 mx-auto text-gray-700 mb-3" />
          <p className="text-white font-medium">No results for &apos;{query}&apos;</p>
          <p className="text-gray-500 text-sm mt-1">
            Try different keywords or check spelling
          </p>
        </div>
      )}

      {!isLoading && totalResults > 0 && (
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {results.map((group, groupIndex) => (
            <div key={group.label} className="mb-4">
              <div
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold r"
                style={{ color: group.color }}
              >
                {group.icon}
                {group.label}
                <span className="ml-auto px-2 py-0.5 bg-white/10 rounded-full text-xs">
                  {group.results.length}
                </span>
              </div>
              <div className="px-2 pb-2">
                {group.results.map((result, resultIndex) => {
                  const globalIndex =
                    results
                      .slice(0, groupIndex)
                      .reduce((sum, g) => sum + g.results.length, 0) +
                    resultIndex;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={result.id}
                      onClick={() => {
                        router.push(result.href);
                        closeSearch();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                        isSelected
                          ? "bg-brand-primary/20 text-white"
                          : "hover:bg-white/5"
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span
                        className="p-1.5 rounded-lg"
                        style={{ background: `${group.color}20` }}
                      >
                        {result.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {result.title}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {result.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 60);
          }}
          className="tap-target md:hidden flex items-center justify-center h-10 w-10 text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 rounded-lg transition-colors shrink-0"
          aria-label="Open search"
        >
          <Search className="w-5 h-5" />
        </button>

        {isOpen && (
          <div className="fixed inset-0 z-[80] bg-brand-dark/98 backdrop-blur-2xl flex flex-col md:hidden animate-in fade-in duration-150">
            <div className="flex items-center gap-2 px-3 py-3 border-b border-white/5 bg-brand-dark/95 shrink-0">
              <button
                type="button"
                onClick={closeSearch}
                className="tap-target flex items-center justify-center h-10 w-10 text-gray-400 hover:text-white rounded-lg transition-colors shrink-0"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                    setSelectedIndex(-1);
                  }}
                  placeholder="Search projects, budgets, expenses…"
                  className="w-full pl-9 pr-9 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:border-brand-primary outline-none transition-all"
                  autoComplete="off"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">{resultsList}</div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="relative hidden md:block" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search projects, budgets, expenses, pages… (⌘K)"
          className="tap-target w-72 pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (query.trim() || totalResults > 0) && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-brand-dark/95 backdrop-blur-3xl border border-white/5 rounded-2xl elev-lg z-50 max-h-[60vh] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          role="listbox"
          aria-label="Search results"
        >
          {resultsList}

          <div className="border-t border-gray-800 px-3 py-2 text-center">
            <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs font-mono text-gray-400">
              ⌘K
            </kbd>
            <span className="ml-2 text-xs text-gray-500">to open search</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
