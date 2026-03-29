import React from 'react';
import MarketingLayout from '../components/Landing/MarketingLayout';
import { Play, BookOpen, ScrollText, GraduationCap, Clock, Signal } from 'lucide-react';

import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const TrainingPage: NextPageWithLayout = () => {
  return (
    <section className="py-24 container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-24">
          <h1 className="text-5xl md:text-6xl font-black m-heading mb-8 gradient-text">
            Master the Sentinel Ecosystem.
          </h1>
          <p className="text-xl text-m-text-muted leading-relaxed">
            From work breakdown architecture to AI-driven financial forensics. 
            The Sentinel Academy provides the blueprints for your organization's 
            digital assurance journey.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <TrainingCard 
            difficulty="Beginner" 
            title="Sovereign Onboarding" 
            duration="45m"
            desc="Configuring your tenant instance, identity management, and initial schema settings."
          />
          <TrainingCard 
            difficulty="Intermediate" 
            title="WBS Architecture" 
            duration="1.5h"
            desc="Constructing Bulletproof work breakdown structures that enforce multi-billion dollar transparency."
          />
          <TrainingCard 
            difficulty="Advanced" 
            title="AI-Audit Forensics" 
            duration="2h"
            desc="Deep dive into the Sentinel-AI layer. Training nodes on anomaly detection and risk thresholds."
          />
          <TrainingCard 
            difficulty="Executive" 
            title="Strategic Reporting" 
            duration="1h"
            desc="Optimizing high-level dashboards for board review and capital allocation decisions."
          />
          <TrainingCard 
            difficulty="Governance" 
            title="Regulatory Compliance" 
            duration="1.2h"
            desc="Exporting immutable audit trails and meeting international project finance standards."
          />
          <TrainingCard 
            difficulty="IT Ops" 
            title="API & Integration" 
            duration="3h"
            desc="Connecting SentinelFi to your existing ERP and project management data streams."
          />
        </div>

        {/* The Live Session CTA */}
        <div className="mt-32 glass-card p-12 md:p-20 relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 p-8">
            <Signal className="w-12 h-12 text-m-primary animate-pulse" />
          </div>
          <GraduationCap className="w-16 h-16 text-m-primary mb-8" />
          <h2 className="text-4xl font-bold m-heading mb-6 text-white">Need a Specialized Briefing?</h2>
          <p className="text-m-text-muted max-w-xl mb-12">
            Our governance engineers can provide a custom, on-premise training 
            canvas for your executive team.
          </p>
          <a href="/contact" className="m-button-primary text-xl px-12 py-5">
            Request Enterprise Training
          </a>
        </div>
      </section>
  );
};

TrainingPage.getLayout = (page: React.ReactElement) => {
  return <MarketingLayout title="Sentinel Academy | Enterprise Training Canvas">{page}</MarketingLayout>;
};

const TrainingCard = ({ difficulty, title, duration, desc }: { 
  difficulty: string, 
  title: string, 
  duration: string, 
  desc: string 
}) => (
  <div className="glass-card group overflow-hidden flex flex-col">
    <div className="aspect-video bg-white/5 border-b border-white/5 flex items-center justify-center relative">
      <div className="w-14 h-14 bg-m-primary/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer">
        <Play className="w-6 h-6 text-m-primary fill-m-primary" />
      </div>
      <div className="absolute top-4 left-4 px-3 py-1 bg-m-dark/60 rounded-full text-[10px] font-bold uppercase tracking-widest text-m-text-muted flex items-center gap-1.5 backdrop-blur-sm">
        <Clock className="w-3 h-3" /> {duration}
      </div>
      <div className={`absolute bottom-4 right-4 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
        difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
        difficulty === 'Intermediate' ? 'bg-blue-500/20 text-blue-400' :
        difficulty === 'Advanced' ? 'bg-purple-500/20 text-purple-400' :
        'bg-m-accent/20 text-m-accent'
      }`}>
        {difficulty}
      </div>
    </div>
    <div className="p-8 flex-1 flex flex-col">
      <h3 className="text-xl font-bold mb-4 m-heading text-white group-hover:text-m-primary transition-colors">{title}</h3>
      <p className="text-sm text-m-text-muted leading-relaxed mb-8 flex-1">{desc}</p>
      <div className="flex items-center gap-4 text-xs font-bold text-white uppercase tracking-widest pt-6 border-t border-white/5 group-hover:gap-6 transition-all">
        <BookOpen className="w-4 h-4 text-m-secondary" />
        Start Lesson
      </div>
    </div>
  </div>
);

export default TrainingPage;
