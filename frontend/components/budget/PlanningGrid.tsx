import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Info, Zap, TrendingUp, TrendingDown, RefreshCcw, HelpCircle } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import Tooltip from '../common/Tooltip';

interface PlanningGridProps {
  coa: any[];
  departments: any[];
  fiscalYear: any;
}

const PlanningGrid: React.FC<PlanningGridProps> = ({ coa, departments, fiscalYear }) => {
  const { userCurrency, convertToDisplay } = useCurrency();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, number>>({});

  // Scenario & Filtering State
  const [adjustmentFactor, setAdjustmentFactor] = useState<number>(0);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  const updateValue = (glId: string, pId: string, val: string) => {
    const numeric = parseFloat(val.replace(/,/g, '')) || 0;
    setValues(prev => ({
      ...prev,
      [`${glId}:${selectedDeptId}:${pId}`]: numeric
    }));
  };

  const applyScenario = (direction: 'UP' | 'DOWN') => {
    const factor = direction === 'UP' ? (1 + adjustmentFactor / 100) : (1 - adjustmentFactor / 100);
    const nextValues = { ...values };
    Object.keys(nextValues).forEach(key => {
      // Only adjust values for the currently selected department to avoid accidental global corruption
      if (selectedDeptId === 'all' || key.includes(`:${selectedDeptId}:`)) {
        nextValues[key] = Math.round(nextValues[key] * factor * 100) / 100;
      }
    });
    setValues(nextValues);
  };

  const periods = fiscalYear?.periods || [];

  // Aggregation Logic
  const getRowTotal = (glId: string) => {
    return periods.reduce((sum, p) => {
      // If 'all', we should ideally sum over all departments, but for the grid display 
      // we show what's relevant to the current view.
      const val = values[`${glId}:${selectedDeptId}:${p.id}`] || 0;
      return sum + val;
    }, 0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scenario Modeling Toolbar */}
      <div className="p-4 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Scenario Modeling</span>
                <Tooltip content="Instantly adjust all active planning rows by a specific percentage to model different fiscal outcomes.">
                  <HelpCircle className="w-3 h-3 text-slate-600 hover:text-blue-400 transition" />
                </Tooltip>
              </div>
              <span className="text-xs text-slate-400">Apply adjustments to active planning rows</span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800 mx-2" />

          {/* Department Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Cost Center</span>
                <Tooltip content="Select a specific business unit or department to view and manage its unique budget allocations.">
                  <HelpCircle className="w-3 h-3 text-slate-600 hover:text-blue-400 transition cursor-help" />
                </Tooltip>
              </div>
              <select
                className="bg-transparent border-none text-[10px] font-black text-white outline-none focus:ring-0 cursor-pointer p-0"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
              >
                <option value="all">Master Overhead</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="number"
              value={adjustmentFactor}
              onChange={(e) => setAdjustmentFactor(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-black text-white w-20 outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0"
            />
            <span className="absolute right-3 top-1.5 text-slate-600 text-[10px] font-black">%</span>
          </div>
          <button
            onClick={() => applyScenario('UP')}
            className="p-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition"
            title="Adjust Up"
          >
            <TrendingUp size={16} />
          </button>
          <button
            onClick={() => applyScenario('DOWN')}
            className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"
            title="Adjust Down"
          >
            <TrendingDown size={16} />
          </button>
          <button
            onClick={() => setValues({})}
            className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition"
            title="Clear Matrix"
          >
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto w-full flex-1">
        <div className="min-w-[1500px]">
          {/* Table Header */}
          <div className="flex bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
            <div className="w-[350px] px-6 py-4 font-black text-[9px] uppercase text-slate-500 tracking-[0.2em] border-r border-white/5 flex items-center gap-2">
              Account Architecture
              <Tooltip content="Hierarchical structure of your General Ledger accounts, from Asset Classes to specific GL codes.">
                <Info size={12} className="text-slate-700 hover:text-slate-400" />
              </Tooltip>
            </div>
            {periods.map((p: any) => (
              <div key={p.id} className="flex-1 px-4 py-4 font-black text-[9px] uppercase text-slate-500 text-center border-r border-white/5 tracking-tighter">
                {p.period_name}
              </div>
            ))}
            <div className="w-[180px] px-6 py-4 font-black text-[9px] uppercase text-blue-500 text-right bg-blue-500/5 tracking-[0.2em] flex items-center justify-end gap-2">
              <Tooltip content="Aggregated total projected expenditure across all fiscal periods for this GL account." position="left">
                <Info size={12} className="text-blue-500/40" />
              </Tooltip>
              Annualized Forecast
            </div>
          </div>

          {/* Hierarchical Data */}
          <div className="divide-y divide-slate-800/40">
            {coa.map(acClass => (
              <React.Fragment key={acClass.id}>
                {/* Account Class Level */}
                <div
                  className="flex items-center bg-slate-900 border-l border-brand-primary/20 hover:bg-slate-800/80 transition group"
                  onClick={() => toggleRow(acClass.id)}
                >
                  <div className="w-[350px] px-6 py-4 flex items-center gap-3 cursor-pointer">
                    <div className="w-5 h-5 rounded bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-brand-primary transition">
                      {expandedRows.has(acClass.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </div>
                    <span className="font-black text-[11px] text-slate-200 uppercase tracking-tight">
                      {acClass.code} <span className="text-slate-500 mx-1">|</span> {acClass.name}
                    </span>
                  </div>
                  {periods.map((p: any) => <div key={p.id} className="flex-1" />)}
                  <div className="w-[180px]" />
                </div>

                {expandedRows.has(acClass.id) && acClass.accountGroups?.map((group: any) => (
                  <React.Fragment key={group.id}>
                    {/* Account Group Level */}
                    <div
                      className="flex items-center bg-slate-900/40 hover:bg-slate-800/40 transition group cursor-pointer"
                      onClick={() => toggleRow(group.id)}
                    >
                      <div className="w-[350px] pl-12 pr-6 py-3 flex items-center gap-3">
                        <div className="w-4 h-4 rounded bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition">
                          {expandedRows.has(group.id) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </div>
                        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wide">
                          {group.code} <span className="text-slate-600 mx-1">•</span> {group.name}
                        </span>
                      </div>
                      {periods.map((p: any) => <div key={p.id} className="flex-1" />)}
                      <div className="w-[180px]" />
                    </div>

                    {expandedRows.has(group.id) && group.glAccounts?.map((gl: any) => (
                      <React.Fragment key={gl.id}>
                        {/* GL Account Level */}
                        <div
                          className="flex items-center hover:bg-blue-500/[0.02] transition border-l-2 border-transparent hover:border-blue-500/40"
                        >
                          <div className="w-[350px] pl-20 pr-6 py-4 flex flex-col justify-center">
                            <span className="font-black text-[10px] text-white uppercase tracking-tight">{gl.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono mt-0.5">{gl.code}</span>
                          </div>

                          {periods.map((p: any) => (
                            <div key={p.id} className="flex-1 px-2">
                              <input
                                type="text"
                                placeholder="0.00"
                                value={values[`${gl.id}:${selectedDeptId}:${p.id}`] || ''}
                                className="w-full bg-slate-950/40 border border-slate-800/60 rounded-lg px-2 py-2 text-right focus:border-blue-500/50 focus:bg-slate-950 focus:ring-0 transition-all outline-none font-mono text-[11px] text-white shadow-inner"
                                onChange={(e) => updateValue(gl.id, p.id, e.target.value)}
                              />
                            </div>
                          ))}

                          <div className="w-[180px] text-right px-6 font-black text-blue-500 italic text-xs tracking-tight">
                            {convertToDisplay(getRowTotal(gl.id), 'NGN')}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {coa.length === 0 && (
          <div className="p-24 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-700 mb-4 border border-slate-800">
              <Info size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-300 uppercase tracking-tighter">No Chart Architecture</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs">Complete your General Ledger configuration to begin fiscal planning.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanningGrid;
