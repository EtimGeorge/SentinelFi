import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, Plus, Trash2 } from 'lucide-react';
import useGlobalStore, { type SavedView, TIME_RANGE_PRESETS as TRP } from '../../store/globalStore';

/**
 * Named view manager for the dashboard filter context (project + time range).
 * Saves the current combination and applies/deletes saved views.
 */
const ViewManager: React.FC = () => {
  const savedViews = useGlobalStore((s) => s.savedViews);
  const saveView = useGlobalStore((s) => s.saveView);
  const applyView = useGlobalStore((s) => s.applyView);
  const deleteView = useGlobalStore((s) => s.deleteView);
  const selectedProjectId = useGlobalStore((s) => s.selectedProjectId);
  const timeRange = useGlobalStore((s) => s.timeRange);

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveView(trimmed);
    setName('');
  };

  const scopeLabel = (view: SavedView) =>
    `${view.projectId === 'all' ? 'All projects' : view.projectId} · ${TRP[view.timeRange].label}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Saved dashboard views"
        className="tap-target inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/60 px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-white"
      >
        <Bookmark className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Views</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Saved views"
          className="absolute right-0 top-9 z-30 w-72 rounded-lg border border-gray-700 bg-gray-800 p-3 shadow-elev-lg"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="Name current view"
              aria-label="View name"
              className="min-w-0 flex-1 rounded-md border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-gray-500 focus:border-brand-primary"
            />
            <button
              type="button"
              onClick={handleSave}
              aria-label="Save current view"
              className="tap-target rounded-md bg-brand-primary px-2.5 text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50"
              disabled={!name.trim()}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 text-label-sm text-gray-500">
            Current: {selectedProjectId === 'all' ? 'All projects' : selectedProjectId} · {TRP[timeRange].label}
          </p>

          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {savedViews.length === 0 && (
              <li className="py-3 text-center text-label-sm text-gray-500">No saved views yet.</li>
            )}
            {savedViews.map((view) => (
              <li key={view.id} className="group">
                <div className="flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-700/50">
                  <button
                    type="button"
                    onClick={() => applyView(view.id)}
                    role="menuitem"
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                  >
                    <span className="truncate text-xs font-medium text-gray-200">{view.name}</span>
                    <span className="truncate text-label-sm text-gray-500">{scopeLabel(view)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteView(view.id)}
                    aria-label={`Delete view ${view.name}`}
                    className="tap-target rounded p-1 text-gray-500 opacity-0 transition-opacity hover:text-alert-critical focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ViewManager;