import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import useToast from '../../store/toastStore';
import { 
  ClipboardCheck, 
  Loader2, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  ChevronDown,
  ChevronRight,
  User,
  Activity
} from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { format } from 'date-fns'; // Assuming date-fns is available or use native

// --- Interfaces ---

interface AuditLog {
  id: string;
  action: string;
  userId: string | null;
  userEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  details: any; // JSON
  ipAddress: string | null;
  timestamp: string; // ISO string
  tenantId: string | null;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
}

const SuperAdminAuditLogPage: React.FC = () => {
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);

  // --- State ---
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // --- Fetching ---

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (actionFilter) params.append('action', actionFilter);
      if (userFilter) params.append('userId', userFilter); // Assumes backend accepts substring or exact ID

      const response = await api.get<AuditResponse>(`/admin/audit/logs?${params.toString()}`);
      
      // Backend might return raw entities where relations aren't flattened.
      // We'll adapt in the render if necessary.
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (e: any) {
        // Silent fail or toast? Audit logs might correspond to 403 if role issue
        const msg = e.response?.data?.message || e.message;
        addToast(`Failed to load audit logs: ${msg}`, 'error');
    } finally {
        setLoading(false);
    }
  }, [api, page, limit, actionFilter, userFilter, addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // --- Actions ---

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleExport = () => {
    // Simple CSV Export Logic
    const headers = ['Action', 'User', 'Target', 'Date', 'Details'];
    const csvContent = [
        headers.join(','),
        ...logs.map(log => [
            log.action,
            log.userEmail || log.userId,
            log.targetType || '-',
            new Date(log.timestamp).toISOString(),
            JSON.stringify(log.details || {}).replace(/,/g, ';') // Simple escape
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Head>
        <title>Audit Logs | SentinelFi SuperAdmin</title>
      </Head>

      <PageContainer
        title="Platform Audit Logs"
        subtitle="Detailed history of all system activities and security events."
        headerContent={<ClipboardCheck className="w-8 h-8 text-brand-primary/80" />}
      >
        <Card className="min-h-[600px] flex flex-col">
            
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 border-b border-gray-700/50 pb-6">
                <div className="flex-1 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input 
                            placeholder="Filter by Action (e.g. LOGIN, CREATE)" 
                            className="pl-9 w-full"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                        />
                    </div>
                     {/* Future: Date Range Picker */}
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => fetchLogs()} disabled={loading}>
                        Refresh
                    </Button>
                    <Button onClick={handleExport} disabled={logs.length === 0}>
                        <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Logs Table / List */}
            <div className="flex-1 overflow-x-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <p>No audit logs found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Header for Desktop */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-900/30 rounded-lg">
                            <div className="col-span-1"></div>
                            <div className="col-span-3">ACTION</div>
                            <div className="col-span-3">USER / TENANT</div>
                            <div className="col-span-2">TARGET</div>
                            <div className="col-span-3 text-right">TIMESTAMP</div>
                        </div>

                        {logs.map((log) => (
                            <div key={log.id} className="bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all">
                                <div 
                                    className="grid grid-cols-12 gap-4 p-4 cursor-pointer items-center"
                                    onClick={() => toggleExpand(log.id)}
                                >
                                    <div className="col-span-1 flex justify-center">
                                        {expandedRow === log.id ? <ChevronDown className="w-4 h-4 text-brand-primary" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                                    </div>
                                    <div className="col-span-11 md:col-span-3 flex items-center gap-2">
                                        <div className={`p-2 rounded-full ${
                                            getSeverityColor(log.action)
                                        }`}>
                                            <Activity className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-white">{log.action}</span>
                                    </div>
                                    <div className="col-span-12 md:col-span-3 text-sm text-gray-300 flex flex-col pl-12 md:pl-0">
                                        <span className="flex items-center"><User className="w-3 h-3 mr-1 opacity-50"/> {log.userEmail || log.userId || 'System'}</span>
                                        {log.tenantId && <span className="text-xs text-gray-500 mt-1 font-mono">Tenant: {log.tenantId.substring(0,8)}...</span>}
                                    </div>
                                    <div className="col-span-6 md:col-span-2 pl-12 md:pl-0">
                                         {log.targetType && <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">{log.targetType}</span>}
                                    </div>
                                    <div className="col-span-6 md:col-span-3 text-right text-sm text-gray-400 font-mono">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedRow === log.id && (
                                    <div className="px-4 pb-4 pl-14 md:pl-16 w-full overflow-hidden">
                                        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-x-auto">
                                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Pagination Controls */}
            {total > limit && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700/50">
                    <span className="text-sm text-gray-400">Showing {(page-1)*limit + 1} - {Math.min(page*limit, total)} of {total}</span>
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => p - 1)}
                            className="bg-transparent border border-gray-700 hover:bg-gray-800"
                        >
                            Previous
                        </Button>
                        <Button 
                            variant="secondary"
                            disabled={page * limit >= total || loading}
                            onClick={() => setPage(p => p + 1)}
                            className="bg-transparent border border-gray-700 hover:bg-gray-800"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </Card>
      </PageContainer>
    </>
  );
};

// Helper for row colors based on action type
function getSeverityColor(action: string): string {
    action = action.toUpperCase();
    if (action.includes('DELETE') || action.includes('FAILURE') || action.includes('ERROR')) return 'bg-red-500/20 text-red-400';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-yellow-500/20 text-yellow-400';
    if (action.includes('CREATE') || action.includes('SUCCESS')) return 'bg-green-500/20 text-green-400';
    return 'bg-blue-500/20 text-blue-400';
}

export default SuperAdminAuditLogPage;
