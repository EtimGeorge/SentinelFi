import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { BarChart3, TrendingDown, TrendingUp, AlertTriangle, Loader2, FileDown, Printer, SlidersHorizontal } from 'lucide-react'; // Added Printer, SlidersHorizontal
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { formatCurrency, getWBSColor } from '../../lib/utils';
import { RollupData } from '../../components/dashboard/WBSHierarchyTree';
import { WbsCategoryEntity } from '../../backend/src/wbs/wbs-category.entity';
import useToast from '../../store/toastStore';
import PageContainer from '../../components/Layout/PageContainer';
import { useAuth, Role } from '../../components/context/AuthContext';

// Enum for Variance Status
enum VarianceStatus {
  All = 'All',
  Positive = 'Positive',
  Negative = 'Negative',
  Major = 'Major', // From Phase 6 AI Rule Engine
}

// Enum for Report Scope
enum ReportScope {
  IndividualProject = 'Individual Project',
  AllProjects = 'All Projects',
  WBSCategory = 'WBS Category',
  // Add other scopes as needed
}

// Enum for Export Format
enum ExportFormat {
  PDF = 'PDF',
  Excel = 'Excel',
  CSV = 'CSV',
}

// Interface for report filters
interface ReportFilters {
  startDate: string;
  endDate: string;
  wbsCategory: string; // Filter by a Level 1 WBS Category
  varianceStatus: VarianceStatus;
  reportScope: ReportScope; // NEW: Report Scope filter
  selectedProjectId: string | null; // NEW: For individual project scope
  exportFormat: ExportFormat; // Export format
}

// Interface for Live Expense Exceptions (assuming partial LiveExpenseEntity)
interface LiveExpenseException {
    id: string; // Assuming an ID for the expense
    wbs_code: string;
    item_description: string;
    actual_paid_amount: number;
    variance_flag: string;
    // Potentially other fields like expense_date, user_id
}

const VarianceReportPage: React.FC = () => {
  const { user } = useAuth(); // Get current user for RBAC
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);
  const [reportData, setReportData] = useState<RollupData[]>([]);
  const [categories, setCategories] = useState<WbsCategoryEntity[]>([]);
  const [projects, setProjects] = useState<RollupData[]>([]); // NEW: State for projects (root WBS items)
  const [majorVarianceAlerts, setMajorVarianceAlerts] = useState<LiveExpenseException[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false); // NEW: State for report generation loading
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    wbsCategory: 'All',
    varianceStatus: VarianceStatus.All,
    reportScope: ReportScope.AllProjects, // NEW: Default scope
    selectedProjectId: null, // NEW: Default selected project
    exportFormat: ExportFormat.PDF,
  });
  const [error, setError] = useState<string | null>(null);

  const isAdminOrCEO = user?.role === Role.Admin || user?.role === Role.CEO;

  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [reportRes, categoryRes, projectRes] = await Promise.all([ // NEW: Fetch projects too
            api.get<RollupData[]>('/wbs/budget/rollup', { params: { startDate: filters.startDate, endDate: filters.endDate } }), 
            api.get<WbsCategoryEntity[]>('/wbs/categories'),
            api.get<RollupData[]>('/wbs/budget/rollup') // Fetch all rollup data to identify root projects
        ]);
        setReportData(reportRes.data);
        setCategories(categoryRes.data);
        setProjects(projectRes.data.filter(item => !item.parent_wbs_id)); // Filter for root projects
      } catch (e: any) {
        setError("Failed to fetch data: " + (e.response?.data?.message || e.message));
        addToast({ title: 'Error', description: `Failed to fetch data: ${e.message || 'Unknown error'}`, type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api, filters.startDate, filters.endDate, addToast]);

  // Fetch Major Variance Alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoadingAlerts(true);
      try {
        const response = await api.get<LiveExpenseException[]>('/wbs/expense/exceptions/major-variance');
        setMajorVarianceAlerts(response.data);
      } catch (e: any) {
        console.error("Failed to fetch major variance alerts:", e);
        addToast({ title: 'Error', description: `Failed to fetch major variance alerts: ${e.message || 'Unknown error'}`, type: 'error' });
      } finally {
        setLoadingAlerts(false);
      }
    };
    fetchAlerts();
  }, [api, addToast]);


  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ 
      ...prev, 
      [name]: value as any, // Type assertion
      // Reset selected project if scope changes
      selectedProjectId: (name === 'reportScope' && value !== ReportScope.IndividualProject) ? null : prev.selectedProjectId
    }));
  };

  const generateReportPayload = () => {
    // Construct payload based on selected filters
    const payload = {
      reportType: filters.reportType,
      format: filters.exportFormat,
      scope: filters.reportScope,
      startDate: filters.startDate || null,
      endDate: filters.endDate || null,
      wbsCategory: filters.wbsCategory !== 'All' ? filters.wbsCategory : null,
      varianceStatus: filters.varianceStatus !== VarianceStatus.All ? filters.varianceStatus : null,
      projectId: filters.selectedProjectId, // Include selected project ID
      // Additional RBAC check to ensure user can only request reports for accessible data
      // This will primarily be handled by the backend.
    };
    return payload;
  };

  const exportReport = async () => {
    setGeneratingReport(true);
    addToast({ title: 'Report Export', description: `Generating ${filters.reportType} report in ${filters.exportFormat} format... (Backend Integration Needed)`, type: 'info' });

    try {
      const payload = generateReportPayload();
      
      // TODO: Replace with actual backend call to trigger report generation
      // For now, simulate success and download
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      // Simulate file download
      const mockBlob = new Blob(["Mock report content for " + payload.reportType], { type: "text/plain" });
      const url = URL.createObjectURL(mockBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinelfi_report_${payload.reportType}.${payload.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({ title: 'Report Ready', description: `Your ${payload.reportType} report has been generated and downloaded.`, type: 'success' });

    } catch (e: any) {
      addToast({ title: 'Export Failed', description: `Failed to generate report: ${e.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setGeneratingReport(false);
    }
  };

  const printReport = async () => {
    setGeneratingReport(true);
    addToast({ title: 'Print Report', description: `Preparing ${filters.reportType} report for printing... (Backend Integration Needed)`, type: 'info' });

    try {
      const payload = generateReportPayload();
      // TODO: Replace with actual backend call for print-friendly format
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      // Simulate print dialog (in a real app, this would be a server-generated PDF opened in a new tab for printing)
      window.open('about:blank', 'PrintWindow', 'width=800,height=600'); // Opens a blank window
      // For now, just a message
      addToast({ title: 'Print Ready', description: `Report ready for printing in a new window.`, type: 'success' });

    } catch (e: any) {
      addToast({ title: 'Print Failed', description: `Failed to prepare report for printing: ${e.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setGeneratingReport(false);
    }
  };
  
  // Filtered data for the table
  const filteredReportData = reportData.filter(item => {
    const budgeted = Number(item.total_cost_budgeted);
    const spent = Number(item.total_paid_rollup);
    const variance = budgeted - spent; // Positive means underrun, negative means overrun
    const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;
    
    // Apply filters from filters state
    if (filters.wbsCategory !== 'All' && !item.wbs_code.startsWith(filters.wbsCategory)) return false;
    
    if (filters.varianceStatus === VarianceStatus.Negative && variancePercent >= 0) return false;
    if (filters.varianceStatus === VarianceStatus.Positive && variancePercent <= 0) return false;
    if (filters.varianceStatus === VarianceStatus.Major) {
        const isMajor = majorVarianceAlerts.some(alert => alert.wbs_code.startsWith(item.wbs_code));
        if (!isMajor) return false;
    }

    // NEW: Filter by report scope and selected project
    if (filters.reportScope === ReportScope.IndividualProject && filters.selectedProjectId) {
      // Find the root WBS item for the selected project
      const selectedProjectRoot = projects.find(p => p.wbs_id === filters.selectedProjectId);
      if (selectedProjectRoot && !item.wbs_code.startsWith(selectedProjectRoot.wbs_code)) {
        return false; // Only show items under the selected project's WBS code
      } else if (!selectedProjectRoot) { // If project is selected but not found
        return false;
      }
    } else if (filters.reportScope === ReportScope.IndividualProject && !filters.selectedProjectId) {
      return false; // If scope is individual project but no project is selected
    }


    return true;
  });
  

  return (
    <>
      <Head><title>Variance Analysis | SentinelFi</title></Head>
      <PageContainer
        title="Financial Variance Analysis"
        subtitle="Proactive monitoring and filtering of all expenditure against the approved WBS budget."
        headerContent={<BarChart3 className="w-8 h-8 text-brand-primary" />}
      >
        {error && <div className="p-3 mb-4 text-sm text-red-400 bg-red-900 rounded-lg border border-red-700">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Column (Span 3): Filters and Report Table */}
          <div className="lg:col-span-3 space-y-8">
            <Card title="Report Filters" borderTopColor="primary">
                {/* Filter Controls */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {/* Date Filters */}
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
                      <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleFilterChange} className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-md text-white" />
                    </div>
                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-gray-400 mb-1">End Date</label>
                      <input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleFilterChange} className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-md text-white" />
                    </div>
                    
                    {/* WBS Category Filter */}
                    <div>
                      <label htmlFor="wbsCategory" className="block text-sm font-medium text-gray-400 mb-1">WBS Category</label>
                      <select name="wbsCategory" id="wbsCategory" value={filters.wbsCategory} onChange={handleFilterChange} className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-md text-white appearance-none">
                          <option value="All" className="bg-gray-800">All WBS Categories</option>
                          {categories.map(cat => (<option key={cat.code} value={cat.code} className="bg-gray-800">{cat.code} - {cat.description}</option>))}
                      </select>
                    </div>

                    {/* Variance Status Filter */}
                    <div>
                      <label htmlFor="varianceStatus" className="block text-sm font-medium text-gray-400 mb-1">Variance Status</label>
                      <select name="varianceStatus" id="varianceStatus" value={filters.varianceStatus} onChange={handleFilterChange} className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-md text-white appearance-none">
                          <option value={VarianceStatus.All} className="bg-gray-800">All Variances</option>
                          <option value={VarianceStatus.Positive} className="bg-gray-800">Positive Variance (Underrun)</option>
                          <option value={VarianceStatus.Negative} className="bg-gray-800">Negative Variance (Overrun)</option>
                          <option value={VarianceStatus.Major} className="bg-gray-800">Major Variance (AI Flag)</option>
                      </select>
                    </div>

                    {/* NEW: Report Scope Filter */}
                    <div>
                      <label htmlFor="reportScope" className="block text-sm font-medium text-gray-400 mb-1">Report Scope</label>
                      <select name="reportScope" id="reportScope" value={filters.reportScope} onChange={handleFilterChange} className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-md text-white appearance-none">
                          {/* RBAC: Admin/CEO can view All Projects */}
                          {(user?.role === Role.Admin || user?.role === Role.CEO) && (
                            <option value={ReportScope.AllProjects} className="bg-gray-800">All Projects</option>
                          )}
                          <option value={ReportScope.IndividualProject} className="bg-gray-800">Individual Project</option>
                          <option value={ReportScope.WBSCategory} className="bg-gray-800">WBS Category</option>
                      </select>
                    </div>

                    {/* NEW: Project Selector (conditionally rendered) */}
                    {filters.reportScope === ReportScope.IndividualProject && (
                      <div>
                        <label htmlFor="selectedProjectId" className="block text-sm font-medium text-gray-400 mb-1">Select Project</label>
                        <select name="selectedProjectId" id="selectedProjectId" value={filters.selectedProjectId || ''} onChange={handleFilterChange} className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-md text-white appearance-none">
                          <option value="">-- Select a Project --</option>
                          {projects.map(p => (
                            <option key={p.wbs_id} value={p.wbs_id}>{p.description} ({p.wbs_code})</option>
                          ))}
                        </select>
                      </div>
                    )}
                </div>
                
                <div className="text-right pt-4 flex items-center justify-end space-x-4">
                  {/* Export Format Selector */}
                  <div>
                    <label htmlFor="exportFormat" className="sr-only">Export Format</label>
                    <select name="exportFormat" id="exportFormat" value={filters.exportFormat} onChange={handleFilterChange} className="block w-full p-2 bg-brand-dark/50 border border-gray-700 rounded-md text-white appearance-none">
                        <option value="PDF">PDF</option>
                        <option value="Excel">Excel</option>
                        <option value="CSV">CSV</option>
                    </select>
                  </div>
                  <button onClick={exportReport} disabled={generatingReport} className="px-4 py-2 bg-brand-primary text-white rounded-lg shadow-md hover:bg-brand-primary/90 transition flex items-center">
                    {generatingReport ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileDown className="w-5 h-5 mr-2" />} Export Report
                  </button>
                  <button onClick={printReport} disabled={generatingReport} className="px-4 py-2 bg-brand-secondary text-white rounded-lg shadow-md hover:bg-brand-secondary/90 transition flex items-center">
                    {generatingReport ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Printer className="w-5 h-5 mr-2" />} Print Report
                  </button>
                </div>
            </Card>

            <Card title="Detailed Variance Report" borderTopColor="secondary">
                {loading ? <p className="text-center text-brand-primary flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading detailed report...</p> : (
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-brand-dark/50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">WBS Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Budgeted Cost</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actual Paid (Rollup)</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Variance</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Variance (%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredReportData.length === 0 ? (
                                    <tr><td colSpan={6} className="p-4 text-center text-gray-500">No data found for the selected filters.</td></tr>
                                ) : (
                                    filteredReportData.map((item) => {
                                        const budgeted = Number(item.total_cost_budgeted);
                                        const spent = Number(item.total_paid_rollup);
                                        const variance = budgeted - spent; // Positive means underrun, negative means overrun
                                        const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;
                                        
                                        const varianceStatusClass = variancePercent <= -10 ? 'text-red-500 font-semibold' 
                                                                : (variancePercent >= 10 ? 'text-alert-positive font-semibold' : 'text-gray-400');
                                        
                                        return (
                                            <tr key={item.wbs_id} className="hover:bg-gray-700/50 transition">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: getWBSColor(item.wbs_code) }}>{item.wbs_code}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.description}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">{formatCurrency(budgeted)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">{formatCurrency(spent)}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${varianceStatusClass}`}>{formatCurrency(variance)}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${varianceStatusClass}`}>{variancePercent.toFixed(1)}%</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>

        {/* Right Column (Span 1): AI/Anomaly Alerts */}
        <div className="lg:col-span-1 space-y-8">
            <Card title="Major Variance Alerts (AI Flag)" borderTopColor="alert" subtitle="Items flagged by the Phase 6 AI Rule Engine." className={loadingAlerts ? '' : 'animate-pulse-slow'}>
                {loadingAlerts ? (
                    <p className="p-4 text-center text-brand-primary flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading alerts...</p>
                ) : majorVarianceAlerts.length === 0 ? (
                    <p className="p-4 text-center text-gray-500">No major variance alerts at this time. All clear!</p>
                ) : (
                    majorVarianceAlerts.map(alert => (
                        <div key={alert.id} className="p-4 mb-3 bg-brand-dark rounded-lg border border-red-500/50">
                            <p className="text-red-400 font-bold flex items-center mb-1">
                                <AlertTriangle className="w-5 h-5 mr-2" /> {alert.variance_flag.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm text-gray-300">WBS: {alert.wbs_code} | Paid: {formatCurrency(alert.actual_paid_amount)}</p>
                            <p className="text-xs text-gray-500 mt-1">{alert.item_description}</p>
                        </div>
                    ))
                )}
                {majorVarianceAlerts.length > 0 && (
                    <Link href="/reporting/anomalies" className="w-full mt-4 py-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 transition flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 mr-2" /> Investigate All Anomalies
                    </Link>
                )}
            </Card>
              <Link href="/reporting/schedule" className="block">
                  <Card title="Automated Reporting" borderTopColor="primary" className="hover:bg-gray-700/50 transition">
                      <p className="text-sm text-gray-400">Setup daily/weekly reports to be automatically sent to project leads via the DCS Integration.</p>
                      <div className="text-gray-400 space-y-3 mt-4">
                          <p className="flex items-center text-alert-positive font-semibold">API Endpoint: LIVE</p>
                          <p className="text-sm">Sends secure PDF/CSV data to internal Document Control System (DCS) for external distribution.</p>
                          <p className="text-sm">Requires Finance/Ops Head role to initiate the job.</p>
                      </div>
                  </Card>
              </Link>
        </div>
              </div>
          </>
        );
      };
export default VarianceReportPage;