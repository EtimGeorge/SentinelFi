import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSecuredApi } from '../components/hooks/useSecuredApi';
import PageContainer from '../components/Layout/PageContainer';
import Card from '../components/common/Card';
import { formatCurrency } from '../lib/utils';
import { Project } from '../../shared/types/project';

// Interface for data returned by /api/v1/projects (now including rollups)
interface ProjectData extends Project {
  total_budgeted_rollup: number;
  total_paid_rollup: number;
}

// Derived Project Summary Interface (for display)
interface ProjectSummary {
  name: string;
  projectId: string; // Use project_id now
  totalBudget: number;
  totalActual: number;
  variancePercent: number;
  status: string; // Derived status like "On Track", "Overrun", "Underrun"
  color: 'primary' | 'secondary' | 'alert' | 'positive';
  statusIcon?: React.ReactNode;
}

const ProjectsPage: React.FC = () => {
  const api = useSecuredApi();
  const [projectRawData, setProjectRawData] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch from the new /api/v1/projects endpoint
        const response = await api.get<{ projects: ProjectData[]; total: number }>('/projects'); 
        setProjectRawData(response.data.projects);
      } catch (e: any) {
        setError(`Failed to fetch project data: ${e.response?.data?.message || e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchProjectData();
  }, [api]);

  // Process raw project data into project summaries
  const projectSummaries: ProjectSummary[] = useMemo(() => {
    if (projectRawData.length === 0) return [];

    return projectRawData.map(project => {
      const totalBudget = Number(project.total_budgeted_rollup);
      const totalActual = Number(project.total_paid_rollup);
      const variance = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0;

      let status: string;
      let color: 'primary' | 'secondary' | 'alert' | 'positive';
      let statusIcon: React.ReactNode; 

      // Logic adapted from previous implementation
      if (variance < -5) {
        status = "Ahead of Budget";
        color = "positive";
        statusIcon = <TrendingUp className="w-4 h-4 mr-1" />;
      } else if (variance < 0) {
        status = "On Track (Underrun)";
        color = "positive";
        statusIcon = <CheckCircle className="w-4 h-4 mr-1" />;
      } else if (variance > 5) {
        status = "Critical Overrun";
        color = "alert";
        statusIcon = <AlertTriangle className="w-4 h-4 mr-1" />;
      } else if (variance > 0) {
        status = "Minor Overrun";
        color = "alert";
        statusIcon = <TrendingDown className="w-4 h-4 mr-1" />;
      } else {
        status = "On Track";
        color = "primary";
        statusIcon = <CheckCircle className="w-4 h-4 mr-1" />;
      }

      return {
        name: project.project_name, 
        projectId: project.project_id, // Use new project_id
        totalBudget,
        totalActual,
        variancePercent: variance,
        status,
        color,
        statusIcon, 
      };
    });
  }, [projectRawData]);

  // Calculate KPIs
  const totalActiveProjects = projectSummaries.length;
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
              <Card title="Total Active Projects" borderTopColor="primary" className="border border-gray-700">
                  <p className="text-4xl font-bold text-white">{totalActiveProjects}</p>
                  <p className="text-sm text-gray-400 mt-1">Total under SentinelFi control</p>
              </Card>
              <Card 
                title="Average Portfolio Variance" 
                borderTopColor={averagePortfolioVariance > 0 ? 'alert' : 'positive'}
                className="border border-gray-700"
              >
                  <p className={`text-4xl font-bold flex items-center ${averagePortfolioVariance > 0 ? 'text-red-500' : 'text-alert-positive'}`}>
                      {averagePortfolioVariance.toFixed(2)}<Percent className="w-6 h-6 ml-2" />
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Requires management review for overruns</p>
              </Card>
              <Card title="Projects Ahead of Budget" borderTopColor="positive" className="border border-gray-700">
                  <p className="text-4xl font-bold text-alert-positive">{totalProjectsAheadOfBudget} / {totalActiveProjects}</p>
                  <p className="text-sm text-gray-400 mt-1">Cost Underrun Status</p>
              </Card>
            </div>
            
            <Card title="Project List & Status" subtitle="Financial health summary of active projects." borderTopColor="secondary" className="border border-gray-700">
              <div className="overflow-x-auto rounded-lg border border-gray-700">
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
                        <tr key={p.projectId} className="hover:bg-gray-700/50 transition">
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
                            <Link href={`/projects/${p.projectId}/overview`} className="text-brand-primary hover:text-white flex items-center justify-end">
                              View Project <ExternalLink className="w-4 h-4 ml-1" />
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