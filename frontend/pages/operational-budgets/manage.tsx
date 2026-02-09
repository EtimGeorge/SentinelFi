
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { DollarSign, Settings, LayoutGrid, List } from 'lucide-react';
import CategoryManager from '../../components/budgets/CategoryManager';
import BudgetGrid from '../../components/budgets/BudgetGrid';
import { OperationalBudgetEntity } from '../../../backend/src/operational-budgets/operational-budget.entity';

const OperationalBudgetWorkspace: React.FC = () => {
  const api = useSecuredApi();
  const [budgets, setBudgets] = useState<OperationalBudgetEntity[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [view, setView] = useState<'workspace' | 'categories'>('workspace');
  const [loading, setLoading] = useState(true);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/operational-budgets');
      const data = res.data.operationalBudgets || [];
      setBudgets(data);
      if (data.length > 0 && !selectedBudgetId) {
        setSelectedBudgetId(data[0].operational_budget_id);
      }
    } catch (error) {
      console.error('Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  }, [api, selectedBudgetId]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  return (
    <>
      <Head><title>Operational Budget Workspace | SentinelFi</title></Head>
      <PageContainer
        title="Operational Budgeting Engine"
        subtitle="Manage your company monthly allocations and categories."
        headerContent={<DollarSign className="w-8 h-8 text-brand-secondary" />}
      >
        <div className="space-y-6">
          {/* Workspace Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setView('workspace')}
                  className={`px-4 py-2 rounded-md text-xs font-bold uppercase flex items-center gap-2 transition-all ${view === 'workspace' ? 'bg-brand-primary text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <LayoutGrid className="w-4 h-4" /> Workspace
                </button>
                <button
                  onClick={() => setView('categories')}
                  className={`px-4 py-2 rounded-md text-xs font-bold uppercase flex items-center gap-2 transition-all ${view === 'categories' ? 'bg-brand-primary text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <Settings className="w-4 h-4" /> Categories
                </button>
              </div>

              {view === 'workspace' && budgets.length > 0 && (
                <select
                  value={selectedBudgetId || ''}
                  onChange={(e) => setSelectedBudgetId(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-64 p-2.5 outline-none"
                >
                  {budgets.map(b => (
                    <option key={b.operational_budget_id} value={b.operational_budget_id}>
                      {b.name} ({new Date(b.start_date).getFullYear()})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchBudgets()}>
                <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>

          {/* Content Area */}
          {view === 'categories' ? (
            <CategoryManager />
          ) : (
            <div className="space-y-6">
              {budgets.length === 0 && !loading ? (
                <Card>
                  <div className="p-10 text-center">
                    <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Budgets Found</h3>
                    <p className="text-gray-400 mb-6">Create your first operational budget to start managing allocations.</p>
                    <Button onClick={() => window.location.href = '/operational-budgets/create'}>Create Budget</Button>
                  </div>
                </Card>
              ) : selectedBudgetId ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <BudgetGrid budgetId={selectedBudgetId} />
                </div>
              ) : (
                <div className="p-10 text-center text-gray-500">
                  Loading workspace...
                </div>
              )}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
};

// Simple Refresh icon for the button since it was removed from imports
const RefreshCcw = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
);

export default OperationalBudgetWorkspace;
