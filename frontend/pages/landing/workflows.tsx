import React, { useState } from 'react';
import Link from 'next/link';
import MarketingLayout from '../../components/Landing/MarketingLayout';
import { 
  Users, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  BarChart3, 
  Lock,
  ArrowRight,
  ChevronRight,
  Activity,
  Target,
  FileSearch,
  PieChart
} from 'lucide-react';

import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const WorkflowsPage: NextPageWithLayout = () => {
  const [activeRole, setActiveRole] = useState('CEO');

  const workflows = {
    'CEO': {
      title: 'Strategic Oversight',
      subtitle: 'Board-Level High-Fidelity Intelligence',
      icon: <ShieldCheck className="w-12 h-12 text-m-primary" />,
      desc: 'As the executive head, you require absolute clarity on capital risk and organizational health without getting lost in the weeds.',
      steps: [
        { title: 'Global Portfolio Pulse', desc: 'Real-time aggregation of multi-project health and variance heatmaps.' },
        { title: 'Capital Allocation Logic', desc: 'Predictive modeling for future project funding based on historical performance.' },
        { title: 'Governance Guardrails', desc: 'Setting the high-level assurance policies that cascade to every PM.' }
      ],
      visual: (
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white/5 rounded-2xl border border-m-primary/20">
                 <p className="text-[10px] text-m-text-muted uppercase tracking-widest mb-1">Portfolio Variance</p>
                 <h3 className="text-3xl font-black text-red-500">-2.4%</h3>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-m-accent/20">
                 <p className="text-[10px] text-m-text-muted uppercase tracking-widest mb-1">Efficiency Index</p>
                 <h3 className="text-3xl font-black text-m-accent">94.2</h3>
              </div>
           </div>
           <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
              <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                 <PieChart className="w-4 h-4 text-m-secondary" /> 
                 Capital Dispersion
              </h4>
              <div className="flex gap-2 items-end h-24">
                 {[30, 80, 40, 60, 95, 20].map((h, i) => (
                   <div key={i} className="flex-1 bg-gradient-to-t from-m-primary to-m-secondary rounded-t-md opacity-70" style={{ height: `${h}%` }} />
                 ))}
              </div>
           </div>
        </div>
      )
    },
    'PM': {
      title: 'Tactical Execution',
      subtitle: 'Precision Work Breakdown Governance',
      icon: <Zap className="w-12 h-12 text-m-secondary" />,
      desc: 'Project Managers use SentinelFi to enforce rigid WBS structures and prevent scope/budget creep at the source.',
      steps: [
        { title: 'Structure Initialization', desc: 'Defining the baseline WBS for multi-billion dollar infrastructure.' },
        { title: 'Operational Budgeting', desc: 'Linking every requisition to a specific WBS node for absolute tracking.' },
        { title: 'Variance Correction', desc: 'Automated alerts when field activities deviate from the digital twin baseline.' }
      ],
      visual: (
        <div className="space-y-4">
           <div className="p-4 bg-m-primary/10 border border-m-primary/30 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-sm font-bold text-m-primary">WBS 4.2.1 Deployment</span>
                 <span className="text-[10px] bg-m-primary text-m-dark px-2 py-0.5 rounded font-bold">LOCKED</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                 <div className="w-[78%] h-full bg-m-primary" />
              </div>
           </div>
           {[1, 2].map(i => (
             <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <Target className="w-4 h-4 text-gray-500" />
                   <span className="text-xs text-gray-300">Phase {i} Integrity Check</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-m-accent" />
             </div>
           ))}
        </div>
      )
    },
    'AUDIT': {
      title: 'Financial Forensics',
      subtitle: 'AI-Driven Governance & Compliance',
      icon: <Activity className="w-12 h-12 text-m-accent" />,
      desc: 'Audit and Finance teams leverage our AI layer to verify thousands of transactions against organizational policy automatically.',
      steps: [
        { title: 'Policy Enforcement', desc: 'Defining the algorithmic rules for expenditure approval.' },
        { title: 'Anomaly Discovery', desc: 'Letting the Sentinel-AI flag suspicious patterns and duplicates.' },
        { title: 'Immutable Trail', desc: 'Generating forensic-grade reports for internal and external stakeholders.' }
      ],
      visual: (
        <div className="space-y-6">
           <div className="p-6 bg-red-900/10 border border-red-500/30 rounded-2xl relative overflow-hidden">
              <div className="absolute top-2 right-4 text-[10px] font-black text-red-500 animate-pulse font-mono">ANOMALY DETECTED</div>
              <div className="flex gap-4 mb-4">
                 <FileSearch className="w-8 h-8 text-red-500" />
                 <div>
                    <h4 className="font-bold text-white text-sm">Duplicate Invoice #92-K</h4>
                    <p className="text-[10px] text-red-400">Similarity Match: 98.4% vs Inv #91-J</p>
                 </div>
              </div>
              <button className="w-full py-2 bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-red-500/20">
                 Freeze Payment
              </button>
           </div>
           <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
              <h4 className="text-xs font-bold mb-4 uppercase tracking-widest text-m-text-muted">Policy Compliance</h4>
              <div className="space-y-2">
                 {[1, 2].map(i => (
                   <div key={i} className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-m-accent opacity-50" style={{ width: i === 1 ? '95%' : '82%' }} />
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )
    }
  };

  return (
    <>
      <section className="py-24 container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-24">
          <h1 className="text-5xl md:text-6xl font-black m-heading mb-8 gradient-text">
            Engineered for Every Stakeholder.
          </h1>
          <p className="text-xl text-m-text-muted leading-relaxed">
            SentinelFi is not just a tool; it is an organizational nervous system. 
            Select your role to see how we transform your workflow baseline.
          </p>
        </div>

        {/* Role Selector */}
        <div className="flex justify-center gap-4 mb-20 overflow-x-auto pb-4 no-scrollbar">
          {Object.keys(workflows).map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`px-8 py-4 rounded-full font-bold transition-all border shrink-0 ${
                activeRole === role 
                ? 'bg-m-primary text-m-dark border-m-primary shadow-lg shadow-m-primary/20' 
                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'
              }`}
            >
              {workflows[role as keyof typeof workflows].title}
            </button>
          ))}
        </div>

        {/* Workflow Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="mb-8">{workflows[activeRole as keyof typeof workflows].icon}</div>
            <h2 className="text-4xl font-bold m-heading mb-2 gradient-text">{workflows[activeRole as keyof typeof workflows].title}</h2>
            <p className="text-m-primary font-mono text-sm uppercase tracking-widest mb-6 font-bold">{workflows[activeRole as keyof typeof workflows].subtitle}</p>
            <p className="text-lg text-m-text-muted mb-10 leading-relaxed">{workflows[activeRole as keyof typeof workflows].desc}</p>
            
            <div className="space-y-8">
              {workflows[activeRole as keyof typeof workflows].steps.map((step, i) => (
                <div key={i} className="flex gap-6 group">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 font-bold text-m-primary font-mono transition-colors group-hover:bg-m-primary/10">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-1 text-white">{step.title}</h4>
                    <p className="text-sm text-m-text-muted">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-right-8 duration-700">
             <div className="glass-card p-12 bg-m-dark/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                   <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-white/10" />
                      <div className="w-2 h-2 rounded-full bg-white/10" />
                      <div className="w-2 h-2 rounded-full bg-white/10" />
                   </div>
                </div>
                <div className="relative z-10">
                   {workflows[activeRole as keyof typeof workflows].visual}
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-m-primary/5 rounded-full blur-[60px]" />
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-m-secondary/5 rounded-full blur-[60px]" />
             </div>
          </div>
        </div>
      </section>

      {/* Cross-Role Sync CTA */}
      <section className="py-24 bg-white/[0.02] border-y border-white/5">
         <div className="container mx-auto px-6 text-center">
            <h3 className="text-3xl font-bold m-heading mb-6 text-brand-primary">Absolute Synchronization.</h3>
            <p className="text-m-text-muted max-w-2xl mx-auto mb-10">
               SentinelFi ensures that when a Project Manager updates a baseline, the CEO's 
               strategic dashboard reflects the risk shift in under 12 milliseconds. 
               Total organizational alignment, enforced by code.
            </p>
            <Link href="/landing/pricing" className="m-button-primary group px-8 py-4">
               Deploy Your Integrated Instance <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
         </div>
      </section>
    </>
  );
};

WorkflowsPage.getLayout = (page: React.ReactElement) => {
  return <MarketingLayout title="Workflows | Industry-Standard Assurance Flows">{page}</MarketingLayout>;
};

const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
);

export default WorkflowsPage;
