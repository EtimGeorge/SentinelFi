import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Folder, TrendingUp, CheckCircle, AlertTriangle, TrendingDown, Percent, DollarSign, ExternalLink, Plus, ArrowRight, ArrowLeft as ArrowLeftIcon } from 'lucide-react';
import { useSecuredApi } from '../components/hooks/useSecuredApi';
import PageContainer from '../components/Layout/PageContainer';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { formatCurrency } from '../lib/utils';
import { Project } from '@shared/types/project';

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

  // Wizard State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    rfq_number: '',
    currency: 'NGN',
    contract_value: 0,
    contingency_percent: 5,
    vat_rate: 7.5,
    wht_rate: 5,
    sow_details: '',
  });

  const fetchProjectData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<{ projects: ProjectData[]; total: number }>('/projects'); 
        setProjectRawData(response.data.projects);
      } catch (e: any) {
        setError(`Failed to fetch project data: ${e.response?.data?.message || e.message}`);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchProjectData();
  }, [api]);

  const handleCreateProject = async () => {
      setIsSubmitting(true);
      try {
          await api.post('/projects', formData);
          setIsModalOpen(false);
          setStep(1);
          setFormData({
              project_name: '',
              rfq_number: '',
              currency: 'NGN',
              contract_value: 0,
              contingency_percent: 5,
              vat_rate: 7.5,
              wht_rate: 5,
              sow_details: '',
          });
          fetchProjectData();
      } catch (e: any) {
          alert(`Error creating project: ${e.message}`);
      } finally {
          setIsSubmitting(false);
      }
  };

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
        headerContent={
          <div className="flex items-center space-x-4">
              <Button onClick={() => setIsModalOpen(true)} variant="primary" className="shadow-lg shadow-brand-primary/20">
                <Plus className="w-5 h-5 mr-2" /> New Project
              </Button>
              <div className="h-8 w-px bg-gray-700 mx-2" />
              <Folder className="w-8 h-8 text-brand-secondary" />
          </div>
        }
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

      {/* Project Creation Wizard */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setStep(1);
        }}
        title={`Project Setup Wizard: Step ${step} of 3`}
        size="lg"
        footer={
           <div className="flex justify-between w-full">
               {step > 1 ? (
                   <Button variant="secondary" onClick={() => setStep(step - 1)}>
                       <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back
                   </Button>
               ) : <div />}
               
               {step < 3 ? (
                   <Button variant="primary" onClick={() => setStep(step + 1)}>
                       Next Step <ArrowRight className="w-4 h-4 ml-2" />
                   </Button>
               ) : (
                   <Button variant="primary" onClick={handleCreateProject} disabled={isSubmitting}>
                       {isSubmitting ? 'Finalizing...' : 'Initialize Project'}
                   </Button>
               )}
           </div>
        }
      >
        <div className="space-y-6">
            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl mb-6">
                        <p className="text-sm text-brand-primary font-medium">Step 1: Identity & Reference</p>
                        <p className="text-xs text-gray-400">Define the core identification for this new fiscal project.</p>
                    </div>
                    <Input 
                        label="Project Name" 
                        required 
                        placeholder="e.g., Lagos Metro Expansion Phase 1" 
                        value={formData.project_name}
                        onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                    />
                    <Input 
                        label="RFQ Number (Reference)" 
                        placeholder="e.g., RFQ-2024-001" 
                        value={formData.rfq_number}
                        onChange={(e) => setFormData({...formData, rfq_number: e.target.value})}
                    />
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="p-4 bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl mb-6">
                        <p className="text-sm text-brand-secondary font-medium">Step 2: Financial Governance</p>
                        <p className="text-xs text-gray-400">Set the tax and contingency parameters for budget control.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Base Currency" 
                            disabled 
                            value={formData.currency}
                        />
                         <Input 
                            label="Contract Value" 
                            type="number"
                            placeholder="Final SOW Value"
                            value={(formData as any).contract_value}
                            onChange={(e) => setFormData({...formData, contract_value: parseFloat(e.target.value)})}
                        />
                    </div>
                <div className="grid grid-cols-2 gap-4">
                     <Input 
                        label="Contingency Fund (%)" 
                        type="number"
                        value={formData.contingency_percent}
                        onChange={(e) => setFormData({...formData, contingency_percent: parseFloat(e.target.value)})}
                    />
                </div>
                    <div className="grid grid-cols-2 gap-4">
                         <Input 
                            label="VAT Rate (%)" 
                            type="number"
                            value={formData.vat_rate}
                            onChange={(e) => setFormData({...formData, vat_rate: parseFloat(e.target.value)})}
                        />
                         <Input 
                            label="WHT Rate (%)" 
                            type="number"
                            value={formData.wht_rate}
                            onChange={(e) => setFormData({...formData, wht_rate: parseFloat(e.target.value)})}
                        />
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="p-4 bg-green-900/10 border border-green-800/30 rounded-xl mb-6">
                        <p className="text-sm text-green-400 font-medium">Step 3: Strategic Overview</p>
                        <p className="text-xs text-gray-400">Add notes or high-level Statement of Work details.</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Statement of Work (SOW)</label>
                        <textarea 
                            className="w-full bg-brand-dark border border-gray-700 rounded-xl p-4 text-gray-200 focus:border-brand-primary outline-none transition min-h-[150px]"
                            placeholder="Provide a summary of the project goals and delivery scope..."
                            value={formData.sow_details}
                            onChange={(e) => setFormData({...formData, sow_details: e.target.value})}
                        />
                    </div>
                </div>
            )}
        </div>
      </Modal>
    </>
  );
};

export default ProjectsPage;