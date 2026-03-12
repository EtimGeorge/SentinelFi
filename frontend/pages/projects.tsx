import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Folder, TrendingUp, CheckCircle, AlertTriangle, TrendingDown, Percent, DollarSign, ExternalLink, Plus, ArrowRight, ArrowLeft as ArrowLeftIcon, Search, Filter, Edit, Trash2, Archive, ShieldAlert, RefreshCcw } from 'lucide-react';
import api from '../lib/api';
import PageContainer from '../components/Layout/PageContainer';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useCurrency } from '../components/context/CurrencyContext';
import { useFormAutoSave } from '../lib/formAutoSave';
import { Project, ProjectStatus } from '@shared/types/project';

interface ProjectData extends Project {
  total_budgeted_rollup: number;
  total_paid_rollup: number;
  variance_pct: string;
}

interface Client {
  id: string;
  name: string;
}

interface ProjectSummary {
  name: string;
  projectId: string;
  totalBudget: number;
  totalActual: number;
  variancePercent: number;
  status: string;
  color: 'primary' | 'secondary' | 'alert' | 'positive';
  statusIcon?: React.ReactNode;
}

import useGlobalStore from '../store/globalStore';

const ProjectsPage: React.FC = () => {
  const router = useRouter();
  const apiRef = useRef(api);
  const { convertToDisplay, userCurrency, currencies } = useCurrency();
  const { selectedProjectId, setSelectedProjectId } = useGlobalStore();
  const [projectRawData, setProjectRawData] = useState<ProjectData[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'risk' | 'critical' | 'ARCHIVED'>('all');

  // Deletion/Archiving State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectData | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    rfq_number: '',
    client_id: '',
    currency: 'NGN',
    contract_value: 0,
    contingency_percent: 5,
    vat_rate: 7.5,
    wht_rate: 5,
    sow_details: '',
  });
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const { autoSave, restoreData, clearData } = useFormAutoSave('new-project-wizard');

  useEffect(() => {
    if (isModalOpen) {
      const restored = restoreData<any>();
      if (restored && confirm('Restore previous project draft?')) {
        setFormData(restored);
      }
    }
  }, [isModalOpen]);

  const fetchProjectData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[ProjectsPage] Fetching project data...');
      const response = await apiRef.current.get<{ projects: ProjectData[]; total: number }>('/projects', { signal });
      console.log('[ProjectsPage] Received projects:', response.data.projects?.length || 0, response.data);
      setProjectRawData(response.data.projects || []);
    } catch (e: any) {
      if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
      setError(`Failed to fetch project data: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await apiRef.current.get<Client[]>('/clients', { signal });
      setClients(response.data);
    } catch (e: any) {
      if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
      console.error('Failed to fetch clients', e);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProjectData(controller.signal);
    fetchClients(controller.signal);
    return () => controller.abort();
  }, [fetchProjectData, fetchClients]);

  // Step validation before advancing in wizard
  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!formData.project_name.trim()) {
        toast.error('Project name is required.');
        return false;
      }
      if (formData.project_name.trim().length < 3) {
        toast.error('Project name must be at least 3 characters.');
        return false;
      }
      if (isNewClient && !newClientName.trim()) {
        toast.error('Please enter a name for the new client, or switch to an existing client.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.contract_value || formData.contract_value <= 0) {
        toast.error('Contract value must be greater than zero.');
        return false;
      }
      if (formData.contingency_percent < 0 || formData.contingency_percent > 100) {
        toast.error('Contingency percentage must be between 0 and 100.');
        return false;
      }
      if (formData.vat_rate < 0 || formData.vat_rate > 100) {
        toast.error('VAT rate must be between 0 and 100.');
        return false;
      }
    }
    return true;
  };

  const advanceStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleCreateProject = async () => {
    console.log('[handleCreateProject] Triggered. FormData:', formData);
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        client_id: !!formData.client_id && !isNewClient ? formData.client_id : undefined,
        client_name: isNewClient ? newClientName : undefined,
      };

      console.log('[handleCreateProject] Sending payload to /projects:', payload);
      const response = await apiRef.current.post<ProjectData>('/projects', payload);
      console.log('[handleCreateProject] API response received:', response.data);
      const newProject = response.data;

      clearData();
      setIsModalOpen(false);
      setStep(1);
      setFormData({
        project_name: '',
        rfq_number: '',
        client_id: '',
        currency: 'NGN',
        contract_value: 0,
        contingency_percent: 5,
        vat_rate: 7.5,
        wht_rate: 5,
        sow_details: '',
      });

      toast.success(`Project "${newProject.project_name}" initialized successfully!`);
      router.push(`/projects/${newProject.project_id}/overview`);

    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    setIsProcessing(projectId);
    try {
      await apiRef.current.patch(`/projects/${projectId}/archive`);
      toast.success('Project archived successfully.');
      fetchProjectData();
    } catch (e: any) {
      toast.error(`Failed to archive project: ${e.response?.data?.message || e.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRestoreProject = async (projectId: string) => {
    setIsProcessing(projectId);
    try {
      await apiRef.current.patch(`/projects/${projectId}/restore`);
      toast.success('Project restored successfully.');
      fetchProjectData();
    } catch (e: any) {
      toast.error(`Failed to restore project: ${e.response?.data?.message || e.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsProcessing(projectToDelete.project_id);
    try {
      await apiRef.current.delete(`/projects/${projectToDelete.project_id}`);
      toast.success('Project soft-deleted successfully.');
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
      setDeleteConfirmText('');
      fetchProjectData();
    } catch (e: any) {
      toast.error(`Deletion Blocked: ${e.response?.data?.message || e.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const projects = projectRawData;

  const totalActiveProjects = projects.length;
  
  // KPI Aggregates using Budget Management pattern
  const portfolioKPIs = useMemo(() => {
    let totalContractValue = 0;
    let atRiskCount = 0;
    const totalVarianceSum = projects.reduce((sum, p) => sum + parseFloat(p.variance_pct || '0'), 0);
    const averagePortfolioVariance = totalActiveProjects > 0 ? totalVarianceSum / totalActiveProjects : 0;

    projects.forEach(p => {
      // Convert individual project value to user currency before summing
      const valueInUserCurrency = convertAmount(
        Number(p.contract_value || 0),
        p.currency || 'NGN',
        userCurrency.code
      );
      totalContractValue += valueInUserCurrency;
      if (parseFloat(p.variance_pct || '0') > 2) atRiskCount++;
    });

    return { totalContractValue, atRiskCount, averagePortfolioVariance };
  }, [projects, convertAmount, userCurrency.code, totalActiveProjects]);

  // Optimized Filter Logic
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Defensive check for project identity
      if (!p || !p.project_name) return false;

      const projectNameLower = p.project_name.toLowerCase();
      const clientNameLower = (p.client?.name || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch = projectNameLower.includes(searchLower) ||
        clientNameLower.includes(searchLower);

      const variance = parseFloat(p.variance_pct || '0');
      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') matchesStatus = p.status === ProjectStatus.ACTIVE;
      if (statusFilter === 'ARCHIVED') matchesStatus = p.status === ProjectStatus.ARCHIVED;
      if (statusFilter === 'risk') matchesStatus = variance > 2 && variance <= 5 && p.status !== ProjectStatus.ARCHIVED;
      if (statusFilter === 'critical') matchesStatus = variance > 5 && p.status !== ProjectStatus.ARCHIVED;

      // Hide archived from 'all' view unless explicitly selected? 
      // Actually, 'all' usually means 'active' in these UIs. Let's make 'all' exclude archived for clarity.
      if (statusFilter === 'all' && p.status === ProjectStatus.ARCHIVED) return false;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <Card className="p-6 bg-brand-dark/40 border border-gray-700">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Total Active Projects</p>
                <p className="text-3xl font-bold text-white">{projects.length}</p>
              </Card>
              <Card className="p-6 bg-brand-dark/40 border border-gray-700">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Portfolio Variance</p>
                <p className={`text-3xl font-bold ${portfolioKPIs.averagePortfolioVariance > 0 ? 'text-red-500' : 'text-alert-positive'}`}>
                  {portfolioKPIs.averagePortfolioVariance.toFixed(2)}%
                </p>
              </Card>
              <Card className="p-6 bg-brand-dark/40 border border-gray-700">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Total Contract Value</p>
                <p className="text-3xl font-bold text-brand-primary">
                  {convertToDisplay(portfolioKPIs.totalContractValue, userCurrency.code)}
                </p>
              </Card>
              <Card className="p-6 bg-brand-dark/40 border border-gray-700">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Projects at Risk</p>
                <p className={`text-3xl font-bold flex items-center gap-2 ${portfolioKPIs.atRiskCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${portfolioKPIs.atRiskCount > 0 ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
                  {portfolioKPIs.atRiskCount > 0 ? `${portfolioKPIs.atRiskCount} at risk` : 'All clear'}
                </p>
              </Card>
            </div>

            {/* Advanced Filtering & Search Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects or clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-brand-dark/50 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:border-brand-primary outline-none transition"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${statusFilter === 'all' ? 'bg-brand-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  All Projects
                </button>
                <button
                  onClick={() => setStatusFilter('risk')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${statusFilter === 'risk' ? 'bg-brand-secondary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  At Risk
                </button>
                <button
                  onClick={() => setStatusFilter('ARCHIVED')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${statusFilter === 'ARCHIVED' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  Archive
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.length === 0 ? (
                <div className="col-span-full p-12 text-center text-gray-500 bg-brand-dark/20 rounded-2xl border border-dashed border-gray-700">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No projects match your current filters.</p>
                </div>
              ) : (
                filteredProjects.map((project) => {
                  const variance = parseFloat(project.variance_pct || '0');
                  const isCritical = variance > 5;
                  const totalBudget = Number(project.total_budgeted_rollup || 0);
                  const totalActual = Number(project.total_paid_rollup || 0);
                  const contractValue = Number(project.contract_value || 0);

                  return (
                    <Card
                      key={project.project_id}
                      className="group relative overflow-hidden flex flex-col hover:border-brand-primary/50 transition-all duration-300"
                      borderTopColor={isCritical ? 'alert' : 'primary'}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-start gap-3">
                          {/* Health Engine Indicator */}
                          <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${variance > 5 ? 'bg-alert-critical animate-pulse' : variance > 2 ? 'bg-brand-secondary' : 'bg-alert-positive'}`} />
                          <div>
                            <h3 className="text-lg font-black text-white group-hover:text-brand-primary transition">{project.project_name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{project.client?.name || 'Internal Operations'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${project.status === ProjectStatus.ACTIVE ? 'bg-brand-primary/20 text-brand-primary' : project.status === ProjectStatus.ARCHIVED ? 'bg-gray-700 text-gray-400' : 'bg-gray-800 text-gray-400'}`}>
                          {project.status}
                        </span>
                      </div>

                      <div className="space-y-4 flex-grow">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Contract Value</p>
                            <p className="text-xl font-bold text-brand-primary">{convertToDisplay(contractValue, project.currency || 'NGN')}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black ${isCritical ? 'text-alert-critical' : 'text-alert-positive'}`}>
                              {variance > 0 ? '+' : ''}{variance.toFixed(2)}%
                            </p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Variance</p>
                          </div>
                        </div>
                        {totalBudget > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Allocated Budget</span>
                            <span className="text-gray-100 font-mono">{convertToDisplay(totalBudget, project.currency || 'NGN')}</span>
                          </div>
                        )}

                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Progress</p>
                          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${isCritical ? 'bg-alert-critical' : 'bg-brand-primary'}`}
                              style={{ width: `${Math.min(100, (totalActual / totalBudget) * 100 || 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {project.createdBy && (
                            <div className="w-7 h-7 rounded-full border-2 border-brand-primary/30 bg-brand-primary/10 flex items-center justify-center text-[9px] font-bold text-brand-primary" title={project.createdBy.email}>
                              {project.createdBy.email?.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-[10px] text-gray-500 font-medium">
                            {project.createdBy?.email ? project.createdBy.email.split('@')[0] : 'System'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {project.status === ProjectStatus.ARCHIVED ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-yellow-500 hover:bg-yellow-500/10 p-1.5"
                              title="Restore Project"
                              onClick={() => handleRestoreProject(project.project_id)}
                              disabled={isProcessing === project.project_id}
                            >
                              <RefreshCcw className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:bg-gray-500/10 p-1.5"
                              title="Archive Project"
                              onClick={() => handleArchiveProject(project.project_id)}
                              disabled={isProcessing === project.project_id}
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-alert-critical hover:bg-alert-critical/10 p-1.5"
                            title="Delete Project"
                            onClick={() => {
                              setProjectToDelete(project);
                              setIsDeleteModalOpen(true);
                            }}
                            disabled={isProcessing === project.project_id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Link href={`/projects/${project.project_id}/overview`}>
                          <Button variant="ghost" size="sm" className="text-brand-primary font-black uppercase text-[10px] tracking-widest hover:bg-brand-primary/10">
                            View Dossier <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </>
        )
        }
      </PageContainer >

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
              <Button variant="primary" onClick={advanceStep}>
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
                onChange={(e) => {
                  const updated = { ...formData, project_name: e.target.value };
                  setFormData(updated);
                  autoSave(updated);
                }}
              />
              <Input
                label="RFQ Number (Reference)"
                placeholder="e.g., RFQ-2024-001"
                value={formData.rfq_number}
                onChange={(e) => {
                  const updated = { ...formData, rfq_number: e.target.value };
                  setFormData(updated);
                  autoSave(updated);
                }}
              />
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-400">Associated Client</label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="newClientToggle"
                    checked={isNewClient}
                    onChange={(e) => setIsNewClient(e.target.checked)}
                    className="mr-2 h-3 w-3 accent-brand-primary"
                  />
                  <label htmlFor="newClientToggle" className="text-xs text-brand-primary cursor-pointer select-none">
                    {isNewClient ? 'Switch to Existing' : 'Create New Client'}
                  </label>
                </div>
              </div>

              {isNewClient ? (
                <input
                  type="text"
                  placeholder="Enter Name for New Client"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-brand-dark border border-gray-700 rounded-xl p-3 text-gray-200 focus:border-brand-primary outline-none transition"
                />
              ) : (
                <select
                  className="w-full bg-brand-dark border border-gray-700 rounded-xl p-3 text-gray-200 focus:border-brand-primary outline-none transition"
                  value={formData.client_id}
                  onChange={(e) => {
                    const updated = { ...formData, client_id: e.target.value };
                    setFormData(updated);
                    autoSave(updated);
                  }}
                >
                  <option value="">Internal Project (No Client)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl mb-6">
                <p className="text-sm text-brand-secondary font-medium">Step 2: Financial Governance</p>
                <p className="text-xs text-gray-400">Set the tax and contingency parameters for budget control.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-400">Base Currency</label>
                  <select
                    className="w-full bg-brand-dark border border-gray-700 rounded-xl p-3 text-gray-200 focus:border-brand-primary outline-none transition"
                    value={formData.currency}
                    onChange={(e) => {
                      const updated = { ...formData, currency: e.target.value };
                      setFormData(updated);
                      autoSave(updated);
                    }}
                  >
                    {currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label={`Contract Value (${formData.currency})`}
                  type="number"
                  placeholder="Final SOW Value"
                  value={(formData as any).contract_value}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...formData, contract_value: isNaN(val) ? 0 : val };
                    setFormData(updated);
                    autoSave(updated);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Contingency Fund (%)"
                  type="number"
                  value={formData.contingency_percent}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...formData, contingency_percent: isNaN(val) ? 0 : val };
                    setFormData(updated);
                    autoSave(updated);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="VAT Rate (%)"
                  type="number"
                  value={formData.vat_rate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...formData, vat_rate: isNaN(val) ? 0 : val };
                    setFormData(updated);
                    autoSave(updated);
                  }}
                />
                <Input
                  label="WHT Rate (%)"
                  type="number"
                  value={formData.wht_rate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...formData, wht_rate: isNaN(val) ? 0 : val };
                    setFormData(updated);
                    autoSave(updated);
                  }}
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
                  onChange={(e) => {
                    const updated = { ...formData, sow_details: e.target.value };
                    setFormData(updated);
                    autoSave(updated);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Modal >

      {/* Project Deletion Safety Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProjectToDelete(null);
          setDeleteConfirmText('');
        }}
        title="CRITICAL: Confirm Project Deletion"
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-alert-critical hover:bg-red-600 border-none shadow-lg shadow-alert-critical/20"
              disabled={deleteConfirmText !== projectToDelete?.project_name || isProcessing === projectToDelete?.project_id}
              onClick={handleDeleteProject}
            >
              {isProcessing === projectToDelete?.project_id ? 'Deleting...' : 'Confirm Deletion'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-alert-critical/10 border border-alert-critical/30 rounded-xl text-alert-critical">
            <ShieldAlert className="w-10 h-10 flex-shrink-0" />
            <div>
              <p className="text-sm font-black uppercase tracking-tight">Financial Integrity Warning</p>
              <p className="text-xs opacity-80">Deletion is only permitted for projects with ZERO fiscal activity. If this project has budgets or expenses, the system will BLOCK deletion.</p>
            </div>
          </div>

          <div className="py-2">
            <p className="text-sm text-gray-300">You are about to delete <span className="text-white font-bold underline decoration-alert-critical">{projectToDelete?.project_name}</span>.</p>
            <p className="text-xs text-gray-500 mt-2">To confirm, please type the exact project name below:</p>
          </div>

          <Input
            placeholder="Type project name here..."
            className="border-alert-critical/30 focus:border-alert-critical"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
        </div>
      </Modal>

    </>
  );
};

export default ProjectsPage;