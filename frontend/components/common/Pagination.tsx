import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
}

const getPageItems = (page: number, totalPages: number): (number | 'ellipsis')[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push('ellipsis');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);
  return items;
};

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange, total, pageSize }) => {
  if (totalPages <= 1) return null;

  const first = total !== undefined && pageSize ? (page - 1) * pageSize + 1 : undefined;
  const last = total !== undefined && pageSize ? Math.min(page * pageSize, total) : undefined;

  return (
    <div className="flex flex-col items-center gap-3 pt-10">
      {first !== undefined && last !== undefined && total !== undefined && (
        <p className="text-xs font-black text-slate-600 uppercase tracking-tight">
          Showing {first}–{last} of {total}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${page === 1 ? 'bg-slate-900 text-slate-600' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-2">
          {getPageItems(page, totalPages).map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center text-xs font-black text-slate-600">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                className={`w-10 h-10 rounded-xl font-black text-sm transition-all duration-300 ${page === item ? 'bg-brand-primary text-white elev-lg shadow-brand-primary/20 scale-110' : 'bg-slate-900 text-slate-500 hover:text-white'}`}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${page === totalPages ? 'bg-slate-900 text-slate-600' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;