import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuth } from '../../components/context/AuthContext';
import { apiClient } from '../../lib/api';
import { AuditLogEntity } from '@shared/types/audit'; 
import { GetAuditLogsDto } from 'backend/src/audit/dto/get-audit-logs.dto'; 
import { toast } from 'react-hot-toast';
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  ShieldAlert, 
  User, 
  Calendar,
  Filter,
  RefreshCcwIcon
} from 'lucide-react';
import { NextPageWithLayout } from '../_app';

const AuditLogPage: NextPageWithLayout = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntity[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleClearFilters = () => {
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

  return (
    <>
      <Head>
        <title>Audit Forensics | SentinelFi SuperAdmin</title>
      </Head>

      <PageContainer
        title="Audit Forensics"
        subtitle="Immutable record of system-wide administrative activity."
        headerContent={<FileText className="w-8 h-8 text-brand-primary/80" />}
      >
        <div className="space-y-6">
          
          {/* 1. Advance Filtering */}
          <Card title="Query Parameters" headerContent={<Filter className="w-5 h-5 text-gray-500" />}>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-2">
                 <Input 
                    name="userEmail" 
                    placeholder="Search Email..." 
                    value={filters.userEmail} 
                    onChange={(e) => setFilters(f => ({...f, userEmail: e.target.value}))}
                 />
                 <Input 
                    name="action" 
                    placeholder="Search Action..." 
                    value={filters.action} 
                    onChange={(e) => setFilters(f => ({...f, action: e.target.value}))}
                 />
                 <Input 
                    type="date" 
                    name="startDate" 
                    value={filters.startDate} 
                    onChange={(e) => setFilters(f => ({...f, startDate: e.target.value}))}
                 />
                 <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleClearFilters} className="w-full">Reset</Button>
                    <Button onClick={() => setCurrentPage(1)} className="w-full">Query</Button>
                 </div>
             </div>
          </Card>

          {/* 2. Log Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-brand-dark/50">
                  <tr>
                    {['Timestamp', 'User Identity', 'Action Entity', 'Infrastructure IP', ''].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loading ? (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-500"><RefreshCcwIcon className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-primary" />Analyzing system logs...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-500">No matching events found in current sequence.</td></tr>
                  ) : logs.map(log => (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-800/40 transition-colors cursor-pointer group" onClick={() => toggleExpand(log.id)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-brand-primary">
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                             <User className="w-4 h-4 mr-2 text-gray-500" />
                             <div>
                               <p className="text-sm text-white font-medium">{log.userEmail || 'System Process'}</p>
                               <p className="text-[10px] text-gray-500 font-mono">{log.userId?.split('-')[0] || '---'}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${
                            log.action.includes('FAIL') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                          {log.ipAddress || '0.0.0.0'}
                        </td>
                        <td className="px-6 py-4 text-right">
                           {expandedId === log.id ? <ChevronUp className="w-5 h-5 text-brand-primary animate-pulse" /> : <ChevronDown className="w-5 h-5 text-gray-600 group-hover:text-gray-400" />}
                        </td>
                      </tr>
                      {expandedId === log.id && (
                        <tr className="bg-gray-900/50">
                          <td colSpan={5} className="p-6 border-l-2 border-brand-primary">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center">
                                    <ShieldAlert className="w-3 h-3 mr-1" /> Resource Metadata
                                  </h4>
                                  <div className="space-y-4">
                                     <div className="flex justify-between border-b border-gray-800 pb-2">
                                        <span className="text-sm text-gray-400">Target Type</span>
                                        <span className="text-sm text-white font-mono">{log.targetType || 'N/A'}</span>
                                     </div>
                                     <div className="flex justify-between border-b border-gray-800 pb-2">
                                        <span className="text-sm text-gray-400">Target ID</span>
                                        <span className="text-xs text-brand-primary select-all">{log.targetId || 'N/A'}</span>
                                     </div>
                                     <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">Tenant Context</span>
                                        <span className="text-sm text-gray-300 font-mono">{log.tenantId || 'GLOBAL'}</span>
                                     </div>
                                  </div>
                               </div>
                               <div>
                                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center">
                                    <Download className="w-3 h-3 mr-1" /> Payload Structure
                                  </h4>
                                  <pre className="bg-brand-dark p-4 rounded-lg text-[10px] text-green-400 border border-gray-700 overflow-x-auto max-h-40 custom-scrollbar">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                               </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 bg-brand-dark/30 border-t border-gray-800 flex items-center justify-between">
               <div className="text-xs text-gray-500 font-mono uppercase">
                  Log Range: {((currentPage-1)*limit)+1} - {Math.min(currentPage*limit, totalLogs)} / {totalLogs} Events
               </div>
               <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || loading}>Previous Sequence</Button>
                  <Button variant="secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= Math.ceil(totalLogs / limit) || loading}>Next Sequence</Button>
               </div>
            </div>
          </Card>

          {/* Quick Action: Export */}
          <div className="flex justify-end">
             <Button variant="secondary" className="flex items-center" onClick={() => toast.success('CSV Export initiated...')}>
               <Download className="w-4 h-4 mr-2" /> Export Dataset (Full History)
             </Button>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default AuditLogPage;
