import React from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import Card from '../../common/Card';
import Button from '../../common/Button';
import { useCurrency } from '../../context/CurrencyContext';
import {
  Download, Printer, Layers, AlertCircle, TrendingDown, Zap, ShieldCheck, Plus,
} from 'lucide-react';
import { WbsBudget } from '@shared/types/wbs';
import { LiveExpense } from '@shared/types/expense';
import { ProjectStatus } from '@shared/types/project';
import { apiErrorMessage } from './errors';
import {
  ProjectDetail, CashFlowPoint, DossierTab,
} from './types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie, Area, ComposedChart, Line,
} from 'recharts';

interface OverviewTabProps {
  project: ProjectDetail;
  budgets: WbsBudget[];
  expenses: LiveExpense[];
  cashflow: CashFlowPoint[];
  onNavigate: (tab: DossierTab) => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const OverviewTab: React.FC<OverviewTabProps> = ({ project, budgets, expenses, cashflow, onNavigate }) => {
  const { userCurrency, convertToDisplay, convertAmount } = useCurrency();
  const currency = project.currency || 'NGN';

  const handleDownloadBudgets = async () => {
    try {
      const response = await api.get(`/wbs/budgets/export?projectId=${project.project_id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `project_${project.project_name}_budgets.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      toast.error(`Failed to download budgets: ${apiErrorMessage(e)}`);
    }
  };

  const handleDownloadBudgetPdf = async () => {
    try {
      const response = await api.get(`/wbs/projects/${project.project_id}/report-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Budget_Report_${project.project_name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Budget Report downloaded');
    } catch (e: any) {
      toast.error(`Failed to download budget report: ${apiErrorMessage(e)}`);
    }
  };

  const handleExportExpenses = async (format: 'csv' | 'pdf' | 'xlsx' = 'csv') => {
    try {
      const response = await api.get(`/wbs/expenses/export?projectId=${project.project_id}&format=${format}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      link.setAttribute('download', `project_${project.project_name}_expenses.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      toast.error(`Failed to download expenses: ${apiErrorMessage(e)}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Executive Summary" accent="primary" className="border border-gray-700 elev-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-300">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 ">Project Name</label>
                  <p className="text-xl font-semibold text-white">{project.project_name}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 ">Client</label>
                  <p className="text-sm font-semibold text-brand-secondary uppercase">{project.client?.name || 'Internal Project'}</p>
                  {project.client?.industry && <p className="text-xs text-gray-500 italic">{project.client.industry}</p>}
                </div>
                <div className="flex items-center space-x-6">
                  <div>
                    <label className="text-xs font-bold text-gray-500 ">RFQ No.</label>
                    <p className="text-sm text-brand-primary font-mono">{project.rfq_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 ">Status</label>
                    <p className="text-sm"><span className="px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-800 text-xs font-bold uppercase">{project.status}</span></p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 ">Scope of Work</label>
                  <p className="text-sm leading-relaxed">{project.sow_details || 'No SOW details provided.'}</p>
                </div>
              </div>
              <div className="space-y-4 bg-brand-dark/30 p-4 rounded-xl border border-gray-800/50">
                <div>
                  <label className="text-xs font-bold text-gray-500 ">Financial Configuration</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Currency</span>
                      <span className="text-white font-bold">{currency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Contingency</span>
                      <span className="text-white font-bold">{project.contingency_percent || 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Tax (VAT / WHT)</span>
                      <span className="text-white font-bold">{project.vat_rate || 7.5}% / {project.wht_rate || 5}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Quick Actions" accent="secondary" className="border border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleDownloadBudgets} className="flex flex-col items-center justify-center p-4 bg-gray-800/50 rounded-xl hover:bg-gray-700 transition border border-gray-700">
                  <Download className="w-6 h-6 text-brand-secondary mb-2" />
                  <span className="text-xs font-bold text-gray-300">Export Budget (CSV)</span>
                </button>
                <button onClick={handleDownloadBudgetPdf} className="flex flex-col items-center justify-center p-4 bg-brand-primary/10 rounded-xl hover:bg-brand-primary/20 transition border border-brand-primary/30">
                  <Download className="w-6 h-6 text-brand-primary mb-2" />
                  <span className="text-xs font-bold text-brand-primary">Budget Report (PDF)</span>
                </button>
                <div className="relative group">
                  <button className="flex flex-col items-center justify-center p-4 bg-gray-800/50 rounded-xl hover:bg-gray-700 transition border border-gray-700 w-full">
                    <Download className="w-6 h-6 text-brand-primary mb-2" />
                    <span className="text-xs font-bold text-gray-300">Export Expenses</span>
                  </button>
                  <div className="absolute left-0 right-0 top-full mt-1 hidden group-hover:block bg-brand-dark border border-gray-700 rounded-lg elev-lg z-10">
                    <button onClick={() => handleExportExpenses('csv')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">CSV</button>
                    <button onClick={() => handleExportExpenses('pdf')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">PDF</button>
                    <button onClick={() => handleExportExpenses('xlsx')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Excel</button>
                  </div>
                </div>
                <button onClick={handlePrint} className="flex flex-col items-center justify-center p-4 bg-gray-800/50 rounded-xl hover:bg-gray-700 transition border border-gray-700">
                  <Printer className="w-6 h-6 text-brand-primary mb-2" />
                  <span className="text-xs font-bold text-gray-300">Print Page</span>
                </button>
                <Link href={`/wbs-manager?projectId=${project.project_id}`} className="flex flex-col items-center justify-center p-4 bg-brand-primary/10 rounded-xl hover:bg-brand-primary/20 transition border border-brand-primary/30">
                  <Layers className="w-6 h-6 text-brand-primary mb-2" />
                  <span className="text-xs font-bold text-brand-primary">Master Builder</span>
                </Link>
              </div>
            </Card>
            <Card title="Budget Health Index" accent="primary" className="border border-gray-700 flex flex-col items-center justify-center">
              <div className="h-40 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(project.total_budgeted_rollup, project.contract_value) },
                        { value: Math.max(0, project.contract_value - project.total_budgeted_rollup) }
                      ]}
                      cx="50%"
                      cy="80%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                    >
                      <Cell fill={project.total_budgeted_rollup > project.contract_value ? '#EF4444' : '#10B981'} />
                      <Cell fill="#1F2937" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
                  <p className="text-2xl font-black text-white">
                    {((project.total_budgeted_rollup / (project.contract_value || 1)) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 uppercase font-black">Capacity Used</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {project.total_budgeted_rollup > project.contract_value
                  ? 'Over-allocated! Variance detected.'
                  : 'Healthy budget allocation.'}
              </p>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Project Profitability (PGM)" accent="alert" className="border border-gray-700 bg-brand-dark/20">
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <label className="text-xs font-bold text-gray-500 ">Projected Margin</label>
                  <p className={`text-3xl font-bold tracking-tight ${project.contract_value - project.total_budgeted_rollup >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {((project.contract_value - project.total_budgeted_rollup) / (project.contract_value || 1) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-right">
                  <label className="text-xs font-bold text-gray-400 ">Current Realized</label>
                  <p className="text-lg font-bold text-white">
                    {((project.contract_value - project.total_paid_rollup) / (project.contract_value || 1) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Contract Value</span>
                  <span className="text-white font-mono">{convertToDisplay(project.contract_value, currency)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Total Budget (Costs)</span>
                  <span className="text-red-400 font-mono">{convertToDisplay(project.total_budgeted_rollup, currency)}</span>
                </div>
                <div className="pt-2 border-t border-gray-800 flex justify-between text-sm font-bold">
                  <span className="text-gray-300">Target Profit</span>
                  <span className="text-green-400 font-mono">{convertToDisplay(project.contract_value - project.total_budgeted_rollup, currency)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Cash Position" accent="primary" className="border border-gray-700 bg-brand-dark/20">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold text-gray-500 ">Invoiced/Received</label>
                  <p className="text-2xl font-bold text-white">{convertToDisplay(project.total_inflow_rollup, currency)}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => onNavigate('inflows')}>
                  <Plus className="w-3 h-3 mr-1" /> Inflow
                </Button>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-brand-primary h-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (project.total_paid_rollup / (project.total_inflow_rollup || 1)) * 100)}%` }}
                  title="Burn vs Received"
                />
              </div>
              <p className="text-xs text-gray-500 text-center uppercase tracking-tighter">
                Liquidity: {convertToDisplay(project.total_inflow_rollup - project.total_paid_rollup, currency)} available
              </p>
            </div>
          </Card>

          <Card title="Actionable Insights" accent="primary" className="border border-brand-primary/30 bg-brand-primary/5">
            <div className="space-y-4">
              {budgets.length === 0 && (
                <div className="flex items-start gap-3 p-3 bg-brand-dark/50 rounded-lg border border-gray-700">
                  <AlertCircle className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-white">Pending Financial Setup</p>
                    <p className="text-xs text-gray-400 mt-1">No WBS budgets defined. Head to WBS Master Builder to allocate funds.</p>
                  </div>
                </div>
              )}
              {project.total_inflow_rollup < project.total_paid_rollup && (
                <div className="flex items-start gap-3 p-3 bg-red-900/20 rounded-lg border border-red-800/50">
                  <TrendingDown className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-400">Liquidity Deficit</p>
                    <p className="text-xs text-gray-400 mt-1">Cash outflow exceeds inflows. Consider requesting client mobilization.</p>
                  </div>
                </div>
              )}
              {expenses.some(e => e.variance_flag && ['MAJOR_VARIANCE', 'CRITICAL_VARIANCE', 'OVERRIDE_APPLIED'].includes(e.variance_flag)) && (
                <div className="flex items-start gap-3 p-3 bg-yellow-900/20 rounded-lg border border-yellow-800/50">
                  <Zap className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-yellow-400">Budget Overrun Detected</p>
                    <p className="text-xs text-gray-500 mt-1">Significant variance in specific WBS nodes. Review expense log.</p>
                  </div>
                </div>
              )}
              {budgets.length > 0 && expenses.length === 0 && (
                <div className="flex items-start gap-3 p-3 bg-green-900/20 rounded-lg border border-green-800/50">
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-green-400">Ready for Execution</p>
                    <p className="text-xs text-gray-500 mt-1">Budget is allocated. You can now begin logging disbursements.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <Card title="Project Financial Trajectory (Burn-up)" accent="primary" className="border border-gray-700">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={(() => {
                let cumulativeOutflow = 0;
                return cashflow.map(cf => {
                  cumulativeOutflow += cf.outflow;
                  return {
                    name: MONTH_NAMES[cf.month - 1], budget: convertAmount(project?.total_budgeted_rollup || 0, project?.currency || 'NGN', userCurrency.code), actual: convertAmount(cumulativeOutflow, project?.currency || 'NGN', userCurrency.code)
                  };
                });
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${userCurrency.symbol}${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                  formatter={(value: number) => [convertToDisplay(value), '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="budget" name="Total Budgeted" fill="#1F2937" stroke="#374151" />
                <Line type="monotone" dataKey="actual" name="Cumulative Spend" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Monthly Cash Flow Heatmap" accent="secondary" className="border border-gray-700">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflow.map(cf => ({
                ...cf, name: MONTH_NAMES[cf.month - 1], inflow: convertAmount(cf.inflow, project?.currency || 'NGN', userCurrency.code), outflow: convertAmount(cf.outflow, project?.currency || 'NGN', userCurrency.code)
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${userCurrency.symbol}${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                  formatter={(value: number) => [convertToDisplay(value), '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                <Bar dataKey="inflow" name="Cash In" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" name="Cash Out" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
};

export default OverviewTab;