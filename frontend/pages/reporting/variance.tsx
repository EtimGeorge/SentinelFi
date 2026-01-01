import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { BarChart3, TrendingDown, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'; // Added Loader2
import Card from '../../components/common/Card'; // <-- New Import
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { formatCurrency, getWBSColor } from '../../lib/utils';
import { RollupData } from '../../components/dashboard/WBSHierarchyTree'; // Reusing for type
import { WbsCategoryEntity } from '../../backend/src/wbs/wbs-category.entity'; // For categories dropdown

// Enum for Variance Status
enum VarianceStatus {
  All = 'All',
  Positive = 'Positive',
  Negative = 'Negative',
  Major = 'Major', // From Phase 6 AI Rule Engine
}

// Interface for report filters
interface ReportFilters {
  startDate: string;
  endDate: string;
  wbsCategory: string;
  varianceStatus: VarianceStatus;
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
  const api = useSecuredApi();
  const [reportData, setReportData] = useState<RollupData[]>([]);
  const [categories, setCategories] = useState<WbsCategoryEntity[]>([]);
  const [majorVarianceAlerts, setMajorVarianceAlerts] = useState<LiveExpenseException[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    wbsCategory: 'All',
    varianceStatus: VarianceStatus.All,
  });
  const [error, setError] = useState<string | null>(null);


  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [reportRes, categoryRes] = await Promise.all([
            api.get<RollupData[]>('/wbs/budget/rollup', { params: { startDate: filters.startDate, endDate: filters.endDate } }), 
            api.get<WbsCategoryEntity[]>('/wbs/categories')
        ]);
        setReportData(reportRes.data);
        setCategories(categoryRes.data);
      } catch (e: any) {
        setError("Failed to fetch data: " + (e.response?.data?.message || e.message));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api, filters.startDate, filters.endDate]);

  // Fetch Major Variance Alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoadingAlerts(true);
      try {
        const response = await api.get<LiveExpenseException[]>('/wbs/expense/exceptions/major-variance');
        setMajorVarianceAlerts(response.data);
      } catch (e: any) {
        console.error("Failed to fetch major variance alerts:", e);
      } finally {
        setLoadingAlerts(false);
      }
    };
    fetchAlerts();
  }, [api]);


  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const exportReport = () => {
    alert("Secure Report Export functionality (PDF/CSV) to be implemented in Phase 7.");
  };
  
  // Filtered data for the table
  const filteredReportData = reportData.filter(item => {
    const budgeted = Number(item.total_cost_budgeted);
    const spent = Number(item.total_paid_rollup);
    const variance = budgeted - spent; // Positive means underrun, negative means overrun
    const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;
    
    // Filter by Variance Status
    if (filters.varianceStatus === VarianceStatus.Negative && variancePercent >= 0) return false; // Only show negative variance
    if (filters.varianceStatus === VarianceStatus.Positive && variancePercent <= 0) return false; // Only show positive variance
    if (filters.varianceStatus === VarianceStatus.Major) {
        // Only show items that have a major variance alert associated with their WBS code
        // This is a simplification; a full implementation would match WBS IDs
        const isMajor = majorVarianceAlerts.some(alert => alert.wbs_code.startsWith(item.wbs_code));
        if (!isMajor) return false;
    }
    
    // Filter by Category
    if (filters.wbsCategory !== 'All' && !item.wbs_code.startsWith(filters.wbsCategory)) return false;

    return true;
  });
  

  return (
    <>
      <Head><title>Variance Analysis | SentinelFi</title></Head>
      <h1 className="text-4xl font-bold text-white mb-6 flex items-center">
        <BarChart3 className="w-8 h-8 mr-3 text-brand-primary" /> Financial Variance Analysis
      </h1>
      <p className="text-lg text-gray-400 mb-8">
        Proactive monitoring and filtering of all expenditure against the approved WBS budget.
      </p>
      
      {error && <div className="p-3 mb-4 text-sm text-red-400 bg-red-900 rounded-lg border border-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column (Span 3): Filters and Report Table */}
        <div className="lg:col-span-3 space-y-8">
            <Card title="Report Filters" borderTopColor="primary">
                {/* Filter Controls */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {/* Date Filters are placeholders */}
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
                </div>
                
                <div className="text-right pt-4">
                  <button onClick={exportReport} className="px-4 py-2 bg-brand-primary text-white rounded-lg shadow-md hover:bg-brand-primary/90 transition">
                    Export Report (CSV/PDF)
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
                    <button className="w-full mt-4 py-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 transition">Investigate All Anomalies</button>
                )}
            </Card>
            <Link href="/reporting/schedule" className="block">
                <Card title="Automated Reporting" borderTopColor="primary" className="hover:bg-gray-700/50 transition">
                    <p className="text-sm text-gray-400">Setup daily/weekly reports to be automatically sent to project leads via the DCS Integration.</p>
                </Card>
            </Link>
        </div>
              </div>
          </>
        );
      };
export default VarianceReportPage;