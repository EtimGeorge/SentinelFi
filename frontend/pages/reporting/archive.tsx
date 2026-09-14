import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  FileText, Download, Search, Shield, RefreshCw, ExternalLink, Archive
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
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
            <div className="p-6 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl elev-lg sticky top-24">
              <h3 className="text-xs font-black text-slate-500  mb-6 flex items-center gap-2">
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
                    <span className="text-xs font-black ">Integrity Active</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
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
              <DataTable
                columns={[
                  { key: 'file_name', label: 'Document Name', tier: 'P0', get: (item) => (
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-800 rounded-xl">
                        <FileText className="w-5 h-5 text-brand-primary" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-white font-bold tracking-tight">{item.file_name}</div>
                        <div className="text-xs text-slate-500 font-bold ">
                          ID: {item.id.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  )},
                  { key: 'report_type', label: 'Classification', tier: 'P1', get: (item) => (
                    <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-black uppercase rounded-lg border border-slate-700">
                      {item.report_type.replace(/_/g, ' ')}
                    </span>
                  )},
                  { key: 'created_at', label: 'Generated', tier: 'P1', get: (item) => (
                    <div>
                      <div className="text-slate-300 font-medium">
                        {format(new Date(item.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-slate-500 font-bold">
                        {format(new Date(item.created_at), 'HH:mm:ss')}
                      </div>
                    </div>
                  )},
                  { key: 'dcs_sync', label: 'DCS Sync', tier: 'P2', cellClassName: 'text-center', get: (item) => (
                    <div className="flex justify-center">
                      {item.is_pushed_to_external_dcs ? (
                        <Tooltip content="Verified by External DCS">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-positive/10 text-positive rounded-full border border-positive/20">
                            <span className="w-3.5 h-3.5 flex items-center justify-center">&#10003;</span>
                            <span className="text-xs font-black ">Synced</span>
                          </div>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Pending System Batch Sync">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 text-slate-500 rounded-full border border-slate-700">
                            <span className="w-3.5 h-3.5 flex items-center justify-center">&#9202;</span>
                            <span className="text-xs font-black ">Vaulted</span>
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  )},
                ]}
                rows={loading ? [] : filteredArchives}
                rowKey={(item) => item.id}
                emptyMessage={loading ? 'Loading archive...' : 'The digital vault is empty'}
                actions={[
                  { key: 'download', label: 'Download File', icon: <Download className="w-4 h-4" />, primary: true, onClick: (item) => handleDownload(item.id, item.file_name) },
                  { key: 'share', label: 'Copy Shareable Link', icon: <ExternalLink className="w-4 h-4" />, onClick: (item) => handleShare(item.id) },
                ]}
              />
            </Card>
          </main>
        </div>
      </PageContainer>
    </>
  );
};

export default DcsArchivePage;
