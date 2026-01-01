import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext';
import { formatCurrency } from '../../lib/utils';
import WBSHierarchyTree from '../../components/dashboard/WBSHierarchyTree';
import SpendingChart from '../../components/dashboard/SpendingChart';
import Card from '../../components/common/Card';
import withAuth from '../../components/auth/withAuth';
import { Role } from '../../components/context/AuthContext';
import { Loader2 } from 'lucide-react'; // NEW: Added Loader2 for loading indicators

// Interface for the data returned from the production-ready Recursive CTE endpoint
interface RollupData {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: string;
  total_paid_rollup: string;
  total_paid_self: string;
  total_committed_lpo: string;
}

const CEODashboard: React.FC<{ searchTerm?: string }> = ({ searchTerm }) => {
  const { user } = useAuth();
  const api = useSecuredApi();
  const [data, setData] = useState<RollupData[]>([]);
  const [loading, setLoading] = useState(true);

  // State for the four MANDATORY KPIs
  const [kpis, setKpis] = useState({
    totalBudget: 0,
    totalActualPaid: 0,
    totalCommittedLPO: 0,
    variancePercentage: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get<RollupData[]>('/wbs/budget/rollup');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [api, user]);

  // Calculate the final KPIs whenever the data changes
  useEffect(() => {
    if (data.length === 0) {
      // Reset KPIs if no data
      setKpis({
        totalBudget: 0,
        totalActualPaid: 0,
        totalCommittedLPO: 0,
        variancePercentage: 0,
      });
      return;
    }

    const rootLevelItems = data.filter(item => !item.parent_wbs_id);
    
    const totalBudget = rootLevelItems.reduce((sum, item) => sum + Number(item.total_cost_budgeted), 0);
    const totalActualPaid = rootLevelItems.reduce((sum, item) => sum + Number(item.total_paid_rollup), 0);
    const totalCommittedLPO = rootLevelItems.reduce((sum, item) => sum + Number(item.total_committed_lpo), 0);

    const variance = totalBudget > 0 ? ((totalActualPaid - totalBudget) / totalBudget) * 100 : 0;

    setKpis({
      totalBudget,
      totalActualPaid,
      totalCommittedLPO,
      variancePercentage: variance,
    });
  }, [data]);

  // Filtered data for the table, using searchTerm if provided
  const filteredData = data.filter(item => 
    item.wbs_code.toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
    item.description.toLowerCase().includes(searchTerm?.toLowerCase() || '')
  );

  return (
    <>
      <Head>
        <title>CEO Dashboard | SentinelFi</title>
      </Head>
      <PageContainer title="Executive Financial Oversight">
        <div className="space-y-6">
            
            {/* Section 1: MANDATORY KPIs */}
            <Card title="Financial Health KPIs" className="bg-gray-800/50">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card title="Total Budgeted Cost" borderTopColor="primary">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  ) : data.length === 0 ? (
                    <p className="text-3xl font-semibold text-gray-400">N/A</p>
                  ) : (
                    <p className="text-3xl font-semibold text-gray-100">{formatCurrency(kpis.totalBudget)}</p>
                  )}
                </Card>
                <Card title="Total Actual Paid" borderTopColor="primary">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  ) : data.length === 0 ? (
                    <p className="text-3xl font-semibold text-gray-400">N/A</p>
                  ) : (
                    <p className="text-3xl font-semibold text-gray-100">{formatCurrency(kpis.totalActualPaid)}</p>
                  )}
                </Card>
                <Card title="Total Committed (LPO)" borderTopColor="secondary">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  ) : data.length === 0 ? (
                    <p className="text-3xl font-semibold text-gray-400">N/A</p>
                  ) : (
                    <p className="text-3xl font-semibold text-gray-100">{formatCurrency(kpis.totalCommittedLPO)}</p>
                  )}
                </Card>
                <Card 
                  title="Cost Base Variance"
                  borderTopColor={kpis.variancePercentage > 0 ? 'alert' : 'positive'}
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  ) : data.length === 0 ? (
                    <p className="text-3xl font-semibold text-gray-400">N/A</p>
                  ) : (
                    <p className="text-3xl font-semibold text-gray-100">{`${kpis.variancePercentage.toFixed(2)}%`}</p>
                  )}
                </Card>
              </div>
            </Card>

            {/* Section 2: WBS Breakdown (Hierarchy and Chart View) */}
            <Card title="Work Breakdown Structure Analysis" className="bg-gray-800/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="WBS Cost Structure" className="lg:col-span-1">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-brand-primary"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading WBS...</div>
                  ) : filteredData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">No WBS data available.</div>
                  ) : (
                    <WBSHierarchyTree data={filteredData} />
                  )}
                </Card>
                <Card title="WBS Level 1 Spending vs. Budget" className="lg:col-span-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-brand-primary"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading chart...</div>
                  ) : filteredData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">No chart data available.</div>
                  ) : (
                    <SpendingChart data={filteredData} />
                  )}
                </Card>
              </div>
            </Card>
            
          </div>
        );
      </PageContainer>
    </>
  );
};

export default withAuth(CEODashboard, [Role.CEO, Role.Finance]);