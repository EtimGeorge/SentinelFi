import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import BudgetGrid from '../../components/budgets/BudgetGrid';
import CategoryManager from '../../components/budgets/CategoryManager';
import { ArrowLeft, Settings, Grid } from 'lucide-react';
import Link from 'next/link';
import { useBreadcrumbs } from '../../components/context/BreadcrumbContext'; // Breadcrumb label registration
import { useEffect } from 'react';

const OperationalBudgetDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState<'grid' | 'categories'>('grid');
  const { setLabel } = useBreadcrumbs();

  // Register budget ID in breadcrumbs (could be enhanced with budget name from API)
  useEffect(() => {
    if (id) {
      setLabel(id as string, `Budget ${String(id).substring(0, 8)}`);
    }
  }, [id, setLabel]);

  if (!id) return null;

  return (
    <>
      <Head><title>Budget Workspace | SentinelFi</title></Head>
      <PageContainer
        title="Budget Workspace"
        subtitle="Detailed planning and allocation."
        headerContent={
          <Link href="/operational-budgets/manage" className="flex items-center text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to List
          </Link>
        }
      >
        <div className="space-y-6">
          <div className="flex space-x-4 border-b border-gray-700 pb-2">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex items-center px-4 py-2 rounded-lg transition ${activeTab === 'grid' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
              <Grid className="w-4 h-4 mr-2" /> Budget Sheet
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center px-4 py-2 rounded-lg transition ${activeTab === 'categories' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
              <Settings className="w-4 h-4 mr-2" /> Categories
            </button>
          </div>

          {activeTab === 'grid' && (
            <div className="animate-in fade-in">
              <BudgetGrid budgetId={id as string} />
              <div className="mt-4 p-4 bg-brand-dark/30 border border-gray-700/50 rounded-lg text-xs text-gray-500">
                <p>💡 Tip: Changes are saved automatically. Use the &quot;Categories&quot; tab to add new line items.</p>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="animate-in fade-in">
              <CategoryManager />
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
};

export default OperationalBudgetDetailPage;
