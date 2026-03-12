import React, { useState } from 'react';
import { Search, Filter, X, Calendar, DollarSign, Tag, ChevronDown } from 'lucide-react';

interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'date' | 'number' | 'text';
  options?: { value: string; label: string }[];
}

interface FilterBarProps {
  onFilterChange: (filters: any) => void;
  filters: FilterOption[];
  placeholder?: string;
  className?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({ onFilterChange, filters: filterOptions, placeholder = "Search documents...", className = "" }) => {
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...activeFilters, search: searchTerm });
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...activeFilters, [key]: value };
    if (!value) delete newFilters[key];
    setActiveFilters(newFilters);
    onFilterChange({ ...newFilters, search: searchTerm });
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    onFilterChange({});
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative flex-grow group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500 group-focus-within:text-brand-primary transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all backdrop-blur-md"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); onFilterChange({ ...activeFilters, search: '' }); }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Quick Filters Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl border transition-all font-bold text-sm ${isMenuOpen || Object.keys(activeFilters).length > 0
                ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {Object.keys(activeFilters).length > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary text-white text-[10px] font-black">
                {Object.keys(activeFilters).length}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {Object.keys(activeFilters).length > 0 && (
            <button
              onClick={clearFilters}
              className="px-5 py-3 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-400/30 transition-all font-bold text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {isMenuOpen && (
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filterOptions.map((opt) => (
              <div key={opt.key} className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  {opt.type === 'date' && <Calendar className="w-3 h-3" />}
                  {opt.type === 'number' && <DollarSign className="w-3 h-3" />}
                  {opt.type === 'select' && <Tag className="w-3 h-3" />}
                  {opt.label}
                </label>

                {opt.type === 'select' ? (
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary transition"
                    value={activeFilters[opt.key] || ''}
                    onChange={(e) => handleFilterChange(opt.key, e.target.value)}
                  >
                    <option value="">All {opt.label}s</option>
                    {opt.options?.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : opt.type === 'date' ? (
                  <input
                    type="date"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary transition"
                    value={activeFilters[opt.key] || ''}
                    onChange={(e) => handleFilterChange(opt.key, e.target.value)}
                  />
                ) : opt.type === 'number' ? (
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary transition"
                    placeholder="Min Value"
                    value={activeFilters[opt.key] || ''}
                    onChange={(e) => handleFilterChange(opt.key, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary transition"
                    value={activeFilters[opt.key] || ''}
                    onChange={(e) => handleFilterChange(opt.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
