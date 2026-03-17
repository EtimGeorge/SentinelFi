import React from 'react';
import MarketingLayout from '../components/Landing/MarketingLayout';
import { Target, Users, ShieldAlert, Award, Globe, History } from 'lucide-react';

const AboutPage = () => {
  return (
    <>
      <section className="py-24 container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-24">
          <h1 className="text-5xl md:text-6xl font-black m-heading mb-8 gradient-text">
            Engineered for Integrity.
          </h1>
          <p className="text-xl text-m-text-muted leading-relaxed">
            SentinelFi was born from a simple observation: enterprise project finance is 
            plagued by "Shadow Accounting" and manual auditing friction. We built the 
            Sentinel system to automate the verification of every capital dollar, 
            ensuring that project directors can manage with absolute confidence.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-32">
          <div className="space-y-6">
            <Target className="w-12 h-12 text-m-primary" />
            <h3 className="text-2xl font-bold m-heading text-brand-primary">Our Mission</h3>
            <p className="text-m-text-muted">
              To provide the definitive digital baseline for project capital, eliminating 
              financial ambiguity through automated work breakdown governance.
            </p>
          </div>
          <div className="space-y-6">
            <Users className="w-12 h-12 text-m-secondary" />
            <h3 className="text-2xl font-bold m-heading text-brand-secondary">Global Collaboration</h3>
            <p className="text-m-text-muted">
              Bridging the gap between field PMs and board-level executives with 
              real-time, role-optimized intelligence reporting.
            </p>
          </div>
          <div className="space-y-6">
            <ShieldAlert className="w-12 h-12 text-m-accent" />
            <h3 className="text-2xl font-bold m-heading text-m-accent">Absolute Security</h3>
            <p className="text-m-text-muted">
              Leveraging multi-tenant schema isolation to ensure that every tenant's 
              financial metadata remains strictly their own.
            </p>
          </div>
        </div>

        {/* The Journey Timeline */}
        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 md:p-24 relative overflow-hidden">
          <div className="hero-glow !bg-m-secondary/10 top-0 left-0 w-full h-full" />
          <div className="relative z-10">
            <h2 className="text-4xl font-bold m-heading mb-16 text-center text-white">Built on a Foundation of Trust</h2>
            
            <div className="space-y-16">
              <TimelineItem 
                year="2024" 
                title="The Core Engine" 
                desc="Initial development of the WBS Governance kernel and Multi-Tenant architecture."
              />
              <TimelineItem 
                year="2025" 
                title="AI Intelligence Integration" 
                desc="Launch of the Sentinel-AI layer for predictive risk modeling and automated auditing."
              />
              <TimelineItem 
                year="2026" 
                title="Global Expansion" 
                desc="Scaling the platform to support thousands of concurrent tenants across the energy and infrastructure sectors."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Team / Stats */}
      <section className="py-24 container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center border-t border-white/5">
        <div>
          <h4 className="text-4xl font-black text-m-primary mb-2">$20B+</h4>
          <p className="text-xs text-m-text-muted uppercase tracking-widest">Assured Capital</p>
        </div>
        <div>
          <h4 className="text-4xl font-black text-white mb-2">450+</h4>
          <p className="text-xs text-m-text-muted uppercase tracking-widest">Global Tenancies</p>
        </div>
        <div>
          <h4 className="text-4xl font-black text-m-accent mb-2">99.9%</h4>
          <p className="text-xs text-m-text-muted uppercase tracking-widest">Uptime Guard</p>
        </div>
        <div>
          <h4 className="text-4xl font-black text-white mb-2">12ms</h4>
          <p className="text-xs text-m-text-muted uppercase tracking-widest">Intelligence Latency</p>
        </div>
      </section>
    </>
  );
};

AboutPage.getLayout = (page: React.ReactElement) => {
  return <MarketingLayout title="About Us | The SentinelFi Mission">{page}</MarketingLayout>;
};

const TimelineItem = ({ year, title, desc }: { year: string, title: string, desc: string }) => (
  <div className="flex gap-8 group">
    <div className="flex flex-col items-center">
      <div className="text-2xl font-black text-m-primary font-mono group-hover:scale-110 transition-transform">{year}</div>
      <div className="w-px h-full bg-m-primary/30 mt-4 group-last:hidden" />
    </div>
    <div className="pb-8">
      <h4 className="text-xl font-bold mb-2 m-heading text-white">{title}</h4>
      <p className="text-m-text-muted max-w-xl leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default AboutPage;
