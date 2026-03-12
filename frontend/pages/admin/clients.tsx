import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Users, Plus, Edit, Trash2, Building, Mail, Phone, MapPin, Search, Filter, Activity, Zap, ShieldCheck } from 'lucide-react';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import useToast from '../../store/toastStore';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  industry: string;
  address: string;
  is_active: boolean;
}

const ClientsPage: React.FC = () => {
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    industry: '',
    address: '',
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Client[]>('/clients');
      setClients(response.data);
    } catch (e: any) {
      addToast(`Retrieval Failure: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        industry: client.industry || '',
        address: client.address || '',
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        industry: '',
        address: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) return;
    setIsSubmitting(true);
    try {
      if (editingClient) {
        await api.patch(`/clients/${editingClient.id}`, formData);
        addToast(`Client registry updated for ${formData.name}`, 'success');
      } else {
        await api.post('/clients', formData);
        addToast(`New client ${formData.name} successfully enrolled`, 'success');
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (e: any) {
      addToast(`Registry Update Conflict: ${e.response?.data?.message || e.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirm Identity Purge: Are you sure you want to deactivate this client?')) return;
    try {
      await api.delete(`/clients/${id}`);
      addToast('Client identity deactivated.', 'success');
      fetchClients();
    } catch (e: any) {
      addToast(`Purge Failure: ${e.message}`, 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedClients(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Total Portfolio', value: clients.length.toString(), icon: Building, color: 'text-brand-primary' },
    { label: 'Active Pipeline', value: clients.filter(c => c.is_active).length.toString(), icon: Activity, color: 'text-green-400' },
    { label: 'Strategic Nodes', value: clients.filter(c => c.industry === 'Oil & Gas').length.toString(), icon: ShieldCheck, color: 'text-blue-400' },
    { label: 'Growth Velocity', value: '+14%', icon: Zap, color: 'text-purple-400' }
  ];

  return (
    <>
      <Head><title>Client Portfolio Management | SentinelFi</title></Head>
      <PageContainer
        title="Client Portfolio"
        subtitle="Manage corporate entities, strategic sponsors, and external nodes."
        headerContent={
          <div className="flex items-center gap-3">
             <button onClick={() => fetchClients()} className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition group">
                <Activity className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <button onClick={() => handleOpenModal()} className="px-6 py-3 bg-brand-primary text-brand-dark rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition active:scale-95 flex items-center gap-2 shadow-lg shadow-brand-primary/20">
                <Plus className="w-5 h-5" />
                Enroll Client
             </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Elite Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {stats.map((stat, i) => (
                <Card key={i} className="border-l-4 border-l-brand-primary/30 group hover:border-l-brand-primary transition-all duration-300">
                   <div className="flex items-center">
                      <div className="p-4 rounded-2xl bg-gray-800/50 mr-4 group-hover:scale-110 transition-transform duration-500">
                         <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
                         <p className="text-2xl font-black text-white mt-0.5 tracking-tight group-hover:text-brand-primary transition-colors">{stat.value}</p>
                      </div>
                   </div>
                </Card>
             ))}
          </div>

          {/* Operational Toolbar */}
          <Card className="p-2 border border-white/5 bg-brand-dark/40 backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2">
              <div className="flex items-center flex-1 max-w-xl bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-1 focus-within:border-brand-primary/50 transition shadow-inner">
                <Search className="w-4 h-4 text-gray-500 mr-3" />
                <input
                  type="text"
                  placeholder="Infiltrate registry: Search names, industries, or identifiers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none py-2.5 text-sm text-gray-200 focus:ring-0 outline-none placeholder:text-gray-600 font-medium"
                />
              </div>
              <div className="flex items-center gap-3">
                  {selectedClients.length > 0 && (
                    <button className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition animate-in zoom-in-95">
                      Batch Deactivate ({selectedClients.length})
                    </button>
                  )}
                  <button className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition">
                    <Filter className="w-5 h-5" />
                  </button>
              </div>
            </div>
          </Card>

          {/* Client Registry Table */}
          <Card className="overflow-hidden border border-white/5 shadow-2xl">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-dark/80 border-b border-gray-800">
                    <th className="px-6 py-4 w-12">
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-brand-primary focus:ring-brand-primary/20" 
                          onChange={(e) => setSelectedClients(e.target.checked ? filteredClients.map(c => c.id) : [])}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Client Identity</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Sector</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact Intel</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right sticky right-0 bg-brand-dark z-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                         <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-gray-800/50 rounded-full w-full" /></td>
                      </tr>
                    ))
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <Building className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No entries found in registry</p>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr key={client.id} className="group hover:bg-brand-primary/5 transition-all duration-200">
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedClients.includes(client.id)}
                            onChange={() => toggleSelect(client.id)}
                            className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-brand-primary focus:ring-brand-primary/20" 
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-brand-primary font-bold group-hover:bg-brand-primary group-hover:text-brand-dark transition-all duration-300">
                                {client.name.charAt(0)}
                             </div>
                             <div>
                                <p className="text-sm font-black text-white group-hover:text-brand-primary transition-colors">{client.name}</p>
                                <p className="text-[10px] text-gray-500 font-mono tracking-tighter">{client.id.split('-')[0]}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="px-2 py-1 bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black tracking-widest uppercase border border-white/5">
                              {client.industry || 'General'}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="space-y-1">
                              <div className="flex items-center text-xs text-gray-400">
                                 <Mail className="w-3 h-3 mr-2 opacity-30" /> {client.email}
                              </div>
                              <div className="flex items-center text-xs text-gray-400">
                                 <Phone className="w-3 h-3 mr-2 opacity-30" /> {client.phone}
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${client.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-600'}`} />
                             <span className={`text-[10px] font-black uppercase tracking-widest ${client.is_active ? 'text-green-500' : 'text-gray-500'}`}>
                                {client.is_active ? 'Operational' : 'Archived'}
                             </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right sticky right-0 bg-brand-dark/95 group-hover:bg-brand-primary/10 transition-colors z-10 backdrop-blur-md shadow-[-10px_0_15px_rgba(0,0,0,0.5)]">
                          <div className="flex items-center justify-end space-x-1">
                             <Link href={`/clients/${client.id}`} className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition">
                                <Activity className="w-4 h-4" />
                             </Link>
                             <button onClick={() => handleOpenModal(client)} className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition">
                                <Edit className="w-4 h-4" />
                             </button>
                             <button onClick={() => handleDelete(client.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-brand-dark/40 border-t border-gray-800 flex items-center justify-between">
                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Portfolio Agent v4.1.0-STABLE</span>
            </div>
          </Card>
        </div>
      </PageContainer>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Edit Client' : 'Add New Client'}
        footer={
          <div className="flex justify-end space-x-3 w-full">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting || !formData.name}>
              {isSubmitting ? 'Saving...' : 'Save Client'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Client Name"
            required
            placeholder="e.g., Global Energy Corp"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Industry"
            placeholder="e.g., Oil & Gas"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="client@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Phone Number"
            placeholder="+234..."
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <div className="md:col-span-2">
            <Input
              label="Physical Address"
              placeholder="Full office address..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ClientsPage;
