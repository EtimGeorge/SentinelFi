import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  User, 
  KeyRound, 
  ArrowRight,
  UserPlus,
  Mail,
  Zap,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import PublicLayout from '../../components/Layout/PublicLayout';
import { ReactElement } from 'react';

/**
 * SetupPage handles the final account configuration for new Tenants 
 * who have just subscribed via the public landing page.
 */
import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const SetupPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { email: queryEmail } = router.query;

  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queryEmail) {
      setEmail(queryEmail as string);
    }
  }, [queryEmail]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      // This call will create the initial CEO/Admin user for the new tenant.
      // Assuming a backend endpoint exists to handle first-time tenant setup.
      // If not, we'll need to create it. For now, hitting /auth/setup-tenant.
      await apiClient.post('/auth/setup-tenant', {
        email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        username: formData.username || undefined,
      });
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize system. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-xl border border-brand-primary/20 rounded-3xl p-10 text-center shadow-2xl">
          <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-primary/30">
            <CheckCircle2 className="w-10 h-10 text-brand-primary" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">System Ready</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Your SentinelFi instance has been successfully initialized. Redirecting you to the login terminal...
          </p>
          <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary animate-[progress_3s_ease-in-out]" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <Image src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="SentinelFi" width={180} height={45} className="mx-auto mb-4" />
          <h1 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-2">Platform Activation</h1>
          <div className="flex items-center justify-center gap-3">
             <div className="h-px w-8 bg-gray-800" />
             <Zap className="w-5 h-5 text-brand-primary animate-pulse" />
             <div className="h-px w-8 bg-gray-800" />
          </div>
        </div>

        <div className="bg-gray-800/40 backdrop-blur-2xl border border-gray-700/50 rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-gray-700/50 bg-brand-primary/5">
             <div className="flex items-center gap-4 text-brand-primary mb-4">
                <ShieldCheck className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Secure Provisioning</span>
             </div>
             <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-1">Finalize Your Infrastructure</h2>
             <p className="text-gray-500 text-xs">Establish the primary administrative identity for your organization.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Identity (Email)</label>
              <Input 
                disabled={!!queryEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="administrator@yourcompany.com"
                icon={<Mail className="w-5 h-5 text-gray-400" />}
                className="bg-gray-900/50 border-gray-700 opacity-80"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">First Name</label>
                <Input 
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  placeholder="John"
                  icon={<User className="w-5 h-5 text-gray-400" />}
                  className="bg-gray-900/50 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Last Name</label>
                <Input 
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  placeholder="Doe"
                  icon={<User className="w-5 h-5 text-gray-400" />}
                  className="bg-gray-900/50 border-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Primary Username</label>
              <Input 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="CEO_Master"
                icon={<UserPlus className="w-5 h-5 text-gray-400" />}
                className="bg-gray-900/50 border-gray-700"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Vault Password</label>
                <Input 
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  icon={<Lock className="w-5 h-5 text-gray-400" />}
                  className="bg-gray-900/50 border-gray-700"
                  rightElement={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-white mr-2">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Confirm Identity</label>
                <Input 
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="••••••••"
                  icon={<KeyRound className="w-5 h-5 text-gray-400" />}
                  className="bg-gray-900/50 border-gray-700"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-tight text-center">{error}</p>}

            <div className="pt-6">
              <Button 
                type="submit" 
                className="w-full py-4 bg-brand-primary text-brand-dark font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg shadow-brand-primary/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                INITIALIZE PLATFORM
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

SetupPage.getLayout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>;

export default SetupPage;
