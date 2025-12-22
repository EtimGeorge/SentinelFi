import React, { useEffect, useState } from 'react';
import SecuredLayout from '../../components/Layout/SecuredLayout';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext';
import Head from 'next/head';

// Interface for the data returned from the production-ready Recursive CTE endpoint
interface RollupData {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: string; // Comes as a string from the DB NUMERIC type
  total_paid_rollup: string;   // Comes as a string from the DB NUMERIC type
  total_paid_self: string;     // Comes as a string from the DB NUMERIC type
  // Rollup query does not return Committed/LPO yet, so we will use a temporary calculation
}

// Custom component for the high-contrast KPI cards (inspired by video's clean boxes)
const KPICard: React.FC<{ title: string, value: string, color: string }> = ({ title, value, color }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg border-t-4 ${color}`}>
    <p className="text-sm font-medium text-gray-500 uppercase">{title}</p>
    <p className="mt-1 text-3xl font-extrabold text-brand-dark">{value}</p>
  </div>
);

const CEODashboard: React.FC = () => {
  const { user } = useAuth();
  const api = useSecuredApi();
  const [data, setData] = useState<RollupData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for the four MANDATORY KPIs
  const [kpis, setKpis] = useState({
    totalBudget: 0,
    totalActualPaid: 0,
    totalCommittedLPO: 0, // Placeholder calculation
    variancePercentage: 0,
  });

  useEffect(() => {
    // Check if the user's role is authorized for this page (UX check for completeness)
    if (!user || user.role === 'Assigned Project User') { // Placeholder roles check
      // Actual redirection should be handled by RolesGuard, but this provides a better UX redirect
      return;
    }

    const fetchDashboardData = async () => {
      try {
        // CRITICAL API CALL: Fetches the aggregated WBS data from the production-ready CTE
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
    if (data.length === 0) return;

    // We only need the total rollup from the root level items. 
    // Since the CTE rolls up all costs to *every* node, we can just sum the top-level 'total_cost_budgeted'
    
    const rootLevelItems = data.filter(item => !item.parent_wbs_id);
    
    // Sum all root level budgeted costs
    const totalBudget = rootLevelItems.reduce((sum, item) => sum + Number(item.total_cost_budgeted), 0);
    
    // Sum the rollup paid amount only from the root level (since it aggregates everything below)
    const totalActualPaid = rootLevelItems.reduce((sum, item) => sum + Number(item.total_paid_rollup), 0);
    
    // Placeholder for Committed/LPO until a Committed column is added to the backend schema
    const totalCommittedLPO = totalActualPaid * 1.15; // TEMP: 15% more than paid as a placeholder

    // Variance calculation is mandatory (Total Project Cost Base Variance (%))
    const variance = totalBudget > 0 ? ((totalActualPaid - totalBudget) / totalBudget) * 100 : 0;

    setKpis({
      totalBudget,
      totalActualPaid,
      totalCommittedLPO,
      variancePercentage: variance,
    });

  }, [data]);


  return (
    <SecuredLayout>
      <Head>
        <title>CEO Dashboard | SentinelFi</title>
      </Head>
      <h1 className="text-3xl font-extrabold text-brand-dark mb-6">Executive Financial Oversight</h1>
      
      {loading ? (
        <div className="text-lg text-brand-primary">Loading Real-Time Financial Data...</div>
      ) : (
        <div className="space-y-8">
          
          {/* Section 1: MANDATORY KPIs (Inspired by the video's top boxes) */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            
            <KPICard 
              title="Total Budgeted Cost" 
              value={`₦${kpis.totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="border-brand-primary"
            />
            
            <KPICard 
              title="Total Actual Paid" 
              value={`₦${kpis.totalActualPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="border-brand-primary"
            />
            
            <KPICard 
              title="Total Committed (LPO)" 
              value={`₦${kpis.totalCommittedLPO.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="border-brand-secondary"
            />
            
            {/* Variance Flag KPI */}
            <KPICard 
              title="Cost Base Variance (%)" 
              value={`${kpis.variancePercentage.toFixed(2)}%`}
              color={kpis.variancePercentage > 0 ? 'border-alert-critical' : 'border-alert-positive'}
            />
          </div>

          {/* Section 2: WBS Breakdown (Hierarchy and Chart View) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* WBS Hierarchy Tree */}
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-brand-dark mb-4">WBS Cost Structure</h2>
              {/* NOTE: WBSHierarchyTree component needs to be created next for full display */}
              <div className="text-sm text-gray-500">Hierarchical data visualization will go here (WBS Tree/Table).</div>
            </div>
            
            {/* WBS Category Spending Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-brand-dark mb-4">WBS Level 1 Spending vs. Budget</h2>
              {/* NOTE: Chart Component Placeholder */}
              <div className="h-96 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Chart Library (Recharts/Nivo) implementation for visual data.</p>
              </div>
            </div>
            
          </div>
          
        </div>
      )}
    </SecuredLayout>
  );
};

export default CEODashboard;
