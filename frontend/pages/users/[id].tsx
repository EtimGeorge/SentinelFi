import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import Card from '../../components/common/Card';
import {
  User,
  Shield,
  Mail,
  Calendar,
  ArrowLeft,
  Activity,
  UserCheck,
  Building,
  Key,
  Clock,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Role } from '@shared/types/role.enum';

interface UserActivity {
  id: string;
  action: string;
  timestamp: string;
  details: string;
}

interface UserProfile {
  id: string;
  email: string;
  roles: { id: string; name: string }[];
  tenant_id: string | null;
  tenant_name?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  activity_count: number;
  recent_activity: UserActivity[];
}

const UserProfilePage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const api = useSecuredApi();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get<UserProfile>(`/auth/users/${id}/profile`);
      setProfile(response.data);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  if (loading) return <PageContainer title="Loading Profile..."><div className="animate-pulse space-y-4"><div className="h-48 bg-gray-800 rounded-2xl" /><div className="h-64 bg-gray-800 rounded-2xl" /></div></PageContainer>;
  if (error || !profile) return <PageContainer title="Error"><div className="p-8 text-center text-red-400 bg-red-900/20 border border-red-900/50 rounded-2xl">{error || 'User not found'}</div></PageContainer>;

  return (
    <>
      <Head>
        <title>{profile.email} | User Profile | SentinelFi</title>
      </Head>
      <PageContainer
        title="User Profile Dossier"
        subtitle={`System ID: ${profile.id}`}
        headerContent={
          <Link href="/admin/users" className="flex items-center text-sm text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to User List
          </Link>
        }
      >
        <div className="space-y-6">
          {/* Profile Header Card */}
          <Card className="p-8 border-gray-700 bg-gradient-to-br from-brand-dark/50 to-gray-800/30">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-24 h-24 rounded-full bg-brand-primary/10 border-2 border-brand-primary/30 flex items-center justify-center relative">
                <User className="w-12 h-12 text-brand-primary" />
                <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-brand-dark ${profile.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>

              <div className="flex-grow text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">{profile.email}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="flex items-center text-gray-400 text-sm">
                    <Shield className="w-4 h-4 mr-2 text-brand-secondary" />
                    <span className="font-bold text-gray-200">
                      {profile.roles.map(r => r.name).join(' / ')}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Building className="w-4 h-4 mr-2 text-brand-primary" />
                    <span>{profile.tenant_name || 'System Level User'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className={`px-4 py-2 rounded-xl text-center font-black text-xs uppercase tracking-widest ${profile.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                  {profile.is_active ? 'Account Verified' : 'Account Suspended'}
                </div>
                <div className="text-[10px] text-center text-gray-500 uppercase tracking-widest font-bold">
                  Member Since: {new Date(profile.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Account Details */}
            <Card title="Security & Access" className="lg:col-span-1 border-gray-700">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <Mail className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Login Identifier</label>
                    <p className="text-sm text-gray-200">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Key className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Access Permissions</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile.roles.map(r => (
                        <span key={r.id} className="px-2 py-0.5 bg-gray-800 text-brand-primary text-[10px] font-black rounded uppercase border border-brand-primary/20">
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Clock className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Last Authentication</label>
                    <p className="text-sm text-gray-300">{profile.last_login ? new Date(profile.last_login).toLocaleString() : 'Never logged in'}</p>
                  </div>
                </div>
                {profile.tenant_id && (
                  <div className="pt-4 border-t border-gray-800">
                    <Link href={`/super/tenants`} className="flex items-center text-xs text-brand-primary hover:text-brand-primary/80">
                      View Managed Tenant <ExternalLink className="w-3 h-3 ml-2" />
                    </Link>
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card title="Platform Activity Stream" className="lg:col-span-2 border-gray-700">
              <div className="flex items-center mb-6 p-4 bg-brand-dark/50 rounded-xl border border-gray-700/50">
                <Activity className="w-5 h-5 text-brand-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold text-white leading-none">{profile.activity_count || 0}</p>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Total System Events</p>
                </div>
              </div>

              {profile.recent_activity && profile.recent_activity.length > 0 ? (
                <div className="space-y-4">
                  {profile.recent_activity.map(act => (
                    <div key={act.id} className="flex items-start gap-4 p-4 bg-gray-800/20 border border-gray-700/30 rounded-xl">
                      <div className="p-2 bg-gray-700/50 rounded-lg">
                        <UserCheck className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-gray-200">{act.action}</p>
                          <span className="text-[10px] text-gray-500 font-mono">{new Date(act.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{act.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500 italic">No recent system activity recorded for this user.</div>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default UserProfilePage;
