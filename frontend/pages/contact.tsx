import React, { useState } from 'react';
import MarketingLayout from '../components/Landing/MarketingLayout';
import { Mail, Phone, MapPin, Send, MessageSquare, ShieldCheck, Globe } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const ContactPage: NextPageWithLayout = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    interests: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Mock API call to newly planned marketing controller
      await api.post('/marketing/contact', formData);
      toast.success('Secure briefing request transmitted successfully.');
      setFormData({ name: '', email: '', company: '', message: '', interests: [] });
    } catch (err: any) {
      toast.error('Transmission failed. Please check your connectivity.');
    } finally {
      setLoading(false);
    }
  };

  const interestOptions = [
    'WBS Governance',
    'AI Financial Auditing',
    'Multi-Tenant Enterprise Setup',
    'Strategic Dashboards',
    'Training & Academy'
  ];

  return (
    <section className="py-24 container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20">
        <div className="space-y-12">
          <div>
            <h1 className="text-5xl font-black m-heading mb-6 gradient-text">Get in Touch.</h1>
            <p className="text-lg text-m-text-muted leading-relaxed max-w-md">
              Ready to secure your project capital? Our governance engineers are 
              available for strategic consultations and system demonstrations.
            </p>
          </div>

          <div className="space-y-8">
            <ContactInfoItem 
              icon={<Mail className="text-m-primary" />} 
              label="Secure Transmission" 
              value="ops@sentinelfi.com" 
            />
            <ContactInfoItem 
              icon={<MessageSquare className="text-m-secondary" />} 
              label="Intelligence Briefing" 
              value="+1 (555) SENTINEL" 
            />
            <ContactInfoItem 
              icon={<Globe className="text-m-accent" />} 
              label="Global HQ" 
              value="Silicon Valley | London | Lagos" 
            />
          </div>

          <div className="p-8 bg-m-primary/5 border border-m-primary/20 rounded-3xl">
             <div className="flex items-center gap-4 mb-4">
                <ShieldCheck className="w-6 h-6 text-m-primary" />
                <h4 className="font-bold text-white uppercase tracking-widest text-xs">Security Assurance</h4>
             </div>
             <p className="text-sm text-m-text-muted">
                Every inquiry is treated with the same data isolation standards as our 
                production tenancies. Your company metadata is never traded.
             </p>
          </div>
        </div>

        {/* Lead Form */}
        <div className="glass-card p-8 md:p-12 relative">
          <div className="hero-glow !bg-m-primary/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-m-primary focus:ring-1 focus:ring-m-primary outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Professional Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-m-primary focus:ring-1 focus:ring-m-primary outline-none transition-all"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Company / Organization</label>
              <input 
                type="text" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-m-primary focus:ring-1 focus:ring-m-primary outline-none transition-all"
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Areas of Interest</label>
              <div className="flex flex-wrap gap-2 pt-2">
                {interestOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      const updated = formData.interests.includes(option)
                        ? formData.interests.filter(i => i !== option)
                        : [...formData.interests, option];
                      setFormData({...formData, interests: updated});
                    }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                      formData.interests.includes(option)
                        ? 'bg-m-primary/20 border-m-primary text-m-primary'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Detailed Requirements</label>
              <textarea 
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-m-primary focus:ring-1 focus:ring-m-primary outline-none transition-all resize-none"
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="m-button-primary w-full justify-center py-4 text-lg"
            >
              {loading ? 'Transmitting...' : 'Request Briefing'} <Send className="w-5 h-5 ml-2" />
            </button>
          </form>
        </div>
      </section>
  );
};

ContactPage.getLayout = (page: React.ReactElement) => {
  return <MarketingLayout title="Contact Us | Secure Briefing Request">{page}</MarketingLayout>;
};

const ContactInfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex items-start gap-4 group">
    <div className="p-3 bg-white/5 rounded-xl border border-transparent group-hover:border-m-primary/20 transition-all">
      {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
    </div>
    <div>
      <p className="text-xs font-bold text-m-text-muted uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl text-white font-semibold">{value}</p>
    </div>
  </div>
);

export default ContactPage;
