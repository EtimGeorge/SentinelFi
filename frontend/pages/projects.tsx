import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Folder, TrendingUp, CheckCircle, AlertTriangle, TrendingDown, Percent, DollarSign, ExternalLink, Plus, ArrowRight, ArrowLeft as ArrowLeftIcon, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { useSecuredApi } from '../components/hooks/useSecuredApi';
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

const ProjectsPage: React.FC = () => {
  const router = useRouter();
  const api = useSecuredApi();
  const { convertToDisplay, displayCurrency, currencies } = useCurrency();
  const [projectRawData, setProjectRawData] = useState<ProjectData[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'risk' | 'critical'>('all');

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

  const { autoSave, restoreData, clearData } = useFormAutoSave('new-project-wizard');

  useEffect(() => {
    if (isModalOpen) {
      const restored = restoreData<any>();
      if (restored && confirm('Restore previous project draft?')) {
        setFormData(restored);
      }
    }
  }, [isModalOpen]);

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

  const fetchClients = async () => {
    try {
      const response = await api.get<Client[]>('/clients');
      setClients(response.data);
    } catch (e) {
      console.error('Failed to fetch clients', e);
    }
  };

  useEffect(() => {
    fetchProjectData();
    fetchClients();
  }, [api]);

  const handleCreateProject = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.post<ProjectData>('/projects', formData);
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

      // Navigate to the newly created project's overview
      alert(`Project "${newProject.project_name}" initialized successfully!`);
      router.push(`/projects/${newProject.project_id}/overview`);

    } catch (e: any) {
      alert(`Error creating project: ${e.response?.data?.message || e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const projects = projectRawData;

  const totalActiveProjects = projects.length;
  const averagePortfolioVariance = totalActiveProjects > 0
    ? projects.reduce((sum, p) => sum + parseFloat(p.variance_pct || '0'), 0) / totalActiveProjects
    : 0;

  // Optimized Filter Logic
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const variance = parseFloat(p.variance_pct || '0');
      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') matchesStatus = p.status === ProjectStatus.ACTIVE;
      if (statusFilter === 'risk') matchesStatus = variance > 2 && variance <= 5;
      if (statusFilter === 'critical') matchesStatus = variance > 5;

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
                <p className={`text-3xl font-bold ${averagePortfolioVariance > 0 ? 'text-red-500' : 'text-alert-positive'}`}>
                  {averagePortfolioVariance.toFixed(2)}%
                </p>
              </Card>
              <Card className="p-6 bg-brand-dark/40 border border-gray-700">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Pending Approvals</p>
                <p className="text-3xl font-bold text-brand-primary">4</p>
              </Card>
              <Card className="p-6 bg-brand-dark/40 border border-gray-700">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Audit Status</p>
                <p className="text-sm font-bold text-green-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Compliant</p>
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
                  onClick={() => setStatusFilter('critical')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${statusFilter === 'critical' ? 'bg-alert-critical text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  Critical Overrun
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
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${project.status === ProjectStatus.ACTIVE ? 'bg-brand-primary/20 text-brand-primary' : 'bg-gray-800 text-gray-400'}`}>
                          {project.status}
                        </span>
                      </div>

                      <div className="space-y-4 flex-grow">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Allocated Budget</p>
                            <p className="text-xl font-bold text-gray-100">{convertToDisplay(totalBudget)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black ${isCritical ? 'text-alert-critical' : 'text-alert-positive'}`}>
                              {variance > 0 ? '+' : ''}{variance.toFixed(2)}%
                            </p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Variance</p>
                          </div>
                        </div>

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
                        <div className="flex -space-x-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-brand-dark bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-400">
                              U{i}
                            </div>
                          ))}
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
        )}
      </PageContainer>

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
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium text-gray-400">Associated Client</label>
                  <Link href="/admin/clients">
                    <span className="text-xs text-brand-primary hover:underline cursor-pointer flex items-center">
                      <Plus className="w-3 h-3 mr-1" /> New Client
                    </span>
                  </Link>
                </div>
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
              </div>
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
      </Modal>
    </>
  );
};

export default ProjectsPage;