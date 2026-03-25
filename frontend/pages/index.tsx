import React, { useState } from 'react';
import MarketingLayout from '../components/Landing/MarketingLayout';
import Link from 'next/link';
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  BarChart3, 
  Users, 
  Lock,
  ChevronRight,
  Globe,
  Database
} from 'lucide-react';
import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const LandingPage: NextPageWithLayout = () => {
  const [activeRole, setActiveRole] = useState('CEO');
  const roles = [
    { id: 'CEO', label: 'Executive (CEO)', icon: <ShieldCheck />, desc: 'High-level risk aggregation and strategic assurance.' },
    { id: 'PM', label: 'Tactical (PM)', icon: <Zap />, desc: 'WBS granularity and operational baseline management.' },
    { id: 'AUDIT', label: 'Governance (Audit)', icon: <Lock />, desc: 'Real-time compliance monitoring and expense verification.' },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-32 pb-32">
        {/* User-provided background with brand-aligned overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/AI-DEGITAL-WALLPAPER.jpeg" 
            alt="SentinelFi Core Background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/95 via-brand-dark/80 to-brand-dark" />
          <div className="absolute inset-0 bg-brand-primary/5 mix-blend-overlay" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-alert-critical/30 bg-alert-critical/5 text-alert-critical text-xs font-mono mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Globe className="w-3 h-3" /> 
            PLATFORM v2.4: MULTI-TENANT ENGINE LIVE
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black m-heading mb-8 leading-[1] gradient-text tracking-tighter">
            Absolute Proof. <br />
            Total Assurance.
          </h1>
          
          <p className="text-xl md:text-2xl text-m-text-muted max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
            The single source of truth for enterprise project capital. 
            Automated WBS governance, AI-driven financial intelligence, 
            and complete tenant sovereignty.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link href="/landing/pricing" className="m-button-primary text-xl px-12 py-6 shadow-2xl shadow-brand-primary/20">
              Secure Your Instance <ArrowRight className="w-6 h-6" />
            </Link>
            <Link href="/landing/workflows" className="flex items-center justify-center gap-2 text-white font-bold hover:text-alert-critical transition-all group">
              Explore the Ecosystem <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Hero Image Mockup - Elevated Card */}
      <section className="pb-24 -mt-24 relative z-20">
        <div className="container mx-auto px-6">
          <div className="glass-card p-2 max-w-6xl mx-auto overflow-hidden shadow-2xl shadow-black/50 border-white/10">
            <div className="aspect-[16/9] bg-brand-dark/50 rounded-xl flex items-center justify-center relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-m-dark via-transparent to-transparent z-10 opacity-60" />
              <img 
                src="file:///C:/Users/user/.gemini/antigravity/brain/203929f0-b656-46dc-869f-e1ffd2892510/sentinelfi_hero_concept_1773491666109.png" 
                alt="SentinelFi Dashboard Concept"
                className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-x-0 bottom-0 p-8 z-20 translate-y-4 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                 <div className="glass-card p-6 bg-m-dark/80 border-alert-critical/20 backdrop-blur-xl">
                    <div className="flex justify-between items-center">
                       <div>
                          <h4 className="text-alert-critical font-mono text-xs uppercase mb-1 tracking-widest">Intelligence Feed</h4>
                          <p className="text-white font-black text-lg">WBS Variance Anomalies Detected in Project-S7</p>
                       </div>
                       <div className="text-right">
                          <span className="text-xs bg-red-500/20 text-red-500 px-3 py-1 rounded-full font-bold border border-red-500/30">CRITICAL RISK</span>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Workbench - High Contrast Section */}
      <section className="py-32 bg-brand-dark relative overflow-hidden ring-1 ring-white/5 shadow-inner">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-primary/30 to-transparent" />
        <div className="container mx-auto px-6">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-black m-heading mb-6 tracking-tight gradient-text">Unified Strategic Control</h2>
            <p className="text-xl text-m-text-muted leading-relaxed">A single data stream, optimized for every stakeholder. Precision insights delivered at scale.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* Sidebar Toggle */}
            <div className="lg:col-span-4 space-y-6">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={`w-full text-left p-8 rounded-3xl border transition-all duration-500 flex items-start gap-6 group ${
                    activeRole === role.id 
                    ? 'bg-brand-primary/10 border-brand-primary/40 shadow-xl shadow-brand-primary/5' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all duration-500 ${
                    activeRole === role.id 
                    ? 'bg-brand-primary text-brand-dark scale-110' 
                    : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {React.cloneElement(role.icon as React.ReactElement, { className: 'w-7 h-7' })}
                  </div>
                  <div>
                    <h4 className={`text-xl font-black tracking-tight ${activeRole === role.id ? 'text-white' : 'text-slate-300'}`}>{role.label}</h4>
                    <p className="text-sm text-m-text-muted mt-2 leading-relaxed">{role.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Display Area - Glass Canvas */}
            <div className="lg:col-span-8 glass-card border-white/10 rounded-[2.5rem] p-12 min-h-[500px] relative shadow-2xl bg-brand-dark/40 backdrop-blur-3xl overflow-hidden">
              <div className="absolute top-6 left-10 flex gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500/30" />
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/30" />
                <div className="w-3.5 h-3.5 rounded-full bg-green-500/30" />
              </div>

              <div className="mt-16 animate-in fade-in slide-in-from-right-8 duration-700">
                {activeRole === 'CEO' && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-2 gap-8">
                       <div className="p-8 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-colors">
                          <p className="text-xs text-brand-primary font-black uppercase mb-2 tracking-widest">Total Project Revenue</p>
                          <h3 className="text-4xl font-black font-mono text-white">$1.24B</h3>
                       </div>
                       <div className="p-8 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-colors">
                          <p className="text-xs text-alert-critical font-black uppercase mb-2 tracking-widest">Global Churn Rate</p>
                          <h3 className="text-4xl font-black font-mono text-alert-critical">0.24%</h3>
                       </div>
                    </div>
                    <div className="h-64 bg-white/5 rounded-3xl border border-white/5 p-8 flex items-end gap-3 group">
                       {[40, 70, 45, 90, 65, 80, 50, 60, 75, 55].map((h, i) => (
                         <div 
                           key={i} 
                           className="flex-1 bg-brand-primary/20 hover:bg-brand-primary/60 rounded-xl transition-all duration-500 cursor-pointer" 
                           style={{ height: `${h}%` }} 
                         />
                       ))}
                    </div>
                  </div>
                )}
                {activeRole === 'PM' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-white">Project S7: Phase 4 Implementation</h3>
                      <span className="text-xs bg-brand-primary/20 text-brand-primary px-4 py-1.5 rounded-full font-black border border-brand-primary/30">TRACKING NOMINAL</span>
                    </div>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex justify-between items-center transition-all group">
                        <div className="flex items-center gap-4">
                           <div className="p-2 bg-brand-secondary/20 rounded-lg group-hover:scale-110 transition-transform">
                             <Database className="w-5 h-5 text-brand-secondary" />
                           </div>
                           <span className="text-lg font-bold text-gray-200">4.{i} Infrastructure Deployment Protocol</span>
                        </div>
                        <span className={`text-xs font-black px-4 py-1.5 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/20`}>85% COMPLETE</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeRole === 'AUDIT' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-10">
                       <h3 className="text-2xl font-black text-white">Transaction Anomaly Monitor</h3>
                       <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 text-xs font-black rounded-full border border-red-500/20">
                         <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                         LIVE ANALYSIS ACTIVE
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="p-6 bg-red-900/10 border border-red-900/40 rounded-2xl flex justify-between items-center">
                          <div className="space-y-1">
                            <span className="text-xs text-red-400 font-mono tracking-tighter uppercase">Incident Tag: TX_ID_99x24k</span>
                            <p className="text-lg font-black text-white">DUPLICATE REQUISITION DETECTED</p>
                          </div>
                          <Link href="/reporting" className="text-sm font-black text-red-400 hover:text-red-300 transition-colors border-b border-red-400/30">QUARANTINE</Link>
                       </div>
                       {[1, 2].map(i => (
                        <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
                            <span className="text-sm font-mono text-slate-300">TX_ID: 99x24-V{i}</span>
                            <span className="text-sm text-green-500 font-black tracking-widest uppercase">VERIFIED SECURE</span>
                        </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Ecosystem Features - Distinct alternating background */}
      <section id="features" className="py-32 bg-brand-dark/40 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-6xl font-black m-heading mb-6 tracking-tighter gradient-text">Precision Engineering</h2>
            <p className="text-xl text-m-text-muted max-w-2xl mx-auto">High-fidelity components built for mission-critical financial oversight. Zero ambiguity, total control.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <FeatureCard 
              icon={<Cpu className="text-brand-primary" />} 
              title="AI-Assurance Engine" 
              desc="Predictive risk modeling that flags financial anomalies before they reach the ledger. Proactive protection for every transaction."
            />
            <FeatureCard 
              icon={<BarChart3 className="text-alert-critical" />} 
              title="Sovereign Multi-Tenancy" 
              desc="Physical schema isolation for every instance. Your data never crosses the wire, ensuring enterprise-grade jurisdictional compliance."
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-brand-secondary" />} 
              title="WBS Governance" 
              desc="Enforce rigid work breakdown structures across multi-billion dollar project portfolios. Absolute structural integrity for every line item."
            />
          </div>
        </div>
      </section>

      {/* Brand Identity & Ownership Section */}
      <section className="py-24 bg-brand-dark relative z-10 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-primary/30 bg-brand-primary/10 text-brand-primary text-xs font-mono mb-6 uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" /> SentinelFi® Heritage
              </div>
              <h2 className="text-4xl md:text-5xl font-black m-heading mb-6 tracking-tight text-white">Backed by Industry Leaders</h2>
              <p className="text-lg text-m-text-muted leading-relaxed">
                SentinelFi® was forged from real-world engineering and energy sector challenges. We built the platform we needed to secure our own billion-dollar portfolios.
              </p>
            </div>
            
            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="glass-card p-8 border border-white/10 rounded-3xl bg-white/5 hover:bg-white/10 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 blur-3xl -mr-10 -mt-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary mb-4">Built & Owned By</h4>
                <div className="text-2xl font-black text-white m-heading mb-4">Seancrystal Global Services Limited</div>
                <p className="text-m-text-muted text-sm leading-relaxed">
                  The primary architect and registered owner of the SentinelFi® platform. Driving digital transformation in capital project governance and financial security.
                </p>
              </div>

              <div className="glass-card p-8 border border-white/10 rounded-3xl bg-white/5 hover:bg-white/10 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-alert-critical/20 blur-3xl -mr-10 -mt-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <h4 className="text-xs font-black uppercase tracking-widest text-alert-critical mb-4">Funded By</h4>
                <div className="text-2xl font-black text-white m-heading mb-4">Solution Energy & Engineering Services</div>
                <p className="text-m-text-muted text-sm leading-relaxed">
                  The strategic financial partner powering SentinelFi's rapid development. Leaders in global energy infrastructure and large-scale engineering operations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - High Impact */}
      <section className="py-40 relative overflow-hidden bg-brand-dark">
        <div className="hero-glow !bg-brand-primary/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]" />
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-6xl md:text-8xl font-black m-heading mb-10 tracking-tighter leading-none">Ready for the Future?</h2>
          <p className="text-2xl text-m-text-muted max-w-2xl mx-auto mb-16 font-medium leading-relaxed">
            Join the enterprise elite. Deploy your sovereign instance of SentinelFi in under 5 minutes. Initial setup is just a click away.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <Link href="/landing/pricing" className="m-button-primary text-2xl px-16 py-8 shadow-3xl shadow-brand-primary/30">
              Initialize Setup <ArrowRight className="w-8 h-8 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="glass-card hover:bg-white/5 border-white/5 p-12 group transition-all duration-500 hover:-translate-y-2">
    <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-brand-primary/20 transition-all duration-500 group-hover:rotate-12">
      {React.cloneElement(icon as React.ReactElement, { className: 'w-10 h-10 transition-transform group-hover:scale-110' })}
    </div>
    <h4 className="text-2xl font-black mb-6 m-heading text-white">{title}</h4>
    <p className="text-m-text-muted leading-relaxed text-lg">{desc}</p>
  </div>
);

// Standard getLayout pattern to resolve header duplication
LandingPage.getLayout = (page: React.ReactNode) => {
  return <MarketingLayout>{page}</MarketingLayout>;
};

export default LandingPage;

