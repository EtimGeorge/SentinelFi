import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useSecuredApi } from '../../../hooks/useSecuredApi';
import { PageContainer } from '../../../components/Layout/PageContainer';
import { Card } from '../../../components/common/Card';
import { formatCurrency } from '../../../lib/utils';
import {
  ArrowLeft,
  Download,
  Printer,
  Edit,
  Trash2,
  FileText, // For RFQ
  ClipboardList, // For SOW
} from 'lucide-react';
import { WbsBudgetEntity } from '../../../../shared/types/wbs';
import { LiveExpenseEntity } from '../../../../shared/types/expense';
import { ProjectEntity } from '../../../backend/src/projects/project.entity'; // Import ProjectEntity

// Interface for Project details (from /projects/:id)
interface ProjectDetail extends ProjectEntity {
  total_budgeted_rollup: number; // Aggregated from WBS budgets
  total_paid_rollup: number; // Aggregated from live expenses
}

const ProjectOverviewPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query; // This will be the project_id
  const api = useSecuredApi();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [budgets, setBudgets] = useState<WbsBudgetEntity[]>([]);
  const [expenses, setExpenses] = useState<LiveExpenseEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch project details from the new /projects/:id endpoint
      const projectResponse = await api.get<ProjectDetail>(`/projects/${id}`);
      setProject(projectResponse.data);

      // Fetch associated budgets using projectId filter
      const budgetsResponse = await api.get<{ budgets: WbsBudgetEntity[], total: number }>(`/wbs/budgets?projectId=${id}&limit=1000`);
      setBudgets(budgetsResponse.data.budgets);

      // Fetch associated expenses using projectId filter
      const expensesResponse = await api.get<{ expenses: LiveExpenseEntity[], total: number }>(`/wbs/expenses?projectId=${id}&limit=1000`);
      setExpenses(expensesResponse.data.expenses);

    } catch (e: any) {
      setError(`Failed to fetch project details: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  }, [id, api]); // Add fetchProjectData to dependencies

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]); // Now fetchProjectData is stable and passed here

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadBudgets = async () => {
    try {
      const response = await api.get(`/wbs/budgets/export?projectId=${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `project_${project?.project_name}_budgets.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      alert(`Failed to download budgets: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleDownloadExpenses = async () => {
    try {
      const response = await api.get(`/wbs/expenses/export?projectId=${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `project_${project?.project_name}_expenses.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      alert(`Failed to download expenses: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleEditBudget = (wbs_id: string) => {
    // Placeholder for opening an edit modal or navigating to an edit page
    console.log(`Edit budget: ${wbs_id}`);
    alert(`Edit functionality for budget ${wbs_id} is not yet implemented.`);
  };

  const handleDeleteBudget = async (wbs_id: string) => {
    if (window.confirm(`Are you sure you want to delete WBS Budget ID: ${wbs_id}? This action cannot be undone.`)) {
      try {
        await api.delete(`/wbs/budget-draft/${wbs_id}`); // Using budget-draft endpoint for deletion
        alert('Budget deleted successfully!');
        fetchProjectData(); // Refresh data
      } catch (e: any) {
        alert(`Failed to delete budget: ${e.response?.data?.message || e.message}`);
      }
    }
  };

  const handleEditExpense = (expense_id: number) => {
    // Placeholder for opening an edit modal or navigating to an edit page
    console.log(`Edit expense: ${expense_id}`);
    alert(`Edit functionality for expense ${expense_id} is not yet implemented.`);
  };

  const handleDeleteExpense = async (expense_id: number) => {
    if (window.confirm(`Are you sure you want to delete Live Expense ID: ${expense_id}? This action cannot be undone.`)) {
      try {
        await api.delete(`/wbs/expense/live-entry/${expense_id}`);
        alert('Expense deleted successfully!');
        fetchProjectData(); // Refresh data
      } catch (e: any) {
        alert(`Failed to delete expense: ${e.response?.data?.message || e.message}`);
      }
    }
  };
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
      <Head><title>{project.project_name} | Project Overview</title></Head>
      <PageContainer
        title={project.project_name} // Use project_name for title
        subtitle={`Status: ${project.status}`} // Use project status as subtitle
        headerContent={
          <div className="flex items-center space-x-4">
            <Link href="/projects" className="text-brand-primary hover:text-white flex items-center">
              <ArrowLeft className="w-5 h-5 mr-2" /> Back to Projects
            </Link>
            <button onClick={handlePrint} className="flex items-center text-gray-400 hover:text-white">
              <Printer className="w-5 h-5 mr-2" /> Print
            </button>
            <button onClick={handleDownloadBudgets} className="flex items-center text-gray-400 hover:text-white">
              <Download className="w-5 h-5 mr-2" /> Download Budgets (CSV)
            </button>
            <button onClick={handleDownloadExpenses} className="flex items-center text-gray-400 hover:text-white">
              <Download className="w-5 h-5 mr-2" /> Download Expenses (CSV)
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Project Details */}
          <Card title="Project Details" borderTopColor="primary" className="border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
              <div>
                <p><strong>Project Name:</strong> {project.project_name}</p>
                {project.rfq_number && <p className="flex items-center"><FileText className="w-4 h-4 mr-2" /><strong>RFQ:</strong> {project.rfq_number}</p>}
                {project.sow_details && <p className="flex items-center"><ClipboardList className="w-4 h-4 mr-2" /><strong>SOW:</strong> {project.sow_details}</p>}
                {project.notes && <p><strong>Notes:</strong> {project.notes}</p>}
              </div>
              <div>
                <p><strong>Total Budgeted:</strong> {formatCurrency(project.total_budgeted_rollup)}</p>
                <p><strong>Total Spent (approx):</strong> {formatCurrency(project.total_paid_rollup || 0)}</p>
                <p><strong>Status:</strong> {project.status}</p>
                <p><strong>Created By:</strong> {project.createdBy?.email || 'N/A'}</p>
                <p><strong>Created At:</strong> {new Date(project.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </Card>

          {/* WBS Budget Table */}
          <Card title="Associated WBS Budgets" borderTopColor="secondary" className="border border-gray-700">
            {budgets.length === 0 ? (
              <p className="text-gray-500">No WBS budget items found for this project.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-brand-dark/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">WBS Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Budgeted Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {budgets.map(budget => (
                      <tr key={budget.wbs_id} className="hover:bg-gray-700/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary">{budget.wbs_code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{budget.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">{formatCurrency(budget.total_cost_budgeted)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{budget.status}</td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => handleEditBudget(budget.wbs_id)} className="text-brand-primary hover:text-white mr-4"><Edit className="w-4 h-4 inline" /> Edit</button>
                                                    <button onClick={() => handleDeleteBudget(budget.wbs_id)} className="text-alert-critical hover:text-white"><Trash2 className="w-4 h-4 inline" /> Delete</button>
                                                  </td>
                                                </tr>
                                              ))} 
                                            </tbody>
                                          </table>
                                        </div>
                                    )}
                                  </Card>
                        
                                  {/* Live Expense Table */}
                                  <Card title="Associated Live Expenses" borderTopColor="alert" className="border border-gray-700">
                                    {expenses.length === 0 ? (
                                      <p className="text-gray-500">No live expense entries found for this project.</p>
                                    ) : (
                                      <div className="overflow-x-auto rounded-lg border border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-700">
                                          <thead className="bg-brand-dark/50">
                                            <tr>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Item Description</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Expense Date</th>
                                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Amount Paid</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Variance Flag</th>
                                              <th className="px-6 py-3">Actions</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-700">
                                            {expenses.map(expense => (
                                              <tr key={expense.expense_id} className="hover:bg-gray-700/50 transition">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary">{expense.item_description}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(expense.expense_date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">{formatCurrency(expense.actual_paid_amount)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{expense.variance_flag}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                  <button onClick={() => handleEditExpense(expense.expense_id)} className="text-brand-primary hover:text-white mr-4"><Edit className="w-4 h-4 inline" /> Edit</button>
                                                  <button onClick={() => handleDeleteExpense(expense.expense_id)} className="text-alert-critical hover:text-white"><Trash2 className="w-4 h-4 inline" /> Delete</button>
                                                </td>
                                              </tr>
                                            ))} 
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </Card>
                                </div>
                              </PageContainer>
                            </>
                          );
                        };
export default ProjectOverviewPage;
