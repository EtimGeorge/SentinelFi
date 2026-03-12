import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  FileText,
  Download,
  Search,
  Loader2,
  CheckCircle,
  Clock,
  Shield,
  RefreshCw,
  ExternalLink,
  Archive
} from 'lucide-react';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Tooltip from '../../components/common/Tooltip';

interface ArchiveItem {
  id: string;
  file_name: string;
  report_type: string;
  mime_type: string;
  is_pushed_to_external_dcs: boolean;
  created_at: string;
  metadata: any;
}

const DcsArchivePage: React.FC = () => {
  const api = useSecuredApi();
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reporting/history');
      setArchives(response.data);
    } catch (error) {
      toast.error('Failed to load archive history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      toast.loading('Downloading document...', { duration: 1500 });
      const response = await api.get(`/reporting/export/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      toast.success('Download initiated');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleShare = (id: string) => {
    const link = `${window.location.origin}/reporting/export/${id}`;
    navigator.clipboard.writeText(link);
    toast.success('Document link copied to clipboard');
  };

  const filteredArchives = archives.filter(a =>
    a.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.report_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Head><title>DCS Repository | SentinelFi</title></Head>
      <PageContainer
        title="Document Control Repository"
        subtitle="Secure archival and audit trail for all generated enterprise intelligence."
        headerContent={<FileText className="w-8 h-8 text-brand-primary" />}
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Controls Sidebar */}
          <aside className="lg:w-80 shrink-0 space-y-6">
            <div className="p-6 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl sticky top-24">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Archive className="w-4 h-4" /> Archive Options
              </h3>

              <div className="space-y-6">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-brand-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Search archive..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-all font-medium"
                  />
                </div>

                <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-brand-primary">
                    <Shield className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Integrity Active</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    All documents are cryptographically hashed upon generation to ensure non-repudiation within the DCS.
                  </p>
                </div>

                <button
                  onClick={fetchArchives}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white text-xs font-bold transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Archive
                </button>
              </div>
            </div>
          </aside>

          {/* Main List Area */}
          <main className="flex-1">
            <Card className="p-0 overflow-hidden bg-slate-900/40 backdrop-blur-xl border-slate-800 rounded-3xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800/50 bg-slate-950/30">
                      <th className="px-8 py-5">Document Name</th>
                      <th className="px-8 py-5">Classification</th>
                      <th className="px-8 py-5">Generated</th>
                      <th className="px-8 py-5 text-center">DCS Sync</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-32 text-center">
                          <Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-primary opacity-20" />
                        </td>
                      </tr>
                    ) : filteredArchives.length > 0 ? (
                      filteredArchives.map((item) => (
                        <tr key={item.id} className="group hover:bg-brand-primary/5 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-slate-800 rounded-xl group-hover:bg-brand-primary/10 transition-colors">
                                <FileText className="w-5 h-5 text-brand-primary" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-white font-bold tracking-tight">{item.file_name}</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                  ID: {item.id.slice(0, 8).toUpperCase()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-slate-800 text-slate-400 text-[10px] font-black uppercase rounded-lg border border-slate-700">
                              {item.report_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-slate-300 font-medium">
                              {format(new Date(item.created_at), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold">
                              {format(new Date(item.created_at), 'HH:mm:ss')}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-center">
                              {item.is_pushed_to_external_dcs ? (
                                <Tooltip content="Verified by External DCS">
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-positive/10 text-positive rounded-full border border-positive/20">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Synced</span>
                                  </div>
                                </Tooltip>
                              ) : (
                                <Tooltip content="Pending System Batch Sync">
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 text-slate-500 rounded-full border border-slate-700">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Vaulted</span>
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Tooltip content="Download File">
                                <button
                                  onClick={() => handleDownload(item.id, item.file_name)}
                                  className="p-2.5 bg-slate-800 hover:bg-brand-primary text-slate-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-90"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              <Tooltip content="Copy Shareable Link">
                                <button
                                  onClick={() => handleShare(item.id)}
                                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-90"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-32 text-center">
                          <div className="flex flex-col items-center gap-4 text-slate-500">
                            <Archive className="w-12 h-12 opacity-10" />
                            <div className="text-sm font-black uppercase tracking-widest italic">The digital vault is empty</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </main>
        </div>
      </PageContainer>
    </>
  );
};

export default DcsArchivePage;
