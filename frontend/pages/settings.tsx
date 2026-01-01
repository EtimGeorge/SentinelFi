import React from 'react';
import Head from 'next/head';
import { Settings, Users, Plug, Activity } from 'lucide-react'; // Added Plug and Activity icons
import Link from 'next/link';
import Card from '../components/common/Card'; // <-- New Import
import { useAuth, Role } from '../components/context/AuthContext';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    // Admin and IT Head have user management privileges
    const isAdminOrITHead = user?.role === Role.Admin || user?.role === Role.ITHead;

  return (
    <>
      <Head><title>User Settings | SentinelFi</title></Head>
      <h1 className="text-4xl font-bold text-white mb-6 flex items-center">
        <Settings className="w-8 h-8 mr-3 text-brand-secondary" /> System Settings & Administration
      </h1>
      <p className="text-lg text-gray-400 mb-8">
        Manage global user accounts, integrations, and system configurations.
      </p>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* User Management Card (For Admin/IT Head) - CRITICAL LINK */}
        {isAdminOrITHead && (
            <Link href="/admin/users" className="block">
                <Card className="hover:bg-gray-700/50 transition" borderTopColor="alert">
                    <Users className="w-8 h-8 text-alert-critical mb-3" />
                    <h2 className="text-xl font-semibold text-white">User & Role Management</h2>
                    <p className="text-sm text-gray-400 mt-1">Create, delete, and assign RBAC roles to project personnel.</p>
                </Card>
            </Link>
        )}
        
        {/* WBS Category Management (For Admin/Finance) */}
        {(user?.role === Role.Admin || user?.role === Role.Finance) && (
            <Link href="/wbs-manager" className="block">
                <Card className="hover:bg-gray-700/50 transition" borderTopColor="primary">
                    <Activity className="w-8 h-8 text-brand-primary mb-3" />
                    <h2 className="text-xl font-semibold text-white">WBS Category Manager</h2>
                    <p className="text-sm text-gray-400 mt-1">Define and modify top-level WBS headers and defaults.</p>
                </Card>
            </Link>
        )}
        
        {/* Integrations Card */}
        <Card borderTopColor="secondary">
            <Plug className="w-8 h-8 text-brand-secondary mb-3" />
            <h2 className="text-xl font-semibold text-white">DCS & API Integration</h2>
            <p className="text-sm text-gray-400 mt-1">Configure SendGrid/SMTP and ERP API keys (Phase 6).</p>
        </Card>

        {/* Audit Log Card */}
        <Card borderTopColor="positive">
            <Activity className="w-8 h-8 text-alert-positive mb-3" />
            <h2 className="text-xl font-semibold text-white">Audit Log (Immutable)</h2>
            <p className="text-sm text-gray-400 mt-1">View immutable logs of all financial transactions for compliance.</p>
        </Card>
      </div>
    </>
  );
};

export default SettingsPage;
