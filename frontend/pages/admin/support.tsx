import React, { useState } from 'react';
import Head from 'next/head';
import PageContainer from '../../components/Layout/PageContainer';
import { 
  LifeBuoy, 
  MessageCircle, 
  FileText, 
  ExternalLink, 
  Zap, 
  ShieldCheck, 
  Send,
  Loader2,
  ArrowRight,
  Headphones
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import useToast from '../../store/toastStore';

const SupportHub: React.FC = () => {
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('Infrastructure & Scaling');
  const [success, setSuccess] = useState(false);

  const handlePrioritySupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || submitting) return;
    
    setSubmitting(true);
    try {
      await api.post('/messaging/support', {
        subject,
        description: message
      });
      addToast('Priority support request dispatched to the Landlord team.', 'success');
      setSuccess(true);
      setMessage('');
    } catch (error) {
      console.error('Support dispatch failure:', error);
      addToast('Critical: Failed to dispatch priority support request. Please verify network connectivity.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Landlord Support Hub | SentinelFi</title>
      </Head>
      <PageContainer
        title="Landlord Support Hub"
        subtitle="Tier-1 priority assistance for platform infrastructure and security."
        headerContent={<Headphones className="w-8 h-8 text-brand-primary" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Support Area */}
              <div className="lg:col-span-2 space-y-8">
            {success ? (
              <Card className="text-center py-12 bg-brand-primary/5 border-brand-primary/20">
                <div className="w-20 h-20 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10 text-brand-primary" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Request Successfully Dispatched</h3>
                <p className="text-gray-400 max-w-md mx-auto mb-8 font-medium">
                  Your priority assistance request for <span className="text-brand-primary font-bold">{subject}</span> has been routed to the Landlord team. Expect a response in your message hub shortly.
                </p>
                <button 
                  onClick={() => setSuccess(false)}
                  className="px-8 py-3 bg-brand-primary text-brand-dark rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition active:scale-95"
                >
                  New Dispatch
                </button>
              </Card>
            ) : (
              <>
                <Card title="Priority Assistance Dispatch" borderTopColor="primary">
                  <p className="text-gray-400 text-sm mb-6">
                    Submit a high-priority request for technical anomalies, missing platform features, or infrastructure scaling needs. Our core engineering team will be notified immediately.
                  </p>
                  <form onSubmit={handlePrioritySupportSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subject Area</label>
                      <select 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-xl text-white focus:ring-brand-primary focus:border-brand-primary transition duration-200 cursor-pointer"
                      >
                        <option>Infrastructure & Scaling</option>
                        <option>Security & Compliance</option>
                        <option>Feature Request / Upgrade</option>
                        <option>Billing & Subscription</option>
                        <option>Urgent Anomaly Report</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Deep Description</label>
                      <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={6}
                        placeholder="Provide a detailed context of the situation..."
                        className="w-full p-3 bg-brand-dark/50 border border-gray-700 rounded-xl text-white focus:ring-brand-primary focus:border-brand-primary transition duration-200 resize-none"
                        required
                      ></textarea>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={submitting || !message} className="min-w-[200px] h-12 rounded-xl text-lg font-bold">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Dispatch Request
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SupportOption 
                    icon={MessageCircle}
                    title="Direct Concierge"
                    desc="Instant messaging with the SuperAdmin team."
                    actionText="Launch Chat"
                    color="text-blue-400"
                  />
                  <SupportOption 
                    icon={FileText}
                    title="Platform Documentation"
                    desc="Deep dives into architecture and API usage."
                    actionText="Browse Docs"
                    color="text-purple-400"
                  />
                </div>
              </>
            )}
          </div>

          {/* Sidebar: Platform Status & FAQs */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-brand-dark to-brand-primary/5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-2 text-green-400" />
                Infrastructure Health
              </h3>
              <div className="space-y-3">
                <StatusItem label="PostgreSQL Nodes" status="Operational" />
                <StatusItem label="Redis Cache Layer" status="Operational" />
                <StatusItem label="AI Inference API" status="Operational" />
                <StatusItem label="Messaging Gateway" status="Operational" />
              </div>
            </Card>

            <Card title="Tenant Best Practices">
              <ul className="space-y-4">
                <SidebarLink label="Optimizing Workflows" />
                <SidebarLink label="GDPR & Data Security" />
                <SidebarLink label="Scaling Your Team" />
                <SidebarLink label="Advanced Role Mapping" />
              </ul>
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

// --- Sub-components ---

const SupportOption: React.FC<{ icon: any, title: string, desc: string, actionText: string, color: string }> = ({ icon: Icon, title, desc, actionText, color }) => (
  <Card className="hover:border-white/10 transition-colors">
    <div className={`p-3 rounded-xl bg-gray-800/50 w-fit mb-4`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <h4 className="text-lg font-bold text-white mb-1">{title}</h4>
    <p className="text-sm text-gray-400 mb-6">{desc}</p>
    <button className="text-brand-primary text-sm font-bold flex items-center hover:translate-x-1 transition-transform">
      {actionText} <ArrowRight className="w-4 h-4 ml-1" />
    </button>
  </Card>
);

const StatusItem: React.FC<{ label: string, status: string }> = ({ label, status }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-800">
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-xs text-green-400 font-mono font-bold uppercase">{status}</span>
  </div>
);

const SidebarLink: React.FC<{ label: string }> = ({ label }) => (
  <li className="flex items-center text-sm text-gray-400 hover:text-white cursor-pointer transition-colors group">
    <Zap className="w-3 h-3 mr-2 opacity-30 group-hover:opacity-100 group-hover:text-brand-primary transition-all" />
    {label}
  </li>
);

export default SupportHub;
