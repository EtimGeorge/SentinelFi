import React, { useEffect, useState } from 'react';
import MarketingLayout from '../../components/Landing/MarketingLayout';
import { useRouter } from 'next/router';
import { CheckCircle2, Clock, Loader2, ArrowRight, Download } from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';

type Status = 'pending' | 'trialing' | 'active' | 'error';

const SuccessPage: React.FC = () => {
  const router = useRouter();
  const { ref } = router.query;
  const [status, setStatus] = useState<Status>('pending');
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!ref || !router.isReady) return;

    const poll = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/billing/subscription/status?ref=${ref}`);
        if (data.status === 'active') {
          setStatus('active');
          if (data.invoiceId) setInvoiceId(data.invoiceId);
          clearInterval(poll);
        } else if (data.status === 'trialing') {
          setStatus('trialing');
          clearInterval(poll);
        }
        setAttempts((a) => a + 1);
        if (attempts >= 20) { // Timeout after ~60 seconds
          clearInterval(poll);
          setStatus('error');
        }
      } catch {
        clearInterval(poll);
        setStatus('error');
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [ref, router.isReady, attempts]);

  const handleDownloadInvoice = async () => {
    if (!invoiceId) return;
    try {
      const response = await axios.get(`/api/billing/invoices/${invoiceId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SentinelFi-Receipt-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download invoice', err);
    }
  };

  return (
    <MarketingLayout title="Payment Confirmed | SentinelFi">
      <section className="py-40 flex items-center justify-center min-h-[85vh]">
        <div className="max-w-xl text-center px-6">
          {status === 'pending' && (
            <>
              <Loader2 className="w-16 h-16 text-brand-primary animate-spin mx-auto mb-8" />
              <h1 className="text-3xl font-black font-sora text-white mb-4">Confirming Your Payment…</h1>
              <p className="text-gray-400">We're waiting for confirmation from the payment gateway. This usually takes under 30 seconds.</p>
            </>
          )}

          {(status === 'active' || status === 'trialing') && (
            <>
              <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-8" />
              <h1 className="text-4xl font-black font-sora text-white mb-4">
                {status === 'trialing' ? 'Trial Activated!' : 'Workspace Provisioned!'}
              </h1>
              <p className="text-lg text-gray-400 mb-8">
                Your sovereign SentinelFi instance is live. Check your inbox for your magic-link to access your workspace.
              </p>
              
              <div className="glass-card p-6 text-left space-y-4 mb-10 border border-white/10 bg-brand-dark/50">
                {[
                  '✅ Sovereign workspace provisioned',
                  '✅ Admin invitation dispatched to your email',
                  '✅ Check your inbox (including spam) for your magic-link',
                ].map((step) => (
                  <p key={step} className="text-sm text-gray-300 font-medium">{step}</p>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link href="/auth/accept-invitation"
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 bg-brand-primary text-white font-black rounded-xl hover:bg-brand-primary/90 transition-all font-sora text-sm uppercase tracking-widest shadow-lg shadow-brand-primary/20"
                >
                  Open Invitation <ArrowRight className="w-5 h-5" />
                </Link>
                
                {status === 'active' && invoiceId && (
                  <button 
                    onClick={handleDownloadInvoice}
                    className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all text-sm uppercase tracking-widest"
                  >
                    <Download className="w-5 h-5" /> Download PDF Receipt
                  </button>
                )}
              </div>

              {/* Brand Footer Note */}
              <div className="pt-8 border-t border-white/10 text-center">
                <p className="text-xs text-gray-500 font-mono tracking-tighter uppercase">
                  SentinelFi® is a product of Seancrystal Global Services Limited.
                </p>
                <p className="text-[10px] text-gray-600 font-mono tracking-tighter uppercase mt-2">
                  Funded by Solution Energy and Engineering Services Limited.
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-8" />
              <h1 className="text-3xl font-black font-sora text-white mb-4">Taking Longer Than Expected</h1>
              <p className="text-gray-400 mb-8">
                Payment confirmations typically arrive quickly but can occasionally take a few minutes. Your workspace will be provisioned automatically once confirmed. Check your email for the magic-link.
              </p>
              <a href="mailto:support@sentinelfi.com" className="text-brand-primary underline text-sm font-bold">
                Contact support if you don't receive access within 15 minutes.
              </a>
            </>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
};

export default SuccessPage;
