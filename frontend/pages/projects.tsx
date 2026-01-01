import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../components/Layout/PageContainer';
import { Folder, Percent, DollarSign, CheckCircle, ExternalLink, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'; // NEW: Added TrendingUp, TrendingDown, AlertTriangle
import Card from '../components/common/Card';
import { formatCurrency } from '../lib/utils';
import { useSecuredApi } from '../components/hooks/useSecuredApi';
import Link from 'next/link';

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

// Derived Project Summary Interface (for display)
interface ProjectSummary {
  name: string;
  wbsId: string; // The root WBS ID for the project
  totalBudget: number;
  totalActual: number;
  variancePercent: number;
  status: string; // Derived status like "On Track", "Overrun", "Underrun"
  color: 'primary' | 'secondary' | 'alert' | 'positive';
  statusIcon?: React.ReactNode; // NEW: Icon for status
}

const ProjectsPage: React.FC = () => {
  const api = useSecuredApi();
  const [allWbsData, setAllWbsData] = useState<RollupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWbsRollupData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<RollupData[]>('/wbs/budget/rollup');
        setAllWbsData(response.data);
      } catch (e: any) {
        setError(`Failed to fetch project data: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchWbsRollupData();
  }, [api]);

  // Process raw WBS data into project summaries
  const projectSummaries: ProjectSummary[] = useMemo(() => {
    if (allWbsData.length === 0) return [];

    // Identify root WBS items (which represent top-level projects)
    const rootWbsItems = allWbsData.filter(item => !item.parent_wbs_id);

    return rootWbsItems.map(rootItem => {
      const totalBudget = Number(rootItem.total_cost_budgeted);
      const totalActual = Number(rootItem.total_paid_rollup);
      const variance = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0; // Negative for underrun (spent less)

      let status: string;
      let color: 'primary' | 'secondary' | 'alert' | 'positive';
      let statusIcon: React.ReactNode; // Initialize statusIcon

      if (variance < -5) { // More than 5% underrun (spent less)
        status = "Ahead of Budget";
        color = "positive";
        statusIcon = <TrendingUp className="w-4 h-4 mr-1" />;
      } else if (variance < 0) { // Some underrun
        status = "On Track (Underrun)";
        color = "positive";
        statusIcon = <CheckCircle className="w-4 h-4 mr-1" />;
      } else if (variance > 5) { // More than 5% overrun
        status = "Critical Overrun";
        color = "alert";
        statusIcon = <AlertTriangle className="w-4 h-4 mr-1" />;
      } else if (variance > 0) { // Some overrun
        status = "Minor Overrun";
        color = "alert";
        statusIcon = <TrendingDown className="w-4 h-4 mr-1" />;
      } else {
        status = "On Track";
        color = "primary";
        statusIcon = <CheckCircle className="w-4 h-4 mr-1" />;
      }

      return {
        name: rootItem.description, // Assuming root WBS description is project name
        wbsId: rootItem.wbs_id,
        totalBudget,
        totalActual,
        variancePercent: variance,
        status,
        color,
        statusIcon, // Assign the determined icon
      };
    });
  }, [allWbsData]);

  // Calculate KPIs
  const totalActiveProjects = projectSummaries.length;
  // Adjusted logic: projects "ahead of budget" are those with a negative variancePercent (spent less)
  const totalProjectsAheadOfBudget = projectSummaries.filter(p => p.variancePercent < 0).length;
  const averagePortfolioVariance = totalActiveProjects > 0 
    ? projectSummaries.reduce((sum, p) => sum + p.variancePercent, 0) / totalActiveProjects
    : 0;

  return (
    <>
      <Head><title>Projects | SentinelFi</title></Head>
      <PageContainer
        title="Project Portfolio Management"
        subtitle="Oversight and financial status for all active and archived projects."
        headerContent={<Folder className="w-8 h-8 text-brand-secondary" />}
      >
        {loading ? (
          <div className="text-brand-primary text-lg text-center my-10">Loading project portfolio data...</div>
        ) : error ? (
          <div className="text-alert-critical text-lg text-center my-10">{error}</div>
        ) : (
          <>
            {/* Project Status Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <Card title="Total Active Projects" borderTopColor="primary">
                  <p className="text-4xl font-bold text-white">{totalActiveProjects}</p>
                  <p className="text-sm text-gray-400 mt-1">Total under SentinelFi control</p>
              </Card>
              <Card title="Average Portfolio Variance" borderTopColor={averagePortfolioVariance > 0 ? 'alert' : 'positive'}>
                  <p className={`text-4xl font-bold flex items-center ${averagePortfolioVariance > 0 ? 'text-red-500' : 'text-alert-positive'}`}>
                      {averagePortfolioVariance.toFixed(2)}<Percent className="w-6 h-6 ml-2" />
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Requires management review for overruns</p>
              </Card>
              <Card title="Projects Ahead of Budget" borderTopColor="positive">
                  <p className="text-4xl font-bold text-alert-positive">{totalProjectsAheadOfBudget} / {totalActiveProjects}</p>
                  <p className="text-sm text-gray-400 mt-1">Cost Underrun Status</p>
              </Card>
            </div>
            
            <Card title="Project List & Status" subtitle="Financial health summary of active projects." borderTopColor="secondary">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-brand-dark/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Project Name</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Total Budget</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actual Spend</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Variance (%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {projectSummaries.length === 0 ? (
                      <tr><td colSpan={6} className="p-4 text-center text-gray-500">No active projects found.</td></tr>
                    ) : (
                      projectSummaries.map((p) => (
                        <tr key={p.wbsId} className="hover:bg-gray-700/50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary">{p.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white flex items-center justify-end">
                            <DollarSign className="w-4 h-4 mr-1 text-gray-500" />{formatCurrency(p.totalBudget)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white flex items-center justify-end">
                            <DollarSign className="w-4 h-4 mr-1 text-gray-500" />{formatCurrency(p.totalActual)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right flex items-center justify-end ${p.variancePercent > 0 ? 'text-red-500' : 'text-alert-positive'}`}>
                            {p.variancePercent.toFixed(2)}<Percent className="w-4 h-4 ml-1" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full flex items-center 
                              ${p.color === 'alert' ? 'bg-red-900/50 text-red-400' : p.color === 'positive' ? 'bg-green-900/50 text-alert-positive' : 'bg-gray-500/50 text-gray-300'}`}>
                              {p.statusIcon} {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link href={`/dashboard/ceo?wbsId=${p.wbsId}`} className="text-brand-primary hover:text-white flex items-center justify-end">
                              View WBS <ExternalLink className="w-4 h-4 ml-1" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </PageContainer>
    </>
  );
};

export default ProjectsPage;