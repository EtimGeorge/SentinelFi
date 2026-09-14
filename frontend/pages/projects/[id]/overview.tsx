import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import api from '../../../lib/api';
import PageContainer from '../../../components/Layout/PageContainer';
import {
    ArrowLeft, Layers, Briefcase, DollarSign, ShieldCheck, CreditCard, History, Zap, Check
} from 'lucide-react';
import { WbsBudget } from '@shared/types/wbs';
import { LiveExpense } from '@shared/types/expense';
import { ProjectStatus } from '@shared/types/project';
import { useBreadcrumbs } from '../../../components/context/BreadcrumbContext';
import {
    OverviewTab, BudgetTab, ExpensesTab, LpoTab, InflowsTab, HistoryTab, DossierTab, ProjectDetail, CashFlowPoint, LpoData, InflowData, AuditLog,
} from '../../../components/projects/dossier';

const COMPREHENSIVE_LIMIT = 500;

const ProjectOverviewPage: React.FC = () => {
    const router = useRouter();
    const { id } = router.query; // This will be the project_id
    const apiRef = useRef(api);
    const { setLabel } = useBreadcrumbs(); // Register breadcrumb labels

    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [budgets, setBudgets] = useState<WbsBudget[]>([]);
    const [expenses, setExpenses] = useState<LiveExpense[]>([]);
    const [cashflow, setCashflow] = useState<CashFlowPoint[]>([]);
    const [lpos, setLpos] = useState<LpoData[]>([]);
    const [inflowsRaw, setInflowsRaw] = useState<InflowData[]>([]);
    const [audits, setAudits] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<DossierTab>('overview');

    const fetchProjectData = useCallback(async (signal?: AbortSignal) => {
        if (!id) return;
        setLoading(true);
        setError(null);

        // Project identity is the hard dependency; a failure here fails the page.
        try {
            const projectResponse = await apiRef.current.get<ProjectDetail>(`/projects/${id}/rollup`, { signal });
            setProject(projectResponse.data);
        } catch (e: any) {
            if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
            setError(`Failed to fetch project details: ${e.response?.data?.message || e.message}`);
            setLoading(false);
            return;
        }

        // Secondary datasets (some finance-only) degrade independently so a single
        // 403 for a read-only role does not take down the entire dossier.
        const optional = async <T,>(path: string, setter: (v: T) => void) => {
            try {
                const res = await apiRef.current.get<T>(path, { signal });
                setter(res.data);
            } catch (e: any) {
                if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
            }
        };

        await Promise.all([
            optional<CashFlowPoint[]>(`/projects/${id}/cashflow`, setCashflow), optional<{ data: WbsBudget[]; total: number }>(`/wbs/budgets?projectId=${id}&limit=${COMPREHENSIVE_LIMIT}`, (data) => setBudgets(data.data)), optional<{ data: LiveExpense[]; total: number }>(`/wbs/expenses?projectId=${id}&limit=${COMPREHENSIVE_LIMIT}`, (data) => setExpenses(data.data)), optional<LpoData[]>(`/projects/${id}/lpos`, setLpos), optional<InflowData[]>(`/projects/${id}/inflows`, setInflowsRaw), optional<AuditLog[]>(`/projects/${id}/audits`, setAudits),
        ]);
        setLoading(false);
    }, [id]);

    useEffect(() => {
        const controller = new AbortController();
        fetchProjectData(controller.signal);
        return () => controller.abort();
    }, [fetchProjectData]);

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

    const TAB_DEFS: { tab: DossierTab; label: string; icon: React.ElementType }[] = [
        { tab: 'overview', label: 'Overview', icon: Layers },
        { tab: 'budget', label: 'Budget', icon: Briefcase },
        { tab: 'expenses', label: 'Expenses', icon: DollarSign },
        { tab: 'lpos', label: 'LPOs', icon: ShieldCheck },
        { tab: 'inflows', label: 'Inflows', icon: CreditCard },
        { tab: 'history', label: 'History', icon: History },
    ];

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
                            {TAB_DEFS.map(def => (
                                <button
                                    key={def.tab}
                                    onClick={() => setActiveTab(def.tab)}
                                    className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === def.tab ? 'bg-brand-primary text-white elev-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <def.icon className="w-4 h-4 mr-2" /> {def.label}
                                </button>
                            ))}
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
                                    <p className={`text-xs font-black  ${step.active ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
                                    <p className="text-xs text-gray-600 font-medium mt-0.5 hidden md:block">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {activeTab === 'overview' && (
                        <OverviewTab
                            project={project}
                            budgets={budgets}
                            expenses={expenses}
                            cashflow={cashflow}
                            onNavigate={setActiveTab}
                        />
                    )}

                    {activeTab === 'budget' && (
                        <BudgetTab project={project} budgets={budgets} onChanged={() => fetchProjectData()} />
                    )}

                    {activeTab === 'expenses' && (
                        <ExpensesTab project={project} expenses={expenses} onChanged={() => fetchProjectData()} />
                    )}

                    {activeTab === 'lpos' && (
                        <LpoTab project={project} lpos={lpos} onChanged={() => fetchProjectData()} />
                    )}

                    {activeTab === 'inflows' && (
                        <InflowsTab project={project} inflows={inflowsRaw} onChanged={() => fetchProjectData()} />
                    )}

                    {activeTab === 'history' && (
                        <HistoryTab project={project} audits={audits} />
                    )}
                </div>
            </PageContainer>
        </>
    );
};

export default ProjectOverviewPage;