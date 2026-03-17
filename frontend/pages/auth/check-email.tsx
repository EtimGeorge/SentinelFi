import React from 'react';
import MarketingLayout from '../../components/Landing/MarketingLayout';
import { useRouter } from 'next/router';
import { Mail, RefreshCw, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const CheckEmailPage: React.FC = () => {
  const router = useRouter();
  const isTrial = router.query.reason === 'trial';

  return (
    <MarketingLayout title="Check Your Email | SentinelFi">
      <section className="py-40 flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          {/* Animated envelope */}
          <div className="relative mx-auto w-24 h-24 mb-10">
            <div className="w-24 h-24 bg-brand-primary/10 border border-brand-primary/30 rounded-3xl flex items-center justify-center">
              <Mail className="w-12 h-12 text-brand-primary" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-white text-xs font-black">1</span>
            </div>
          </div>

          <h1 className="text-4xl font-black font-sora text-white mb-4">Check Your Inbox</h1>

          <p className="text-gray-400 mb-3 leading-relaxed">
            {isTrial
              ? 'Your free trial has been activated. We\'ve dispatched a magic-link invitation to your email address.'
              : 'Payment received. Your workspace is being provisioned and a magic-link invitation will arrive in your inbox shortly.'}
          </p>

          <p className="text-sm text-gray-500 mb-10">
            The email comes from <span className="text-brand-primary">noreply@sentinelfi.com</span>. Check your spam folder if you don't see it within 2 minutes.
          </p>

          <div className="glass-card p-6 text-left space-y-3 mb-10">
            {[
              { step: '1', text: 'Open the email from SentinelFi' },
              { step: '2', text: 'Click "Accept Invitation" to claim your workspace' },
              { step: '3', text: 'Set your password and complete your profile' },
              { step: '4', text: 'You\'re in — your sovereign instance is ready' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-brand-primary/20 border border-brand-primary/30 rounded-full flex items-center justify-center text-brand-primary font-black text-xs shrink-0">
                  {step}
                </div>
                <p className="text-sm text-gray-300">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/accept-invitation"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-brand-primary/90 transition-all font-sora"
            >
              I Have My Link <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:support@sentinelfi.com"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-gray-300 font-black rounded-xl text-sm uppercase tracking-widest hover:border-white/20 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Resend Help
            </a>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default CheckEmailPage;
