import React, { useState, useEffect } from 'react';
import SecuredLayout from '../../components/Layout/SecuredLayout';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import Head from 'next/head';
import { RollupData } from '../../components/dashboard/WBSHierarchyTree'; // Reusing the same data structure for WBS context
import { formatCurrency, getWBSColor } from '../../lib/utils';
import Tooltip from '../../components/common/Tooltip';

// Mock data for reporting purposes, to be replaced by API call
const mockReportData: RollupData[] = [
  // Placeholder data that matches the RollupData structure
  { wbs_id: 'abc', parent_wbs_id: null, wbs_code: '1.0', description: 'Project Management', total_cost_budgeted: '500000', total_paid_rollup: '550000', total_paid_self: '10000' },
  { wbs_id: 'def', parent_wbs_id: 'abc', wbs_code: '1.1', description: 'Team Salaries', total_cost_budgeted: '200000', total_paid_rollup: '220000', total_paid_self: '220000' },
  { wbs_id: 'ghi', parent_wbs_id: 'def', wbs_code: '1.1.1', description: 'Lead Developer Salary', total_cost_budgeted: '100000', total_paid_rollup: '110000', total_paid_self: '110000' },
  { wbs_id: 'jkl', parent_wbs_id: null, wbs_code: '2.0', description: 'Infrastructure', total_cost_budgeted: '300000', total_paid_rollup: '280000', total_paid_self: '280000' },
  { wbs_id: 'mno', parent_wbs_id: 'jkl', wbs_code: '2.1', description: 'Cloud Hosting', total_cost_budgeted: '150000', total_paid_rollup: '140000', total_paid_self: '140000' },
];

// Enum for Variance Status
enum VarianceStatus {
  All = 'All',
  Positive = 'Positive',
  Negative = 'Negative',
  Major = 'Major',
}

// Interface for report filters
interface ReportFilters {
  startDate: string;
  endDate: string;
  wbsCategory: string;
  varianceStatus: VarianceStatus;
}

const VarianceReportPage: React.FC = () => {
  const api = useSecuredApi();
  const [reportData, setReportData] = useState<RollupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    wbsCategory: 'All',
    varianceStatus: VarianceStatus.All,
  });

  // Fetch data based on filters (will be implemented in Phase 4, Step 3)
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        // In a real app, this would call the backend API with filters:
        // const response = await api.get('/reporting/variance', { params: filters });
        // setReportData(response.data);
        
        // For now, using mock data for structure visualization
        setReportData(mockReportData); 
      } catch (error) {
        console.error("Failed to fetch variance report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [api, filters]); // Re-fetch when filters change

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Placeholder for export functionality
  const exportReport = () => {
    alert("Export functionality not yet implemented. (Phase 4, Step 3)");
  };

  return (
    <SecuredLayout>
      <Head><title>Variance Report | SentinelFi</title></Head>
      <h1 className="text-3xl font-extrabold text-brand-dark mb-8">Financial Variance Report</h1>
      
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-brand-primary">
        <h2 className="text-xl font-semibold text-brand-dark mb-6">Filter Options</h2>
        
        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
            <input 
              type="date" 
              name="startDate" 
              id="startDate" 
              value={filters.startDate} 
              onChange={handleFilterChange} 
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-primary focus:ring-brand-primary/50"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
            <input 
              type="date" 
              name="endDate" 
              id="endDate" 
              value={filters.endDate} 
              onChange={handleFilterChange} 
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-primary focus:ring-brand-primary/50"
            />
          </div>

          <div>
            <label htmlFor="wbsCategory" className="block text-sm font-medium text-gray-700">WBS Category</label>
            <select name="wbsCategory" id="wbsCategory" value={filters.wbsCategory} onChange={handleFilterChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-brand-dark focus:border-brand-primary focus:ring-brand-primary/50">
              <option value="All">All WBS Categories</option>
              {/* These would dynamically come from fetched WBS data */}
              <option value="1.0">1.0 - Project Management</option>
              <option value="2.0">2.0 - Infrastructure</option>
            </select>
          </div>

          <div>
            <label htmlFor="varianceStatus" className="block text-sm font-medium text-gray-700">Variance Status</label>
            <select name="varianceStatus" id="varianceStatus" value={filters.varianceStatus} onChange={handleFilterChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-brand-dark focus:border-brand-primary focus:ring-brand-primary/50">
              <option value={VarianceStatus.All}>All Variances</option>
              <option value={VarianceStatus.Positive}>Positive Variance</option>
              <option value={VarianceStatus.Negative}>Negative Variance</option>
              <option value={VarianceStatus.Major}>Major Variance</option>
            </select>
          </div>
        </div>

        {/* Export Button */}
        <div className="text-right mb-6">
          <button 
            onClick={exportReport}
            className="px-4 py-2 bg-brand-primary text-white rounded-md shadow-sm hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary/50 transition duration-150"
          >
            Export Report (CSV/PDF)
          </button>
        </div>
        
        {/* Reporting Data Table */}
        {loading ? (
          <p className="text-center text-brand-primary">Loading Report Data...</p>
        ) : reportData.length === 0 ? (
          <p className="text-center text-gray-500">No data found for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 rounded-lg shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WBS Code</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Budgeted Cost</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Paid (Rollup)</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((item) => {
                  const budgeted = Number(item.total_cost_budgeted);
                  const spent = Number(item.total_paid_rollup);
                  const variance = budgeted - spent;
                  const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;
                  
                  const varianceStatusClass = variancePercent <= -10 ? 'text-alert-critical font-semibold' 
                                          : (variancePercent > 0 ? 'text-alert-positive font-semibold' : 'text-brand-charcoal');
                  
                  return (
                    <tr key={item.wbs_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: getWBSColor(item.wbs_code) }}>{item.wbs_code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-dark">
                        <Tooltip content={item.description}>{item.description}</Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-brand-dark font-medium">{formatCurrency(budgeted)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-brand-dark font-medium">{formatCurrency(spent)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${varianceStatusClass}`}>{formatCurrency(variance)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${varianceStatusClass}`}>{variancePercent.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SecuredLayout>
  );
};

export default VarianceReportPage;
