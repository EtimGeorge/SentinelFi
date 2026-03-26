import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
// Replaced by useCurrency convertToDisplay in main content area
import { useFormAutoSave } from '../../../lib/formAutoSave';
import {
    ArrowLeft,
    Download,
    Printer,
    Edit,
    Trash2,
    FileText,
    Plus,
    DollarSign,
    TrendingDown,
    AlertCircle,
    History,
    CreditCard,
    Layers,
    ShieldCheck,
    Briefcase,
    Zap,
    Check
} from 'lucide-react';
import { WbsBudget } from '@shared/types/wbs';
import { LiveExpense } from '@shared/types/expense';
import { Project, ProjectStatus } from '@shared/types/project';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import WBSSelect from '../../../components/projects/WBSSelect';
import { useBreadcrumbs } from '../../../components/context/BreadcrumbContext'; // Breadcrumb label registration
import { useCurrency } from '../../../components/context/CurrencyContext';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
    PieChart,
    Pie,
    Area,
    ComposedChart,
    Line
} from 'recharts';

// Interface for Project details (from /projects/:id)
interface ProjectDetail extends Project {
    total_budgeted_rollup: number;
    total_paid_rollup: number;
    total_inflow_rollup: number;
}

interface CashFlowPoint {
    month: number;
    inflow: number;
    outflow: number;
}

interface LpoData {
    id: string;
    lpo_number: string;
    vendor_name: string;
    amount_committed: number;
    amount_paid: number;
    status: string;
    description: string;
    created_at: string;
    wbsItem?: { wbs_code: string; description: string };
    createdBy?: { email: string };
}

interface InflowData {
    id: string;
    milestone_name: string;
    amount_received: number;
    receipt_date: string;
    description: string;
    receivedBy?: { email: string };
}

interface AuditLog {
    id: string;
    change_type: string;
    old_value: number;
    new_value: number;
    description: string;
    created_at: string;
    performedBy?: { email: string };
}

const ProjectOverviewPage: React.FC = () => {
    const router = useRouter();
    const { id } = router.query; // This will be the project_id
    const apiRef = useRef(api);
    const { userCurrency, convertToDisplay, convertAmount } = useCurrency();

    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [budgets, setBudgets] = useState<WbsBudget[]>([]);
    const [expenses, setExpenses] = useState<LiveExpense[]>([]);
    const [cashflow, setCashflow] = useState<CashFlowPoint[]>([]);
    const [lpos, setLpos] = useState<LpoData[]>([]);
    const [inflowsRaw, setInflowsRaw] = useState<InflowData[]>([]);
    const [audits, setAudits] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auto-save hooks for forms
    const { autoSave: autoSaveExpense, restoreData: restoreExpense, clearData: clearExpenseData } = useFormAutoSave(`project-${id}-expense`);
    const { autoSave: autoSaveInflow, restoreData: restoreInflow, clearData: clearInflowData } = useFormAutoSave(`project-${id}-inflow`);

    // Modal States
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        description: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        wbs_id: ''
    });

    const [isInflowModalOpen, setIsInflowModalOpen] = useState(false);
    const [isSubmittingInflow, setIsSubmittingInflow] = useState(false);
    const [inflowForm, setInflowForm] = useState({
        milestone_name: '',
        amount_received: 0,
        receipt_date: new Date().toISOString().split('T')[0],
        description: ''
    });

    // Expense Correction State
    const [selectedExpense, setSelectedExpense] = useState<LiveExpense | null>(null);
    const [isDeleteExpenseModalOpen, setIsDeleteExpenseModalOpen] = useState(false);
    const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
    const [editExpenseAmount, setEditExpenseAmount] = useState('');
    const [editExpenseDescription, setEditExpenseDescription] = useState('');
    const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

    const fetchProjectData = useCallback(async (signal?: AbortSignal) => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            // Fetch project details with rollups
            const projectResponse = await apiRef.current.get<ProjectDetail>(`/projects/${id}/rollup`, { signal });
            setProject(projectResponse.data);

            // Fetch cashflow heatmap data
            const cfResponse = await apiRef.current.get<CashFlowPoint[]>(`/projects/${id}/cashflow`, { signal });
            setCashflow(cfResponse.data);

            // Fetch associated budgets using projectId filter
            const budgetsResponse = await apiRef.current.get<{ data: WbsBudget[], total: number }>(`/wbs/budgets?projectId=${id}&limit=100`, { signal });
            setBudgets(budgetsResponse.data.data);

            // Fetch associated expenses using projectId filter
            const expensesResponse = await apiRef.current.get<{ data: LiveExpense[], total: number }>(`/wbs/expenses?projectId=${id}&limit=100`, { signal });
            setExpenses(expensesResponse.data.data);

            // Fetch LPOs
            const lposResponse = await apiRef.current.get<LpoData[]>(`/projects/${id}/lpos`, { signal });
            setLpos(lposResponse.data);

            // Fetch Inflows raw
            const inflowsResponse = await apiRef.current.get<InflowData[]>(`/projects/${id}/inflows`, { signal });
            setInflowsRaw(inflowsResponse.data);

            // Fetch Audit Logs
            const auditsResponse = await apiRef.current.get<AuditLog[]>(`/projects/${id}/audits`, { signal });
            setAudits(auditsResponse.data);

        } catch (e: any) {
            if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
            setError(`Failed to fetch project details: ${e.response?.data?.message || e.message}`);
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Restore expense draft when modal opens
    useEffect(() => {
        if (isExpenseModalOpen) {
            const restored = restoreExpense();
            if (restored && confirm('Restore previous expense draft?')) {
                setExpenseForm(restored);
            }
        }
    }, [isExpenseModalOpen]);

    // Restore inflow draft when modal opens
    useEffect(() => {
        if (isInflowModalOpen) {
            const restored = restoreInflow();
            if (restored && confirm('Restore previous inflow draft?')) {
                setInflowForm(restored);
            }
        }
    }, [isInflowModalOpen]);

    const handleLogExpense = async () => {
        if (!expenseForm.description || !expenseForm.amount || !expenseForm.wbs_id) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setIsSubmittingExpense(true);
        try {
            await apiRef.current.post('/wbs/expense/live-entry', {
                ...expenseForm,
                actual_paid_amount: Number(expenseForm.amount),
            });
            clearExpenseData(); // Clear auto-save on success
            setIsExpenseModalOpen(false);
            setExpenseForm({
                description: '',
                amount: 0,
                expense_date: new Date().toISOString().split('T')[0],
                wbs_id: ''
            });
            fetchProjectData();
        } catch (e: any) {
            toast.error(`Error logging expense: ${e.response?.data?.message || e.message}`);
        } finally {
            setIsSubmittingExpense(false);
        }
    };

    const handleLogInflow = async () => {
        if (!inflowForm.milestone_name || !inflowForm.amount_received) {
            toast.error('Please fill in required fields.');
            return;
        }
        setIsSubmittingInflow(true);
        try {
            await apiRef.current.post(`/projects/${id}/inflow`, inflowDataMapper(inflowForm));
            clearInflowData(); // Clear auto-save on success
            setIsInflowModalOpen(false);
            setInflowForm({
                milestone_name: '',
                amount_received: 0,
                receipt_date: new Date().toISOString().split('T')[0],
                description: ''
            });
            fetchProjectData();
        } catch (e: any) {
            toast.error(`Error logging inflow: ${e.message}`);
        } finally {
            setIsSubmittingInflow(false);
        }
    };

    const inflowDataMapper = (form: typeof inflowForm) => ({
        ...form,
        amount_received: Number(form.amount_received)
    });

    useEffect(() => {
        const controller = new AbortController();
        fetchProjectData(controller.signal);
        return () => controller.abort();
    }, [fetchProjectData]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadBudgets = async () => {
        try {
            const response = await apiRef.current.get(`/wbs/budgets/export?projectId=${id}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `project_${project?.project_name}_budgets.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e: any) {
            toast.error(`Failed to download budgets: ${e.response?.data?.message || e.message}`);
        }
    };

    const handleDownloadBudgetPdf = async () => {
        setLoading(true);
        try {
            const response = await apiRef.current.get(`/wbs/projects/${id}/report-pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Budget_Report_${project?.project_name}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Budget Report downloaded');
        } catch (e: any) {
            toast.error(`Failed to download budget report: ${e.response?.data?.message || e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExpenses = async (format: 'csv' | 'pdf' | 'xlsx' = 'csv') => {
        try {
            const response = await apiRef.current.get(`/wbs/expenses/export?projectId=${id}&format=${format}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
            link.setAttribute('download', `project_${project?.project_name}_expenses.${ext}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e: any) {
            toast.error(`Failed to download expenses: ${e.response?.data?.message || e.message}`);
        }
    };

    const handleEditBudget = (wbs_id: string) => {
        console.log(`Edit budget: ${wbs_id}`);
        toast('Budget editing coming in next release.', { icon: '🚧' });
    };

    const handleDeleteBudget = async (wbs_id: string) => {
        if (window.confirm(`Are you sure you want to delete WBS Budget ID: ${wbs_id}? This action cannot be undone.`)) {
            try {
                await apiRef.current.delete(`/wbs/budget-draft/${wbs_id}`);
                toast.success('Budget deleted successfully!');
                fetchProjectData();
            } catch (e: any) {
                toast.error(`Failed to delete budget: ${e.response?.data?.message || e.message}`);
            }
        }
    };

    const handleEditExpense = (expense: LiveExpense) => {
        setSelectedExpense(expense);
        setEditExpenseAmount(expense.amount.toString());
        setEditExpenseDescription(expense.description);
        setIsEditExpenseModalOpen(true);
    };

    const handleUpdateExpenseSubmission = async () => {
        if (!selectedExpense) return;
        setIsSubmittingCorrection(true);
        try {
            await apiRef.current.patch(`/wbs/expense/live-entry/${selectedExpense.id}`, {
                amount: parseFloat(editExpenseAmount),
                description: editExpenseDescription,
            });
            toast.success("Expense corrected. WBS metrics recalibrated.");
            setIsEditExpenseModalOpen(false);
            fetchProjectData();
        } catch (e: any) {
            toast.error(`Correction failed: ${e.response?.data?.message || e.message}`);
        } finally {
            setIsSubmittingCorrection(false);
        }
    };

    const handleDeleteExpenseFinal = async () => {
        if (!selectedExpense) return;
        setIsSubmittingCorrection(true);
        try {
            await apiRef.current.delete(`/wbs/expense/live-entry/${selectedExpense.id}`);
            toast.success('Expense recalled. Budget actuals reverted!');
            setIsDeleteExpenseModalOpen(false);
            fetchProjectData();
        } catch (e: any) {
            toast.error(`Failed to delete expense: ${e.response?.data?.message || e.message}`);
        } finally {
            setIsSubmittingCorrection(false);
        }
    };

    const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'expenses' | 'inflows' | 'lpos' | 'history'>('overview');
    const { setLabel } = useBreadcrumbs(); // Register breadcrumb labels

    // Register project name in breadcrumbs when loaded
    useEffect(() => {
        if (project && id) {
            setLabel(id as string, project.project_name);
        }
    }, [project, id, setLabel]);

    if (loading) {
        return (
            <PageContainer title="Loading Project..." subtitle="">
                <div className="text-brand-primary text-lg text-center my-10">Loading project data...</div>
            </PageContainer>
        );
    }

    if (error) {
        return (
            <PageContainer title="Error" subtitle="">
                <div className="text-alert-critical text-lg text-center my-10">{error}</div>
            </PageContainer>
        );
    }

    if (!project) {
        return (
            <PageContainer title="Project Not Found" subtitle="">
                <div className="text-alert-critical text-lg text-center my-10">Project with ID &quot;{id}&quot; not found.</div>
            </PageContainer>
        );
    }

    return (
        <>
            <Head><title>{project.project_name} | Project Workspace</title></Head>
            <PageContainer
                title={project.project_name}
                subtitle={`Project ID: ${project.project_id}`}
                headerContent={
                    <div className="flex items-center space-x-3">
                        <Link href="/projects" className="bg-brand-dark/50 hover:bg-brand-dark text-gray-300 p-2 rounded-lg border border-gray-700 transition">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="h-8 w-px bg-gray-700 mx-2" />
                        <div className="flex bg-brand-dark/50 rounded-lg p-1 border border-gray-700 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'overview' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Layers className="w-4 h-4 mr-2" /> Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('budget')}
                                className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'budget' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Briefcase className="w-4 h-4 mr-2" /> Budget
                            </button>
                            <button
                                onClick={() => setActiveTab('expenses')}
                                className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'expenses' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <DollarSign className="w-4 h-4 mr-2" /> Expenses
                            </button>
                            <button
                                onClick={() => setActiveTab('lpos')}
                                className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'lpos' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <ShieldCheck className="w-4 h-4 mr-2" /> LPOs
                            </button>
                            <button
                                onClick={() => setActiveTab('inflows')}
                                className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'inflows' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <CreditCard className="w-4 h-4 mr-2" /> Inflows
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'history' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <History className="w-4 h-4 mr-2" /> History
                            </button>
                        </div>
                    </div>
                }
            >
                {/* Visual Project Lifecycle Stepper */}
                <div className="mb-10 mt-2 px-4">
                    <div className="relative flex justify-between items-center max-w-4xl mx-auto">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-800 -translate-y-1/2 z-0" />
                        <div
                            className="absolute top-1/2 left-0 h-0.5 bg-brand-primary -translate-y-1/2 z-0 transition-all duration-1000"
                            style={{
                                width: project.status === ProjectStatus.COMPLETED ? '100%' :
                                    expenses.length > 0 ? '75%' :
                                        budgets.length > 0 ? '50%' : '25%'
                            }}
                        />

                        {[
                            { label: 'Initiation', desc: 'SOW & Setup', icon: Briefcase, active: true },
                            { label: 'Budgeting', desc: 'WBS Allocation', icon: Layers, active: budgets.length > 0 },
                            { label: 'Execution', desc: 'Disbursements', icon: Zap, active: expenses.length > 0 },
                            { label: 'Closure', desc: 'Audit & Archive', icon: ShieldCheck, active: project.status === ProjectStatus.COMPLETED }
                        ].map((step, i) => (
                            <div key={i} className="relative z-10 flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-xl ${step.active ? 'bg-brand-primary border-brand-primary text-white scale-110 shadow-brand-primary/20' : 'bg-brand-dark border-gray-700 text-gray-500'}`}>
                                    {step.active && project.status === ProjectStatus.COMPLETED && i < 3 ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                                </div>
                                <div className="mt-3 text-center">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${step.active ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
                                    <p className="text-[9px] text-gray-600 font-medium mt-0.5 hidden md:block">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {activeTab === 'overview' && (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="lg:col-span-2 space-y-6">
                                    <Card title="Executive Summary" borderTopColor="primary" className="border border-gray-700 shadow-xl">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-300">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Project Name</label>
                                                    <p className="text-xl font-semibold text-white">{project.project_name}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Client</label>
                                                    <p className="text-sm font-semibold text-brand-secondary uppercase">{project.client?.name || 'Internal Project'}</p>
                                                    {project.client?.industry && <p className="text-[10px] text-gray-500 italic">{project.client.industry}</p>}
                                                </div>
                                                <div className="flex items-center space-x-6">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">RFQ No.</label>
                                                        <p className="text-sm text-brand-primary font-mono">{project.rfq_number || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Status</label>
                                                        <p className="text-sm"><span className="px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-800 text-[10px] font-bold uppercase">{project.status}</span></p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Scope of Work</label>
                                                    <p className="text-sm leading-relaxed">{project.sow_details || 'No SOW details provided.'}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4 bg-brand-dark/30 p-4 rounded-xl border border-gray-800/50">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Financial Configuration</label>
                                                    <div className="mt-2 space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-400">Currency</span>
                                                            <span className="text-white font-bold">{project.currency || 'NGN'}</span>
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
                                        <Card title="Quick Actions" borderTopColor="secondary" className="border border-gray-700">
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
                                                    <div className="absolute left-0 right-0 top-full mt-1 hidden group-hover:block bg-brand-dark border border-gray-700 rounded-lg shadow-lg z-10">
                                                        <button onClick={() => handleExportExpenses('csv')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">CSV</button>
                                                        <button onClick={() => handleExportExpenses('pdf')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">PDF</button>
                                                        <button onClick={() => handleExportExpenses('xlsx')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Excel</button>
                                                    </div>
                                                </div>
                                                <button onClick={handlePrint} className="flex flex-col items-center justify-center p-4 bg-gray-800/50 rounded-xl hover:bg-gray-700 transition border border-gray-700">
                                                    <Printer className="w-6 h-6 text-brand-primary mb-2" />
                                                    <span className="text-xs font-bold text-gray-300">Print Page</span>
                                                </button>
                                                <Link href="/wbs-manager" className="flex flex-col items-center justify-center p-4 bg-brand-primary/10 rounded-xl hover:bg-brand-primary/20 transition border border-brand-primary/30">
                                                    <Layers className="w-6 h-6 text-brand-primary mb-2" />
                                                    <span className="text-xs font-bold text-brand-primary">Master Builder</span>
                                                </Link>
                                            </div>
                                        </Card>
                                        <Card title="Budget Health Index" borderTopColor="primary" className="border border-gray-700 flex flex-col items-center justify-center">
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
                                                    <p className="text-[10px] text-gray-500 uppercase font-black">Capacity Used</p>
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
                                    <Card title="Project Profitability (PGM)" borderTopColor="alert" className="border border-gray-700 bg-brand-dark/20">
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Projected Margin</label>
                                                    <p className={`text-3xl font-bold tracking-tight ${project.contract_value - project.total_budgeted_rollup >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {((project.contract_value - project.total_budgeted_rollup) / (project.contract_value || 1) * 100).toFixed(1)}%
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Realized</label>
                                                    <p className="text-lg font-bold text-white">
                                                        {((project.contract_value - project.total_paid_rollup) / (project.contract_value || 1) * 100).toFixed(1)}%
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-400">Contract Value</span>
                                                    <span className="text-white font-mono">{convertToDisplay(project.contract_value, project.currency || 'NGN')}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-400">Total Budget (Costs)</span>
                                                    <span className="text-red-400 font-mono">{convertToDisplay(project.total_budgeted_rollup, project.currency || 'NGN')}</span>
                                                </div>
                                                <div className="pt-2 border-t border-gray-800 flex justify-between text-sm font-bold">
                                                    <span className="text-gray-300">Target Profit</span>
                                                    <span className="text-green-400 font-mono">{convertToDisplay(project.contract_value - project.total_budgeted_rollup, project.currency || 'NGN')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card title="Cash Position" borderTopColor="primary" className="border border-gray-700 bg-brand-dark/20">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Invoiced/Received</label>
                                                    <p className="text-2xl font-bold text-white">{convertToDisplay(project.total_inflow_rollup, project.currency || 'NGN')}</p>
                                                </div>
                                                <Button variant="secondary" size="sm" onClick={() => setIsInflowModalOpen(true)}>
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
                                            <p className="text-[10px] text-gray-500 text-center uppercase tracking-tighter">
                                                Liquidity: {convertToDisplay(project.total_inflow_rollup - project.total_paid_rollup, project.currency || 'NGN')} available
                                            </p>
                                        </div>
                                    </Card>

                                    <Card title="Actionable Insights" borderTopColor="primary" className="border border-brand-primary/30 bg-brand-primary/5">
                                        <div className="space-y-4">
                                            {budgets.length === 0 && (
                                                <div className="flex items-start gap-3 p-3 bg-brand-dark/50 rounded-lg border border-gray-700">
                                                    <AlertCircle className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-bold text-white">Pending Financial Setup</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">No WBS budgets defined. Head to WBS Master Builder to allocate funds.</p>
                                                    </div>
                                                </div>
                                            )}
                                            {project.total_inflow_rollup < project.total_paid_rollup && (
                                                <div className="flex items-start gap-3 p-3 bg-red-900/20 rounded-lg border border-red-800/50">
                                                    <TrendingDown className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-bold text-red-400">Liquidity Deficit</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">Cash outflow exceeds inflows. Consider requesting client mobilization.</p>
                                                    </div>
                                                </div>
                                            )}
                                            {expenses.some(e => e.variance_flag?.includes('OVERRUN')) && (
                                                <div className="flex items-start gap-3 p-3 bg-yellow-900/20 rounded-lg border border-yellow-800/50">
                                                    <Zap className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-bold text-yellow-400">Budget Overrun Detected</p>
                                                        <p className="text-[10px] text-gray-500 mt-1">Significant variance in specific WBS nodes. Review expense log.</p>
                                                    </div>
                                                </div>
                                            )}
                                            {budgets.length > 0 && expenses.length === 0 && (
                                                <div className="flex items-start gap-3 p-3 bg-green-900/20 rounded-lg border border-green-800/50">
                                                    <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-bold text-green-400">Ready for Execution</p>
                                                        <p className="text-[10px] text-gray-500 mt-1">Budget is allocated. You can now begin logging disbursements.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                <Card title="Project Financial Trajectory (Burn-up)" borderTopColor="primary" className="border border-gray-700">
                                    <div className="h-[300px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={(() => {
                                                //const { convertAmount } = useCurrency();
                                                let cumulativeOutflow = 0;
                                                return cashflow.map(cf => {
                                                    cumulativeOutflow += cf.outflow;
                                                    return {
                                                        name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][cf.month - 1],
                                                        budget: convertAmount(project?.total_budgeted_rollup || 0, project?.currency || 'NGN', userCurrency.code),
                                                        actual: convertAmount(cumulativeOutflow, project?.currency || 'NGN', userCurrency.code)
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

                                <Card title="Monthly Cash Flow Heatmap" borderTopColor="secondary" className="border border-gray-700">
                                    <div className="h-[300px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={cashflow.map(cf => ({
                                                ...cf,
                                                name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][cf.month - 1],
                                                inflow: convertAmount(cf.inflow, project?.currency || 'NGN', userCurrency.code),
                                                outflow: convertAmount(cf.outflow, project?.currency || 'NGN', userCurrency.code)
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
                    )}

                    {activeTab === 'budget' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <Card title="Project Budget Ledger (WBS)" borderTopColor="secondary" className="border border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-sm text-gray-400 font-medium">Detailed breakdown of projected costs.</p>
                                    <Link href="/wbs-manager" className="text-xs text-brand-primary hover:text-white flex items-center p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/30 transition">
                                        Open Master Builder <Edit className="w-3 h-3 ml-1" />
                                    </Link>
                                </div>
                                {budgets.length === 0 ? (
                                    <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl">
                                        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-500">No WBS budget items found for this project.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-gray-700 bg-brand-dark/30 shadow-2xl">
                                        <table className="min-w-full divide-y divide-gray-700">
                                            <thead className="bg-brand-dark/50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">WBS Code</th>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">Budgeted Amount</th>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-6 py-4"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {budgets.map(budget => (
                                                    <tr key={budget.wbs_id} className="hover:bg-gray-700/50 transition">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-primary">{budget.wbs_code}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{budget.description}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white font-mono">{convertToDisplay(budget.total_cost_budgeted, project.currency || 'NGN')}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2 py-1 inline-flex text-[10px] leading-4 font-bold rounded-md border
                                        ${budget.status === 'approved' ? 'bg-green-900/20 text-green-400 border-green-800' : 'bg-yellow-900/20 text-yellow-400 border-yellow-800'}`}>
                                                                {budget.status.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <button onClick={() => handleDeleteBudget(budget.wbs_id)} className="text-gray-500 hover:text-red-400 transition ml-4"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {activeTab === 'expenses' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <Card title="Project Expense Journal" borderTopColor="alert" className="border border-gray-700 bg-brand-dark/10">
                                <div className="flex justify-between items-center mb-6">
                                    <p className="text-sm text-gray-400 font-medium">Chronological record of actual payments and disbursements.</p>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => setIsExpenseModalOpen(true)}
                                        className="shadow-lg shadow-brand-primary/20"
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Log New Expense
                                    </Button>
                                </div>
                                {expenses.length === 0 ? (
                                    <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl">
                                        <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-500">No live expense entries found for this project.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-gray-700 bg-brand-dark/30 shadow-2xl">
                                        <table className="min-w-full divide-y divide-gray-700">
                                            <thead className="bg-brand-dark/50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">Amount Paid</th>
                                                    <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">Variance</th>
                                                    <th className="px-6 py-4"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {expenses.map(expense => (
                                                    <tr key={expense.id} className="hover:bg-gray-700/50 transition group">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{expense.description}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(expense.expense_date).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white font-mono font-bold">{convertToDisplay(expense.amount, project.currency || 'NGN')}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${expense.variance_flag ? 'bg-red-900/30 text-red-500 border border-red-800' : 'bg-gray-800 text-gray-500'}`}>
                                                                {expense.variance_flag ? expense.variance_flag.replace(/_/g, ' ') : 'NORMAL'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => handleEditExpense(expense)} className="text-brand-primary hover:text-white transition"><Edit className="w-4 h-4" /></button>
                                                                <button onClick={() => { setSelectedExpense(expense); setIsDeleteExpenseModalOpen(true); }} className="text-gray-500 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {activeTab === 'lpos' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <Card title="Committed Costs (LPOs)" borderTopColor="secondary" className="border border-gray-700 bg-brand-dark/10">
                                <div className="flex justify-between items-center mb-6">
                                    <p className="text-sm text-gray-400 font-medium">Track legal commitments and pending payments to vendors.</p>
                                    <Button variant="secondary" size="sm" onClick={() => toast('LPO creation coming in next release.', { icon: '🚧' })}>
                                        <Plus className="w-4 h-4 mr-1" /> New LPO
                                    </Button>
                                </div>
                                {lpos.length === 0 ? (
                                    <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
                                        No LPOs recorded for this project.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-gray-700 bg-brand-dark/30 shadow-2xl">
                                        <table className="min-w-full divide-y divide-gray-700">
                                            <thead className="bg-brand-dark/50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">LPO #</th>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Vendor</th>
                                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">Committed</th>
                                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">Paid</th>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {lpos.map(lpo => (
                                                    <tr key={lpo.id} className="hover:bg-gray-700/50 transition">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-primary font-mono">{lpo.lpo_number}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lpo.vendor_name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white font-mono">{convertToDisplay(lpo.amount_committed, project.currency || 'NGN')}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-400 font-mono">{convertToDisplay(lpo.amount_paid, project.currency || 'NGN')}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2 py-1 text-[10px] font-bold rounded capitalize border ${lpo.status === 'OPEN' ? 'border-yellow-800 text-yellow-500 bg-yellow-900/10' : 'border-green-800 text-green-500 bg-green-900/10'}`}>
                                                                {lpo.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {activeTab === 'inflows' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <Card title="Revenue Ledger (Inflows)" borderTopColor="secondary" className="border border-gray-700 bg-brand-dark/10">
                                <div className="flex justify-between items-center mb-6">
                                    <p className="text-sm text-gray-400 font-medium">Record of all payments received from the client for milestones.</p>
                                    <Button variant="primary" size="sm" onClick={() => setIsInflowModalOpen(true)}>
                                        <Plus className="w-4 h-4 mr-1" /> Log Inflow
                                    </Button>
                                </div>
                                {inflowsRaw.length === 0 ? (
                                    <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
                                        No inflows recorded for this project.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-gray-700 bg-brand-dark/30 shadow-2xl">
                                        <table className="min-w-full divide-y divide-gray-700">
                                            <thead className="bg-brand-dark/50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Milestone</th>
                                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">Amount Received</th>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Recorded By</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {inflowsRaw.map(inf => (
                                                    <tr key={inf.id} className="hover:bg-gray-700/50 transition">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(inf.receipt_date).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-bold text-white">{inf.milestone_name}</div>
                                                            <div className="text-[10px] text-gray-500 lowercase">{inf.description}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-400 font-mono font-bold">{convertToDisplay(inf.amount_received, project.currency || 'NGN')}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-500">{inf.receivedBy?.email || 'System'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <Card title="Project Audit Trail" borderTopColor="primary" className="border border-gray-700 bg-brand-dark/10">
                                <p className="text-sm text-gray-400 mb-6">Tracking scope creep and significant financial adjustments.</p>
                                {audits.length === 0 ? (
                                    <div className="p-10 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
                                        No significant changes recorded yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {audits.map(audit => (
                                            <div key={audit.id} className="p-4 bg-brand-dark/50 rounded-xl border border-gray-800 flex items-start space-x-4">
                                                <div className={`p-2 rounded-lg
                                        ${audit.change_type === 'CONTRACT_VALUE_CHANGE' ? 'bg-blue-900/20 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>
                                                    <History className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-bold uppercase text-brand-secondary tracking-widest">{audit.change_type.replace(/_/g, ' ')}</span>
                                                        <span className="text-[10px] text-gray-600 font-mono">{new Date(audit.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm text-white mt-1">{audit.description}</p>
                                                    <div className="mt-2 flex items-center space-x-4">
                                                        {audit.old_value !== null && (
                                                            <div className="text-xs">
                                                                <span className="text-gray-500 mr-2">Old:</span>
                                                                <span className="text-gray-400 font-mono">{convertToDisplay(audit.old_value, project.currency || 'NGN')}</span>
                                                            </div>
                                                        )}
                                                        {audit.new_value !== null && (
                                                            <div className="text-xs">
                                                                <span className="text-gray-500 mr-2">New:</span>
                                                                <span className="text-brand-primary font-mono font-bold">{convertToDisplay(audit.new_value, project.currency || 'NGN')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 text-[10px] text-gray-600">Performed by: {audit.performedBy?.email}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}
                </div>
            </PageContainer >

            {/* Log Expense Modal */}
            <Modal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                title="Log New Project Expense"
                size="md"
                footer={
                    <div className="flex justify-end space-x-3 w-full">
                        <Button variant="secondary" onClick={() => setIsExpenseModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleLogExpense} disabled={isSubmittingExpense}>
                            {isSubmittingExpense ? 'Logging...' : 'Confirm Payment'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl mb-4">
                        <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">Budget Allocation</p>
                        <p className="text-[10px] text-gray-500 mt-1">Select the WBS node this expense should be deducted from.</p>
                    </div>

                    {project && (
                        <WBSSelect
                            projectId={project.project_id}
                            value={expenseForm.wbs_id}
                            onChange={(val) => {
                                const updated = { ...expenseForm, wbs_id: val };
                                setExpenseForm(updated);
                                autoSaveExpense(updated);
                            }}
                            label="WBS Node"
                        />
                    )}

                    <Input
                        label="Expense Description"
                        placeholder="e.g., Procurement of 5.5kVA Generator"
                        value={expenseForm.description}
                        onChange={(e) => {
                            const updated = { ...expenseForm, description: e.target.value };
                            setExpenseForm(updated);
                            autoSaveExpense(updated);
                        }}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label={`Amount (${userCurrency.code})`}
                            type="number"
                            value={expenseForm.amount}
                            onChange={(e) => {
                                const updated = { ...expenseForm, amount: parseFloat(e.target.value) };
                                setExpenseForm(updated);
                                autoSaveExpense(updated);
                            }}
                        />
                        <Input
                            label="Payment Date"
                            type="date"
                            value={expenseForm.expense_date}
                            onChange={(e) => {
                                const updated = { ...expenseForm, expense_date: e.target.value };
                                setExpenseForm(updated);
                                autoSaveExpense(updated);
                            }}
                        />
                    </div>

                    <div className="p-3 bg-yellow-900/10 border border-yellow-800/30 rounded-lg">
                        <div className="flex items-start">
                            <AlertCircle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5" />
                            <p className="text-[10px] text-yellow-200/70 leading-relaxed">
                                Validation: This entry will be checked against the specific WBS node budget. If the amount exceeds the remaining balance, a <span className="text-red-400 font-bold">MAJOR VARIANCE</span> alert will be triggered in the journal.
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Log Inflow Modal */}
            <Modal
                isOpen={isInflowModalOpen}
                onClose={() => setIsInflowModalOpen(false)}
                title="Log Project Inflow (Milestone Payment)"
                size="md"
                footer={
                    <div className="flex justify-end space-x-3 w-full">
                        <Button variant="secondary" onClick={() => setIsInflowModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleLogInflow} disabled={isSubmittingInflow}>
                            {isSubmittingInflow ? 'Logging...' : 'Confirm Receipt'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-4 bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl mb-4">
                        <p className="text-xs text-brand-secondary font-bold uppercase tracking-widest">Revenue Tracking</p>
                        <p className="text-[10px] text-gray-500 mt-1">Record payments received from the client for this project.</p>
                    </div>

                    <Input
                        label="Milestone/Payment Name"
                        placeholder="e.g., Mobilization Fee (30%)"
                        value={inflowForm.milestone_name}
                        onChange={(e) => {
                            const updated = { ...inflowForm, milestone_name: e.target.value };
                            setInflowForm(updated);
                            autoSaveInflow(updated);
                        }}
                    />

                    <Input
                        label="Description"
                        placeholder="Details of the payment or milestone achieved..."
                        value={inflowForm.description}
                        onChange={(e) => {
                            const updated = { ...inflowForm, description: e.target.value };
                            setInflowForm(updated);
                            autoSaveInflow(updated);
                        }}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label={`Amount Received (${userCurrency.code})`}
                            type="number"
                            value={inflowForm.amount_received}
                            onChange={(e) => {
                                const updated = { ...inflowForm, amount_received: parseFloat(e.target.value) };
                                setInflowForm(updated);
                                autoSaveInflow(updated);
                            }}
                        />
                        <Input
                            label="Receipt Date"
                            type="date"
                            value={inflowForm.receipt_date}
                            onChange={(e) => {
                                const updated = { ...inflowForm, receipt_date: e.target.value };
                                setInflowForm(updated);
                                autoSaveInflow(updated);
                            }}
                        />
                    </div>
                </div>
            </Modal>

            {/* Edit Expense Modal */}
            <Modal
                isOpen={isEditExpenseModalOpen}
                onClose={() => setIsEditExpenseModalOpen(false)}
                title="Correct Project Expense"
                size="md"
            >
                <div className="space-y-4 pt-4">
                    <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex gap-3">
                        <AlertCircle className="w-5 h-5 text-brand-primary shrink-0" />
                        <p className="text-xs text-brand-primary leading-tight font-medium">
                            Adjusting this amount will automatically recalibrate the associated WBS node actuals and rollout metrics across the project.
                        </p>
                    </div>
                    <Input
                        label="Corrected Amount"
                        type="number"
                        value={editExpenseAmount}
                        onChange={(e) => setEditExpenseAmount(e.target.value)}
                    />
                    <Input
                        label="Updated Description"
                        value={editExpenseDescription}
                        onChange={(e) => setEditExpenseDescription(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="secondary" onClick={() => setIsEditExpenseModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleUpdateExpenseSubmission} isLoading={isSubmittingCorrection}>Save Correction</Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Expense Modal */}
            <Modal
                isOpen={isDeleteExpenseModalOpen}
                onClose={() => setIsDeleteExpenseModalOpen(false)}
                title="Recall Project Expenditure"
            >
                <div className="space-y-4 pt-4 text-center">
                    <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Trash2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Confirm Recall?</h3>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto">
                        This will permanently remove the expense record and revert the actual spend metrics for <strong>{selectedExpense?.description}</strong>.
                    </p>
                    <div className="flex gap-2 justify-center pt-6">
                        <Button variant="secondary" onClick={() => setIsDeleteExpenseModalOpen(false)}>Cancel</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white border-none" onClick={handleDeleteExpenseFinal} isLoading={isSubmittingCorrection}>Recall Expense</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ProjectOverviewPage;