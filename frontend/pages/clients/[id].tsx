import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import Card from '../../components/common/Card';
import {
  Building,
  Briefcase,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Activity,
  ChevronRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '../../components/context/CurrencyContext';

interface ClientProject {
  project_id: string;
  project_name: string;
  status: string;
  total_budget: string;
  actual_spent: string;
}

interface ClientDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  industry: string;
  address: string;
  is_active: boolean;
  created_at: string;
  projects: ClientProject[];
  total_value: number;
}

const ClientOverviewPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const api = useSecuredApi();
  const { convertToDisplay } = useCurrency();

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch core client data
      const response = await api.get<ClientDetails>(`/clients/${id}`);
      setClient(response.data);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useEffect(() => {
    fetchClientDetails();
  }, [fetchClientDetails]);

  if (loading) return <PageContainer title="Loading Client..."><div className="animate-pulse space-y-4"><div className="h-32 bg-gray-800 rounded-2xl" /><div className="h-64 bg-gray-800 rounded-2xl" /></div></PageContainer>;
  if (error || !client) return <PageContainer title="Error"><div className="p-8 text-center text-red-400 bg-red-900/20 border border-red-900/50 rounded-2xl">{error || 'Client not found'}</div></PageContainer>;

  return (
    <>
      <Head>
        <title>{client.name} | Client Dossier | SentinelFi</title>
      </Head>
      <PageContainer
        title={client.name}
        subtitle={`Established: ${new Date(client.created_at).toLocaleDateString()}`}
        headerContent={
          <Link href="/admin/clients" className="flex items-center text-sm text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
          </Link>
        }
      >
        <div className="space-y-6">
          {/* Header Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-brand-dark/30 border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-brand-primary/10 rounded-xl">
                  <Briefcase className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Active Projects</p>
                  <p className="text-2xl font-bold text-white">{client.projects?.length || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-brand-dark/30 border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-brand-secondary/10 rounded-xl">
                  <DollarSign className="w-6 h-6 text-brand-secondary" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Total Lifecycle Value</p>
                  <p className="text-2xl font-bold text-white">{convertToDisplay(client.total_value || 0)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-brand-dark/30 border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Client Status</p>
                  <p className={`text-xl font-bold uppercase tracking-tighter ${client.is_active ? 'text-green-400' : 'text-red-400'}`}>
                    {client.is_active ? 'Prime / Active' : 'Suspended'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Information */}
            <Card title="Corporate Profile" className="lg:col-span-1 border-gray-700">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <Building className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Industry Classification</label>
                    <p className="text-sm text-gray-200 font-bold">{client.industry || 'General Services'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Mail className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Primary Contact Email</label>
                    <p className="text-sm text-gray-200">{client.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Phone className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact Phone</label>
                    <p className="text-sm text-gray-200">{client.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Headquarters</label>
                    <p className="text-sm text-gray-300 leading-relaxed">{client.address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Project Portfolio */}
            <Card title="Project Portfolio" className="lg:col-span-2 border-gray-700">
              {client.projects && client.projects.length > 0 ? (
                <div className="space-y-4">
                  {client.projects.map(project => (
                    <Link
                      key={project.project_id}
                      href={`/projects/${project.project_id}/overview`}
                      className="flex items-center justify-between p-4 bg-gray-800/40 border border-gray-700/50 rounded-xl hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all group"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
                          <Activity className="w-5 h-5 text-gray-400 group-hover:text-brand-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-200">{project.project_name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 px-1.5 py-0.5 rounded border border-gray-700">{project.status}</span>
                            <span className="text-[10px] text-gray-600 flex items-center"><Clock className="w-3 h-3 mr-1" /> Last Active: Recent</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-black text-gray-100">{convertToDisplay(parseFloat(project.total_budget))}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Budget Allocation</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-brand-primary transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500 italic">No projects recorded for this client.</div>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ClientOverviewPage;
