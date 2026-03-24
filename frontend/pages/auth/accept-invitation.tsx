import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  User, 
  KeyRound, 
  ArrowRight,
  UserPlus,
  Mail,
  Building2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import PublicLayout from '../../components/Layout/PublicLayout';
import { ReactElement } from 'react';

import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const AcceptInvitationPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<{
    email: string;
    tenantName: string;
    role: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    
    if (!token) {
      setError('Invalid or missing invitation token.');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const data = await apiClient.get(`/auth/invitation/verify?token=${token}`);
        setInvitationData(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'The invitation link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token, router.isReady]);

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
      await apiClient.post('/auth/invitation/accept', {
        token,
        password: formData.password,
        username: formData.username || undefined,
      });
      setSuccess(true);
      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to finalize account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark p-4">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <p className="text-gray-400 font-mono text-xs uppercase tracking-[0.3em] font-bold">Decrypting Security Token...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-xl border border-green-500/20 rounded-3xl p-10 text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Onboarding Complete</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Your identity has been verified and registered. Redirecting you to the secure terminal...
          </p>
          <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 animate-[progress_3s_ease-in-out]" style={{ width: '100%' }} />
          </div>
          <Link href="/login" className="inline-block mt-8 text-brand-primary text-xs font-black uppercase tracking-widest hover:underline">
            Go to Login Now →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark p-6">
      <div className="w-full max-w-xl">
        {/* Branding Area */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <Image src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="SentinelFi" width={180} height={45} className="mx-auto mb-4" />
          <h1 className="text-sm font-black text-gray-500 uppercase tracking-[0.4em] mb-2">Secure Invitation</h1>
          <div className="flex items-center justify-center gap-3">
             <div className="h-px w-8 bg-gray-800" />
             <ShieldCheck className="w-5 h-5 text-brand-primary" />
             <div className="h-px w-8 bg-gray-800" />
          </div>
        </div>

        {error ? (
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-8 text-center animate-in zoom-in duration-300">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-white font-bold mb-2 uppercase tracking-tight">Access Denied</h3>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <Link href="/" className="inline-block px-6 py-2 bg-gray-800 rounded-xl text-xs font-bold text-white hover:bg-gray-700 transition">
              Return to SentinelFi
            </Link>
          </div>
        ) : (
          <div className="bg-gray-800/40 backdrop-blur-2xl border border-gray-700/50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            {/* Context Header */}
            <div className="p-8 border-b border-gray-700/50 bg-gradient-to-r from-brand-primary/10 to-transparent">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 bg-gray-900 rounded-3xl flex items-center justify-center border border-brand-primary/30 shadow-inner">
                   <Building2 className="w-8 h-8 text-brand-primary/80" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white leading-tight uppercase tracking-tighter">
                    Join {invitationData?.tenantName}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Mail className="w-3 h-3 text-gray-500" />
                    <span className="text-[11px] font-mono text-gray-400">{invitationData?.email}</span>
                  </div>
                  <div className="mt-3 px-2 py-0.5 bg-brand-primary/20 rounded border border-brand-primary/30 inline-block">
                    <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest">Authority: {invitationData?.role}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Flow */}
            <form onSubmit={handleSubmit} className="p-10 space-y-8">


              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Assign Username (Optional)</label>
                <Input 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="e.g. director_alpha"
                  icon={<UserPlus className="w-5 h-5 text-gray-400" />}
                  className="bg-gray-900/50 border-gray-700"
                />
              </div>

              <div className="h-px bg-gray-800/50 my-2" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Secure Password</label>
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

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full py-4 bg-brand-primary text-brand-dark font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_25px_rgba(var(--brand-primary-rgb),0.2)]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  Finalize My Account
                </Button>
              </div>

              <p className="text-[10px] text-gray-600 text-center uppercase font-bold tracking-tight">
                By clicking finalize, you agree to follow the data sovereignty and security protocols of {invitationData?.tenantName}.
              </p>
            </form>
          </div>
        )}

        <div className="mt-12 text-center">
           <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.2em]">SentinelFi Registry Engine v8.01-Secure</p>
        </div>
      </div>
    </div>
  );
};

AcceptInvitationPage.getLayout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>;

export default AcceptInvitationPage;
