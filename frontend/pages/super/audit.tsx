import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SuperAdminLayout from '@/components/Layout/SuperAdminLayout';
import { useAuth } from '@/components/context/AuthContext';
import { apiClient } from '@/lib/api';
import { AuditLogEntity } from '@shared/types/audit'; // Corrected import to AuditLogEntity
import { GetAuditLogsDto } from 'backend/src/audit/dto/get-audit-logs.dto'; // Import backend DTO for request params
import { toast } from 'react-hot-toast';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, RefreshCcwIcon } from 'lucide-react';

// Assuming shared/types/audit.ts
// export interface AuditLog {
//   id: string;
//   userId: string | null;
//   userEmail: string | null;
//   action: string;
//   actionType: string;
//   tenantId: string | null;
//   targetType: string | null;
//   targetId: string | null;
//   ipAddress: string | null;
//   details: Record<string, any> | null;
//   timestamp: string;
// }

const AuditLogPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState<Partial<GetAuditLogsDto>>({
    userId: '',
    action: '',
    startDate: '',
    endDate: '',
    userEmail: '',
    ipAddress: '',
  });

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: GetAuditLogsDto = {
        page: currentPage,
        limit: limit,
        ...filters,
      };
      
      const response = await apiClient.get('/admin/audit-logs', { params });
      setLogs(response.logs);
      setTotalLogs(response.total);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, filters]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= Math.ceil(totalLogs / limit)) {
      setCurrentPage(newPage);
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when limit changes
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      startDate: '',
      endDate: '',
      userEmail: '',
      ipAddress: '',
    });
    setCurrentPage(1);
  };

  const renderTableRows = useMemo(() => {
    if (loading) {
      return (
        <tr>
          <td colSpan={9} className="text-center py-4">Loading audit logs...</td>
        </tr>
      );
    }
    if (logs.length === 0) {
      return (
        <tr>
          <td colSpan={9} className="text-center py-4">No audit logs found.</td>
        </tr>
      );
    }
    return logs.map((log) => (
      <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
        <td className="p-3 text-sm text-gray-300 font-medium">{new Date(log.timestamp).toLocaleString()}</td>
        <td className="p-3 text-sm text-gray-300">{log.action}</td>
        <td className="p-3 text-sm text-gray-300">{log.userEmail || log.userId || 'N/A'}</td>
        <td className="p-3 text-sm text-gray-300">{log.tenantId || 'N/A'}</td>
        <td className="p-3 text-sm text-gray-300">{log.targetType || 'N/A'}</td>
        <td className="p-3 text-sm text-gray-300">{log.targetId || 'N/A'}</td>
        <td className="p-3 text-sm text-gray-300">{log.ipAddress || 'N/A'}</td>
        <td className="p-3 text-sm text-gray-300 max-w-xs truncate" title={JSON.stringify(log.details)}>{JSON.stringify(log.details)}</td>
      </tr>
    ));
  }, [logs, loading]);

  if (!user || !user.roles.some(role => role.name === 'SuperAdmin')) {
    return (
      <SuperAdminLayout>
        <div className="text-red-500 text-center py-10">Access Denied: You must be a SuperAdmin to view this page.</div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <h1 className="text-3xl font-bold mb-6 text-indigo-400">Audit Logs</h1>
        <p className="text-gray-400 mb-8">Review system and user activity across all tenants.</p>

        {/* Filter & Pagination Controls */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              name="userEmail"
              placeholder="Filter by User Email"
              value={filters.userEmail}
              onChange={handleFilterChange}
              className="p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
            />
            <input
              type="text"
              name="action"
              placeholder="Filter by Action"
              value={filters.action}
              onChange={handleFilterChange}
              className="p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
            />
            <input
              type="text"
              name="ipAddress"
              placeholder="Filter by IP Address"
              value={filters.ipAddress}
              onChange={handleFilterChange}
              className="p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
            />
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
            />
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
            />
            <select
              name="limit"
              value={limit}
              onChange={handleLimitChange}
              className="p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
          <div className="flex justify-end gap-4">
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <RefreshCcwIcon size={20} /> Clear Filters
            </button>
            <button
              onClick={() => setCurrentPage(1)} // Apply filters by resetting to page 1
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <SearchIcon size={20} /> Apply Filters
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-lg shadow-lg border border-gray-700">
          <table className="min-w-full bg-gray-800 divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Tenant ID</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Target Type</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Target ID</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">IP Address</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {renderTableRows}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6 p-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
          <p className="text-gray-400 text-sm">
            Showing {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, totalLogs)} of {totalLogs} logs
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <span className="text-gray-300 text-sm">Page {currentPage} of {Math.ceil(totalLogs / limit) || 1}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === Math.ceil(totalLogs / limit) || totalLogs === 0}
              className="p-2 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon size={20} />
            </button>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AuditLogPage;
