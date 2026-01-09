import React, { useState } from 'react';
import { useSecuredApi } from '../hooks/useSecuredApi';
import { AlertCircle, X, CheckCircle } from 'lucide-react';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantCreated: () => void;
}

const CreateTenantModal: React.FC<CreateTenantModalProps> = ({ isOpen, onClose, onTenantCreated }) => {
  const api = useSecuredApi();
  const [name, setName] = useState('');
  const [schemaName, setSchemaName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/super/tenants', {
        name,
        schema_name: schemaName,
        admin_email: adminEmail,
      });
      setSuccess('Tenant created successfully! Admin user password generated and needs to be securely communicated.');
      onTenantCreated(); // Trigger refresh in parent component
      // Optionally clear form or close modal after a delay
      setTimeout(() => {
        onClose();
        setName('');
        setSchemaName('');
        setAdminEmail('');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create tenant.');
      console.error('Create tenant error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-brand-dark border border-gray-700 rounded-lg shadow-xl max-w-lg w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">Create New Tenant</h2>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md flex items-center mb-4">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-md flex items-center mb-4">
            <CheckCircle className="w-5 h-5 mr-2" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-300 text-sm font-bold mb-2">Tenant Name</label>
            <input
              type="text"
              id="name"
              className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-white bg-gray-800 leading-tight focus:outline-none focus:shadow-outline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="schemaName" className="block text-gray-300 text-sm font-bold mb-2">Schema Name</label>
            <input
              type="text"
              id="schemaName"
              className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-white bg-gray-800 leading-tight focus:outline-none focus:shadow-outline"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Unique database schema name (e.g., &quot;client_a_prod&quot;). Max 63 characters.</p>
          </div>
          <div className="mb-6">
            <label htmlFor="adminEmail" className="block text-gray-300 text-sm font-bold mb-2">Admin User Email</label>
            <input
              type="email"
              id="adminEmail"
              className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-white bg-gray-800 leading-tight focus:outline-none focus:shadow-outline"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Email for the initial admin user of this tenant. A random password will be generated.</p>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-brand-accent hover:bg-brand-primary text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Tenant'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTenantModal;