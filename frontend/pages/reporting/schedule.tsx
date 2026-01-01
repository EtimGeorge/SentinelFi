import React, { useState, useEffect } from 'react';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import { Send, Clock, SlidersHorizontal, FileDown } from 'lucide-react'; // Added SlidersHorizontal, FileDown
import { Role } from '../../components/context/AuthContext';
import useToast from '../../store/toastStore';
import { useAuth } from '../../components/context/AuthContext'; // NEW: Import useAuth

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

// DTO for the automated report request (matches backend)
interface AutomatedReportRequestDto {
    reportType: 'Variance' | 'WBS' | 'Executive';
    wbsCategory: string; // Filter by a Level 1 WBS Category
    emailRecipients: string[]; // Changed to array for clarity in DTO
    schedule: 'Daily EOD' | 'Weekly' | 'Manual';
    reportScope: ReportScope; // NEW: Report Scope
    selectedProjectId: string | null; // NEW: For individual project scope
    exportFormat: ExportFormat; // NEW: Export Format
}

const AutomatedReporting: React.FC = () => {
    const { user } = useAuth(); // NEW: Get current user for RBAC
    const api = useSecuredApi();
    const addToast = useToast(state => state.addToast);
    const [formData, setFormData] = useState<AutomatedReportRequestDto>({
        reportType: 'Variance',
        wbsCategory: '1.0',
        emailRecipients: [], // Changed to array
        schedule: 'Daily EOD',
        reportScope: ReportScope.AllProjects, // NEW: Default scope
        selectedProjectId: null, // NEW: Default selected project
        exportFormat: ExportFormat.PDF, // NEW: Default export format
    });
    const [categories, setCategories] = useState<{ code: string, description: string }[]>([]);
    const [projects, setProjects] = useState<RollupData[]>([]); // NEW: State for projects (root WBS items)
    const [loading, setLoading] = useState(false);

    const isAdminOrCEO = user?.role === Role.Admin || user?.role === Role.CEO;

    // Fetch WBS Categories and Projects for the filter dropdowns
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [categoryRes, projectRes] = await Promise.all([
                    api.get('/wbs/categories'),
                    api.get<RollupData[]>('/wbs/budget/rollup') // Fetch all rollup data to identify root projects
                ]);
                setCategories(categoryRes.data);
                setProjects(projectRes.data.filter(item => !item.parent_wbs_id)); // Filter for root projects
            } catch (e: any) {
                console.error("Failed to fetch data:", e);
                addToast({ title: 'Error', description: `Failed to fetch data: ${e.message || 'Unknown error'}`, type: 'error' });
            }
        };
        fetchData();
    }, [api, addToast]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'emailRecipients' ? value.split(',').map(email => email.trim()).filter(email => email !== '') : value,
            // Reset selected project if scope changes
            selectedProjectId: (name === 'reportScope' && value !== ReportScope.IndividualProject) ? null : prev.selectedProjectId
        }));
    };

    const validateEmails = (emails: string[]): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emails.every(email => emailRegex.test(email));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (formData.emailRecipients.length === 0) {
            addToast({ title: 'Validation Error', description: "Please enter at least one email address.", type: 'error' });
            setLoading(false);
            return;
        }

        if (!validateEmails(formData.emailRecipients)) {
          addToast({ title: 'Validation Error', description: "One or more email addresses are invalid.", type: 'error' });
          setLoading(false);
          return;
        }

        try {
            // CRITICAL: Call the DCS Integration API
            await api.post('/dcs/schedule-report', formData);
            
            addToast({ title: 'Report Scheduled', description: `Report generation successfully scheduled to run ${formData.schedule} in ${formData.exportFormat} format for ${formData.emailRecipients.length} recipients.`, type: 'success' });
        } catch (e: any) {
            const msg = e.response?.data?.message || e.message;
            addToast({ title: 'Scheduling Failed', description: `Scheduling Failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

      return (
        <>
          <Head><title>Schedule Report | SentinelFi</title></Head>            
          <PageContainer
            title="Automated Report Scheduling"
            subtitle="Configure scheduled distribution for your operational and financial reports (DCS Integration)."
            headerContent={<Clock className="w-8 h-8 text-alert-critical" />}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Scheduling Form (lg:col-span-2) */}
                <div className="lg:col-span-2">
                    <Card title="Setup Distribution Job (US-003)" borderTopColor="alert">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-3 gap-6">
                                {/* Report Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="reportType">Report Type</label>
                                    <select name="reportType" id="reportType" value={formData.reportType} onChange={handleChange} required
                                        className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
                                        <option value="Variance">Variance Report</option>
                                        <option value="WBS">WBS Cost Summary</option>
                                        <option value="Executive">Executive KPI Report</option>
                                    </select>
                                </div>
                                {/* Schedule */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="schedule">Schedule</label>
                                    <select name="schedule" id="schedule" value={formData.schedule} onChange={handleChange} required
                                        className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
                                        <option value="Daily EOD">Daily EOD</option>
                                        <option value="Weekly">Weekly (Monday AM)</option>
                                        <option value="Manual">Manual Trigger</option>
                                    </select>
                                </div>
                                {/* NEW: Export Format */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="exportFormat">Report Format</label>
                                    <select name="exportFormat" id="exportFormat" value={formData.exportFormat} onChange={handleChange} required
                                        className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
                                        <option value={ExportFormat.PDF}>PDF</option>
                                        <option value={ExportFormat.Excel}>Excel</option>
                                        <option value={ExportFormat.CSV}>CSV</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* WBS Category Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="wbsCategory">Filter by Category</label>
                                    <select name="wbsCategory" id="wbsCategory" value={formData.wbsCategory} onChange={handleChange} required
                                        className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
                                        <option value="All" className="bg-gray-800">All WBS Categories</option>
                                        {categories.map(cat => (
                                            <option key={cat.code} value={cat.code}>{cat.code} - {cat.description}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* NEW: Report Scope Filter */}
                                <div>
                                    <label htmlFor="reportScope" className="block text-sm font-medium text-gray-400 mb-1">Report Scope</label>
                                    <select name="reportScope" id="reportScope" value={formData.reportScope} onChange={handleChange} className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
                                        {/* RBAC: Admin/CEO can view All Projects */}
                                        {(isAdminOrCEO) && (
                                          <option value={ReportScope.AllProjects} className="bg-gray-800">All Projects</option>
                                        )}
                                        <option value={ReportScope.IndividualProject} className="bg-gray-800">Individual Project</option>
                                        <option value={ReportScope.WBSCategory} className="bg-gray-800">WBS Category</option>
                                    </select>
                                </div>

                                {/* NEW: Project Selector (conditionally rendered) */}
                                {formData.reportScope === ReportScope.IndividualProject && (
                                  <div>
                                    <label htmlFor="selectedProjectId" className="block text-sm font-medium text-gray-400 mb-1">Select Project</label>
                                    <select name="selectedProjectId" id="selectedProjectId" value={formData.selectedProjectId || ''} onChange={handleChange} className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white appearance-none">
                                      <option value="">-- Select a Project --</option>
                                      {projects.map(p => (
                                        <option key={p.wbs_id} value={p.wbs_id}>{p.description} ({p.wbs_code})</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                            </div>

                            {/* Recipients */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-1" htmlFor="emailRecipients">Email Recipients (Comma separated list)</label>
                                <textarea name="emailRecipients" id="emailRecipients" value={formData.emailRecipients.join(', ')} onChange={handleChange} rows={3}
                                    placeholder="user1@example.com, user2@example.com"
                                    className="block w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-lg shadow-sm text-white"></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-lg font-bold text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary/50 transition duration-150 ease-in-out disabled:opacity-50"
                            >
                                {loading ? 'Scheduling...' : <><Send className="w-5 h-5 inline mr-2" /> Schedule Report Job</>}
                            </button>
                        </form>
                    </Card>
                </div>
                
                {/* Right Column: Key Details */}
                <div className="lg:col-span-1">
                    <Card title="DCS Integration Status" borderTopColor="primary">
                        <div className="text-gray-400 space-y-3">
                            <p className="flex items-center text-alert-positive font-semibold">API Endpoint: LIVE</p>
                            <p className="text-sm">Sends secure PDF/CSV data to internal Document Control System (DCS) for external distribution.</p>
                            <p className="text-sm">Requires Finance/Ops Head role to initiate the job.</p>
                        </div>
                    </Card>
                </div>
            </div>
          </PageContainer>
        </>
    );
};

export default AutomatedReporting;