import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth, Role } from '../../components/context/AuthContext';
import { AuditLogEntity } from '@shared/types/audit';
import useToast from '../../store/toastStore';
import { Users, Plus, X, Edit3, Save, Loader2, AlertTriangle, Trash2, Search, Calendar, Filter, Building } from 'lucide-react'; // Added Building icon

const ITEMS_PER_PAGE = 10;

const AuditLogPage: React.FC = () => {
  const { user, isInitialLoad, hasAnyRole } = useAuth();
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);

  // Filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [userSearchTerm, setUserSearchTerm] = useState(''); // For user email or ID
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tenantIdFilter, setTenantIdFilter] = useState(''); // For SuperAdmins/ITHeads

  // Fetch unique action types and target types for dropdowns (Advanced Feature)
  const [uniqueActionTypes, setUniqueActionTypes] = useState<string[]>([]);
  const [uniqueTargetTypes, setUniqueTargetTypes] = useState<string[]>([]);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        userId: userSearchTerm, // Backend will search by user ID or email based on this
        action: actionTypeFilter,
        targetType: targetTypeFilter,
        startDate: startDate,
        endDate: endDate,
        tenantId: hasAnyRole(['SuperAdmin', Role.ITHead]) && tenantIdFilter ? tenantIdFilter : undefined, // SuperAdmin/ITHead can filter, otherwise undefined means no filter by query param
      };

      // If user is Admin, they can only see their own tenant's logs
      if (hasAnyRole([Role.Admin]) && user?.tenantId) {
        params.tenantId = user.tenantId;
      } else if (hasAnyRole([Role.Admin]) && !user?.tenantId) {
        // Admin user without tenantId should not see any logs
        setAuditLogs([]);
        setTotalLogs(0);
        setLoading(false);
        return;
      }


      const response = await api.get<{ logs: AuditLogEntity[]; total: number }>('/admin/audit/logs', { params });
      setAuditLogs(response.data.logs);
      setTotalLogs(response.data.total);

      // Extract unique action types and target types for filters from *all* fetched logs (not just current page)
      // This is a simplified approach; ideally, these unique values would come from a dedicated backend endpoint.
      const allActionTypes = Array.from(new Set(response.data.logs.map(log => log.action)));
      const allTargetTypes = Array.from(new Set(response.data.logs.map(log => log.targetType).filter(Boolean))) as string[];
      setUniqueActionTypes(allActionTypes.sort());
      setUniqueTargetTypes(allTargetTypes.sort());

    } catch (e: any) {
      addToast(`Failed to fetch audit logs: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast, currentPage, userSearchTerm, actionTypeFilter, targetTypeFilter, startDate, endDate, tenantIdFilter, user, hasAnyRole]); // Added hasAnyRole to dep array

  useEffect(() => {
    // Only fetch if user is authenticated and has appropriate roles
    if (!isInitialLoad && (hasAnyRole([Role.Admin, 'SuperAdmin', Role.ITHead]))) {
      fetchAuditLogs();
    }
  }, [user, isInitialLoad, fetchAuditLogs, hasAnyRole]); // Added hasAnyRole to dep array

  const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-xl animate-pulse">Initializing SentinelFi Session...</div>
      </div>
    );
  }

  // Access Control: Only Admin, SuperAdmin, ITHead can access
  if (!user || !(hasAnyRole([Role.Admin, 'SuperAdmin', Role.ITHead]))) {
    return (
      <PageContainer title="Access Denied" subtitle="Unauthorized Access">
        <p className="text-alert-critical flex items-center p-4 bg-red-900/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 mr-2" />
          You do not have permission to access this page.
        </p>
      </PageContainer>
    );
  }

  const isSuperAdminOrITHead = hasAnyRole(['SuperAdmin', Role.ITHead]);

  return (
    <>
      <Head>
        <title>Audit Log | SentinelFi</title>
      </Head>
      <PageContainer
        title="Admin Audit Log"
        subtitle="Review system activities and user actions."
        headerContent={<Filter className="w-8 h-8 text-brand-primary/80" />}
      >
        <Card>
          <div className="p-4 border-b border-gray-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex-grow flex flex-wrap items-center gap-4">
                  <Input 
                      type="text"
                      placeholder="User ID or Email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full sm:w-64"
                      icon={<Search className="w-5 h-5 text-gray-400" />}
                      label="User"
                  />
                  <select
                      value={actionTypeFilter}
                      onChange={(e) => setActionTypeFilter(e.target.value)}
                      className="p-2 bg-brand-dark/50 border border-gray-600 rounded-lg text-white appearance-none focus:ring-brand-primary focus:border-brand-primary"
                  >
                      <option value="">All Actions</option>
                      {uniqueActionTypes.map(action => <option key={action} value={action}>{action}</option>)}
                  </select>
                  <select
                      value={targetTypeFilter}
                      onChange={(e) => setTargetTypeFilter(e.target.value)}
                      className="p-2 bg-brand-dark/50 border border-gray-600 rounded-lg text-white appearance-none focus:ring-brand-primary focus:border-brand-primary"
                  >
                      <option value="">All Target Types</option>
                      {uniqueTargetTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                  {isSuperAdminOrITHead && (
                     <Input 
                         type="text"
                         placeholder="Filter by Tenant ID"
                         value={tenantIdFilter}
                         onChange={(e) => setTenantIdFilter(e.target.value)}
                         className="w-full sm:w-64"
                         icon={<Building className="w-5 h-5 text-gray-400" />}
                         label="Tenant ID"
                     />
                  )}
                  <Input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full sm:w-auto"
                      icon={<Calendar className="w-5 h-5 text-gray-400" />}
                      label="Start Date"
                  />
                  <Input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full sm:w-auto"
                      icon={<Calendar className="w-5 h-5 text-gray-400" />}
                      label="End Date"
                  />
                  <Button onClick={() => setCurrentPage(1)} disabled={loading}>Apply Filters</Button>
                  <Button onClick={() => { setUserSearchTerm(''); setActionTypeFilter(''); setTargetTypeFilter(''); setStartDate(''); setEndDate(''); setTenantIdFilter(''); setCurrentPage(1); }} variant="secondary" disabled={loading}>Reset</Button>
              </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-brand-dark/50">
                <tr>
                  {['Timestamp', 'User', 'Action', 'Target Type', 'Target ID', 'Tenant ID', 'Details'].map(header => (
                     <th key={header} className={`px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider`}>
                       {header}
                     </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  <tr><td colSpan={7} className="p-4 text-center text-gray-400"><div className="flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading audit logs...</div></td></tr>
                ) : auditLogs.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">No audit logs found matching your criteria.</td></tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{log.userEmail || log.userId || 'System'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{log.action}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{log.targetType || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{log.targetId || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{log.tenantId || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        <pre className="whitespace-pre-wrap break-all text-xs bg-gray-700 p-2 rounded max-h-24 overflow-y-auto">{log.details ? JSON.stringify(log.details, null, 2) : 'N/A'}</pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
              <div className="p-4 border-t border-gray-700 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
                  <div className="space-x-2">
                      <Button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || loading} variant="secondary">Previous</Button>
                      <Button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages || loading} variant="secondary">Next</Button>
                  </div>
              </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default AuditLogPage;
