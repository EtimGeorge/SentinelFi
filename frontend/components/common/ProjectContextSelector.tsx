import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, FolderOpen, Layers, Search, X } from "lucide-react";
import useGlobalStore from "../../store/globalStore";
import { useProjectsDirectory, ProjectOption } from "../../hooks/useProjectsDirectory";
import Tooltip from "./Tooltip";

interface ProjectContextSelectorProps {
  /** Render variant: compact pill (header) or full-width (mobile drawer). */
  variant?: "header" | "drawer";
  className?: string;
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-green-400",
  COMPLETED: "bg-blue-400",
  ON_HOLD: "bg-amber-400",
  ARCHIVED: "bg-gray-500",
};

/**
 * Workspace project context selector. Backed by the global zustand store
 * (`selectedProjectId`) so every consuming page — dashboards, reporting,
 * expenses, WBS, budgets — reacts to the same shared scope.
 *
 * Searchable + keyboard navigable, unlike the raw <select> it replaces,
 * and backed by a module-cached directory (one request for all mounts).
 */
export const ProjectContextSelector: React.FC<ProjectContextSelectorProps> = ({
  variant = "header", className = "",
}) => {
  const { projects, isLoading } = useProjectsDirectory();
  const selectedProjectId = useGlobalStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useGlobalStore((s) => s.setSelectedProjectId);

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = projects.find((p) => p.project_id === selectedProjectId);
  const isAll = selectedProjectId === "all";

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.project_name?.toLowerCase().includes(q) ||
        p.project_code?.toLowerCase().includes(q),
    );
  }, [projects, filter]);

  // Normalize to a flat { id, name, code, status } shape — ProjectOption uses
  // bare snake_case fields (project_name…) while rows read the unified form.
  const flatItems = useMemo(
    () => [
      { id: "all", name: "All Projects", code: null, status: null },
      ...filtered.map((p) => ({
        id: p.project_id,
        name: p.project_name,
        code: p.project_code ?? null,
        status: p.status ?? null,
      })),
    ],
    [filtered],
  );

  useEffect(() => setActiveIndex(isAll ? 0 : -1), [isOpen, filter, isAll]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  // Focus + scroll active item into view while navigating.
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [isOpen]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const commit = useCallback(
    (projectId: string) => {
      setSelectedProjectId(projectId);
      setIsOpen(false);
      setFilter("");
    },
    [setSelectedProjectId],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (flatItems[activeIndex]) commit(flatItems[activeIndex].id);
        break;
    }
  };

  const triggerLabel = isAll ? "All Projects" : selected?.project_name || "Select project";

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <Tooltip content="Active project context — scopes dashboards, WBS, budgets and expenses" position="bottom">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`flex items-center gap-2 rounded-lg border border-gray-700 bg-brand-dark/80 py-1.5 px-2.5 text-xs font-bold text-brand-primary hover:border-brand-primary/60 transition-colors max-w-[220px] ${
            variant === "drawer" ? "w-full justify-between" : ""
          }`}
        >
          {isAll ? (
            <Layers className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown
            className={`w-3 h-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </Tooltip>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-72 rounded-xl border border-white/10 bg-gray-900 elev-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 ${
            variant === "drawer" ? "right-0" : "left-0"
          }`}
          role="listbox"
          aria-label="Project context"
        >
          <div className="relative p-2 border-b border-white/5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              ref={inputRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search projects…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:border-brand-primary outline-none"
              autoComplete="off"
            />
          </div>

          <div ref={listRef} className="max-h-72 overflow-y-auto p-1">
            {isLoading && !projects.length && (
              <p className="px-3 py-4 text-xs text-gray-500 text-center">Loading projects…</p>
            )}
            {!isLoading && flatItems.length <= 1 && filter && (
              <p className="px-3 py-4 text-xs text-gray-500 text-center">No projects match “{filter}”</p>
            )}
            {flatItems.map((item, index) => {
              const isItemSelected = item.id === selectedProjectId;
              return (
                <button
                  key={item.id}
                  data-index={index}
                  role="option"
                  aria-selected={isItemSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    activeIndex === index ? "bg-brand-primary/15" : "hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      item.status ? (STATUS_DOT[item.status] || "bg-gray-500") : "bg-brand-primary"
                    }`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className={`block text-xs font-bold truncate ${isItemSelected ? "text-brand-primary" : "text-gray-200"}`}>
                      {item.name}
                    </span>
                    {item.code && (
                      <span className="block text-[11px] text-gray-500 truncate font-mono">{item.code}</span>
                    )}
                  </span>
                  {isItemSelected && <Check className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/5 px-3 py-1.5 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Scopes all project-aware pages</span>
            {selectedProjectId !== "all" && (
              <button
                type="button"
                onClick={() => commit("all")}
                className="text-[11px] font-bold text-gray-400 hover:text-white flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectContextSelector;
