import React, { useState } from 'react';
import MarketingLayout from '../../components/Landing/MarketingLayout';
import { Star, Quote, ChevronLeft, ChevronRight, Building2, TrendingUp, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  industry: string;
  result: string;
  resultLabel: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "SentinelFi's AI forensics engine identified a 12% budget discrepancy in one of our sub-contractor invoices within 48 hours of deployment. Our previous system would have taken 3 audit cycles to surface the same issue.",
    author: "Engr. Abdullahi Musa",
    role: "CFO",
    company: "Meridian Capital Infrastructure",
    industry: "Energy & Infrastructure",
    result: "₦840M",
    resultLabel: "Saved in audit cycle 1"
  },
  {
    quote: "The multi-tenant architecture is genuinely sovereign. We run separate project portfolios for three government ministries, each completely isolated. Our compliance team finally has the segregation proof they've been asking for.",
    author: "Dr. Chinyere Okafor",
    role: "Director, Digital Transformation",
    company: "Federal Ministry of Works",
    industry: "Government & Public Sector",
    result: "100%",
    resultLabel: "Audit compliance achieved"
  },
  {
    quote: "We evaluated 4 platforms before SentinelFi. Nothing else combined WBS enforcement, live cost tracking, and AI analysis in a single sovereign instance. The ROI became visible in the first quarter.",
    author: "Mr. Taiwo Adeyemi",
    role: "Project Director",
    company: "TerraForm Construction Holdings",
    industry: "Construction & Real Estate",
    result: "3.2x",
    resultLabel: "Project oversight efficiency"
  },
  {
    quote: "Our forensic analysis team no longer spends 60% of their time manually cross-referencing invoices. SentinelFi's automated verification layer handles the routine checks while our analysts focus on strategic risk.",
    author: "Amaka Eze",
    role: "Head of Internal Audit",
    company: "Omega Financial Group",
    industry: "Financial Services",
    result: "60%",
    resultLabel: "Reduction in manual audit time"
  },
  {
    quote: "Implementation was smoother than any enterprise platform we've adopted. The magic-link provisioning meant our 47-person team was operational in under 2 hours. The WBS templates for oil & gas projects are remarkably comprehensive.",
    author: "Kolade Rasheed",
    role: "VP Operations",
    company: "Brixstone Energy Services",
    industry: "Oil & Gas",
    result: "2 hrs",
    resultLabel: "Full team onboarding time"
  },
  {
    quote: "The currency awareness module was a game-changer for our cross-border infrastructure projects. Managing budgets across NGN, USD, GBP and EUR simultaneously, with live conversion, was something no competitor offered.",
    author: "Ms. Folasade Bankole",
    role: "International Projects CFO",
    company: "AfriLink Construction",
    industry: "Pan-African Infrastructure",
    result: "4",
    resultLabel: "Currencies managed in real-time"
  }
];

const industries = ['All', 'Energy & Infrastructure', 'Government & Public Sector', 'Construction & Real Estate', 'Financial Services', 'Oil & Gas', 'Pan-African Infrastructure'];

import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const TestimonialsPage: NextPageWithLayout = () => {
  const [activeIndustry, setActiveIndustry] = useState('All');
  const [activeIdx, setActiveIdx] = useState(0);

  const filtered = activeIndustry === 'All' ? testimonials : testimonials.filter(t => t.industry === activeIndustry);

  const active = filtered[activeIdx] || filtered[0];

  return (
    <section className="py-28">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-20">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-4">Verified Impact</p>
            <h1 className="text-5xl md:text-6xl font-black font-sora text-white mb-6">
              Trusted by <span className="text-brand-primary">Industry Leaders</span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed">
              From government ministries to multinational infrastructure boards — organizations that demand financial accountability trust SentinelFi.
            </p>
          </div>

          {/* Featured Testimonial */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="glass-card p-10 md:p-14 relative">
              <Quote className="absolute top-8 left-8 w-12 h-12 text-brand-primary/20" />
              <div className="flex gap-1 mb-6">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
              </div>
              <p className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-10 relative z-10 font-sora">
                "{active.quote}"
              </p>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary/20 border border-brand-primary/30 rounded-full flex items-center justify-center text-brand-primary font-bold text-lg">
                    {active.author[0]}
                  </div>
                  <div>
                    <p className="font-black text-white">{active.author}</p>
                    <p className="text-sm text-gray-500">{active.role} · {active.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-brand-primary font-sora">{active.result}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-widest">{active.resultLabel}</p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-4 mt-10 pt-6 border-t border-white/5">
                <button
                  onClick={() => setActiveIdx((prev) => (prev - 1 + filtered.length) % filtered.length)}
                  className="p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-brand-primary/50 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2 flex-1">
                  {filtered.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIdx(i)}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${i === activeIdx ? 'bg-brand-primary' : 'bg-white/10 hover:bg-white/20'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setActiveIdx((prev) => (prev + 1) % filtered.length)}
                  className="p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-brand-primary/50 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Industry Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {industries.map((ind) => (
              <button
                key={ind}
                onClick={() => { setActiveIndustry(ind); setActiveIdx(0); }}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                  activeIndustry === ind
                    ? 'bg-brand-primary text-white shadow-[0_0_20px_rgba(13,148,136,0.3)]'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:border-brand-primary/50 hover:text-white'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {[
              { icon: <Building2 className="w-8 h-8" />, stat: '60+', label: 'Enterprise Tenants', color: 'brand-primary' },
              { icon: <TrendingUp className="w-8 h-8" />, stat: '₦48B+', label: 'Capital Projects Monitored', color: 'brand-secondary' },
              { icon: <Shield className="w-8 h-8" />, stat: '99.97%', label: 'Uptime SLA', color: 'alert-critical' },
              { icon: <Zap className="w-8 h-8" />, stat: '< 2hr', label: 'Average Onboarding', color: 'alert-positive' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-8 text-center">
                <div className={`text-${stat.color} mx-auto mb-4 flex justify-center`}>{stat.icon}</div>
                <p className={`text-4xl font-black text-${stat.color} font-sora mb-2`}>{stat.stat}</p>
                <p className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link href="/landing/pricing" className="inline-flex items-center gap-3 px-10 py-5 bg-brand-primary text-white font-black rounded-2xl hover:bg-brand-primary/90 transition-all hover:scale-105 hover:shadow-[0_20px_40px_rgba(13,148,136,0.3)] uppercase tracking-widest font-sora text-sm">
              Join These Leaders — Get Started
            </Link>
          </div>
        </div>
      </section>
  );
};

TestimonialsPage.getLayout = (page: React.ReactElement) => {
  return <MarketingLayout title="Client Success Stories | SentinelFi">{page}</MarketingLayout>;
};

export default TestimonialsPage;
