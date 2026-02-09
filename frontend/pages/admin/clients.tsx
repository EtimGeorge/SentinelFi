import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Users, Plus, Edit, Trash2, Building, Mail, Phone, MapPin, Search, Filter } from 'lucide-react';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Client[]>('/clients');
      setClients(response.data);
    } catch (e: any) {
      setError(`Failed to fetch clients: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [api]);

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
    // Client-side validation
    const trimmedName = formData.name?.trim();

    if (!trimmedName || trimmedName.length < 2) {
      alert('⚠️ Client name must be at least 2 characters long.');
      return;
    }

    if (trimmedName.length > 200) {
      alert('⚠️ Client name cannot exceed 200 characters.');
      return;
    }

    // Check for duplicates locally (fast feedback before API call)
    if (!editingClient) {
      const duplicate = clients.find(
        c => c.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (duplicate) {
        const proceed = confirm(
          `⚠️ A client named "${duplicate.name}" already exists.\n\nAre you sure you want to create another client with this name?`
        );
        if (!proceed) return;
      }
    }

    setIsSubmitting(true);

    try {
      if (editingClient) {
        const response = await api.patch(`/clients/${editingClient.id}`, formData);
        alert(`✅ Success!\n\nClient "${formData.name}" has been updated.`);
      } else {
        const response = await api.post('/clients', formData);
        alert(`✅ Success!\n\nClient "${formData.name}" has been created successfully.`);
      }

      setIsModalOpen(false);
      fetchClients();

    } catch (e: any) {
      // Enhanced error handling with specific messages
      const errorMsg = e.response?.data?.message || e.message;
      const statusCode = e.response?.status;

      if (statusCode === 409) {
        // Conflict - duplicate name
        alert(
          `❌ Duplicate Client Name\n\n${errorMsg}\n\nPlease choose a different name for this client.`
        );
      } else if (statusCode === 400) {
        // Bad request - validation error
        alert(
          `❌ Invalid Input\n\n${errorMsg}\n\nPlease check your input and try again.`
        );
      } else if (statusCode === 500) {
        // Server error
        alert(
          `❌ Server Error\n\nUnable to save client due to a server issue.\n\nPlease check your connection and try again.\n\nDetails: ${errorMsg}`
        );
      } else if (statusCode === 401 || statusCode === 403) {
        // Authentication/Authorization error
        alert(
          `❌ Access Denied\n\nYou don't have permission to perform this action.\n\nPlease contact your administrator.`
        );
      } else {
        // Generic error
        alert(
          `❌ Error\n\n${errorMsg}\n\nPlease try again or contact support if the problem persists.`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this client?')) return;
    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
    } catch (e: any) {
      alert(`Error deactivating client: ${e.message}`);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Head><title>Client Management | SentinelFi</title></Head>
      <PageContainer
        title="Client Management"
        subtitle="Manage corporate entities and project sponsors."
        headerContent={
          <Button onClick={() => handleOpenModal()} variant="primary">
            <Plus className="w-5 h-5 mr-2" /> Add Client
          </Button>
        }
      >
        <div className="mb-8 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients or industries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-brand-dark/50 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:border-brand-primary outline-none transition"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-brand-primary">Loading client data...</div>
        ) : error ? (
          <div className="text-center py-20 text-alert-critical">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => (
              <Card key={client.id} className="p-6 border border-gray-700 hover:border-brand-primary/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                    <Building className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => handleOpenModal(client)} className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="p-2 text-gray-400 hover:text-alert-critical hover:bg-alert-critical/10 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{client.name}</h3>
                <p className="text-xs text-gray-500 uppercase font-black tracking-widest mb-4 inline-block px-2 py-0.5 bg-gray-800 rounded">
                  {client.industry || 'General Industry'}
                </p>

                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-3 opacity-50" /> {client.email || 'No email set'}
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-3 opacity-50" /> {client.phone || 'No phone set'}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-3 opacity-50" /> {client.address || 'No address set'}
                  </div>
                </div>
              </Card>
            ))}

            {filteredClients.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-500 bg-brand-dark/20 rounded-2xl border border-dashed border-gray-700">
                <Building className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p>No clients found matching your search.</p>
              </div>
            )}
          </div>
        )}
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
