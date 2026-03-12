import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SecuredLayout from '../../components/Layout/SecuredLayout';
import { useRouter } from 'next/router';
import {
  BarChart3,
  Calendar,
  Settings,
  Plus,
  Save,
  ChevronRight,
  Layers,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { useFinanceCore } from '../../hooks/useFinanceCore';
import { useCurrency } from '../../components/context/CurrencyContext';
import PlanningGrid from '../../components/budget/PlanningGrid';

const PlanningMatrixPage: React.FC = () => {
  const router = useRouter();
  const { userCurrency, convertToDisplay } = useCurrency();
  const { loading, fetchFiscalYears, fetchDepartments, fetchChartOfAccounts } = useFinanceCore();

  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [selectedFy, setSelectedFy] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'setup' | 'budgeting' | 'review'>('setup');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const years = await fetchFiscalYears();
      setFiscalYears(years);
      if (years.length > 0) setSelectedFy(years[0]);

      const depts = await fetchDepartments();
      setDepartments(depts);

      const accounts = await fetchChartOfAccounts();
      setCoa(accounts);
    };
    init();
  }, [fetchFiscalYears, fetchDepartments, fetchChartOfAccounts]);

  const toggleDept = (id: string) => {
    const next = new Set(expandedDepts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedDepts(next);
  };

  return (
    <SecuredLayout>
      <Head>
        <title>OPEX Planning Matrix | SentinelFi</title>
      </Head>

      <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a]">
        {/* Header Section */}
        <div className="p-6 bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="text-blue-500" />
                Enterprise OPEX Planning Matrix
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Configure annual operational budgets across cost centers and GL accounts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedFy?.id || ''}
                onChange={(e) => setSelectedFy(fiscalYears.find(y => y.id === e.target.value))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 font-medium"
              >
                {fiscalYears.map(fy => (
                  <option key={fy.id} value={fy.id}>Fiscal Year {fy.year_label}</option>
                ))}
                {fiscalYears.length === 0 && <option value="">No Fiscal Years Found</option>}
              </select>

              <button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                onClick={() => router.push('/budget/setup')}
              >
                <Settings size={18} />
                Configure Years
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Navigation */}
        <div className="max-w-7xl mx-auto w-full px-6 py-4 flex gap-8">
          <button
            onClick={() => setActiveTab('setup')}
            className={`pb-2 px-1 font-medium transition-all border-b-2 ${activeTab === 'setup' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400'}`}
          >
            1. Allocation Strategy
          </button>
          <button
            onClick={() => setActiveTab('budgeting')}
            className={`pb-2 px-1 font-medium transition-all border-b-2 ${activeTab === 'budgeting' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400'}`}
          >
            2. Budgeting Matrix
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`pb-2 px-1 font-medium transition-all border-b-2 ${activeTab === 'review' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400'}`}
          >
            3. Approval & Finalization
          </button>
        </div>

        {/* Main Workspace Area */}
        <div className="flex-1 overflow-auto p-6 pt-0">
          <div className="max-w-7xl mx-auto bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[600px] flex flex-col">

            {activeTab === 'setup' && (
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                    <Layers size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Organizational Setup</h2>
                    <p className="text-slate-500">Define your cost centers and department hierarchy for the fiscal year.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {departments.map(dept => (
                    <div key={dept.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-blue-200 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{dept.code}</span>
                          <h3 className="font-bold text-lg">{dept.name}</h3>
                        </div>
                        <button
                          onClick={() => toggleDept(dept.id)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {expandedDepts.has(dept.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Cost Centers</span>
                          <span className="font-medium">{dept.costCenters?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Allocated Budget</span>
                          <span className="font-medium text-emerald-600">{convertToDisplay(0, 'NGN')}</span>
                        </div>
                      </div>

                      {expandedDepts.has(dept.id) && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          {dept.costCenters?.map((cc: any) => (
                            <div key={cc.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                              <span className="text-slate-600 dark:text-slate-400 font-medium">{cc.name}</span>
                              <span className="text-xs text-slate-400">{cc.code}</span>
                            </div>
                          ))}
                          <button className="w-full mt-2 py-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-blue-500 hover:border-blue-200 text-xs font-bold flex items-center justify-center gap-1 transition-all">
                            <Plus size={14} /> Add Cost Center
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  <button className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all">
                    <Plus size={32} strokeWidth={1} />
                    <span className="mt-2 font-bold uppercase tracking-widest text-xs">Add Department</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'budgeting' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-emerald-500" />
                    <span className="font-bold text-slate-700">Enterprise Budget Matrix v1.0</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
                      Export Template
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black shadow-lg">
                      <Save size={16} /> Save Allocations
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <PlanningGrid
                    coa={coa}
                    departments={departments}
                    fiscalYear={selectedFy}
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <style jsx global>{`
        .planning-matrix-grid {
          display: grid;
          grid-template-columns: 280px repeat(12, minmax(140px, 1fr)) 160px;
        }
      `}</style>
    </SecuredLayout>
  );
};

export default PlanningMatrixPage;
