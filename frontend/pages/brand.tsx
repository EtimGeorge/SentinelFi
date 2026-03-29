import React from 'react';
import { NextPage } from 'next';
import MarketingLayout from '../components/Landing/MarketingLayout';
import { Shield, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const BrandPage: NextPageWithLayout = () => {
  return (
    <>
      <section className="pt-40 pb-20 relative overflow-hidden bg-brand-dark">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 text-brand-primary text-xs font-mono mb-8">
            <Shield className="w-4 h-4" /> 
            OFFICIAL BRAND IDENTITY
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black m-heading mb-8 tracking-tighter text-white">
            Built by Industry.<br />
            Powered by Energy.
          </h1>
          
          <p className="text-xl text-m-text-muted max-w-3xl mx-auto mb-12 leading-relaxed">
            SentinelFi® is not just a software platform; it is the culmination of decades of experience in large-scale capital project execution, engineering governance, and corporate finance.
          </p>
        </div>
      </section>

      <section className="py-24 bg-brand-dark/50 border-y border-white/5">
        <div className="container mx-auto px-6 max-w-5xl">
          
          {/* Owner Section */}
          <div className="flex flex-col md:flex-row gap-12 items-center mb-32">
            <div className="md:w-1/2 order-2 md:order-1">
              <div className="glass-card p-10 border border-brand-primary/20 bg-brand-primary/5 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-brand-primary/20 blur-3xl -ml-10 -mt-10 rounded-full" />
                <h3 className="text-3xl font-black m-heading text-white mb-6 relative z-10">
                  Seancrystal Global Services Limited
                </h3>
                <div className="space-y-4 text-m-text-muted leading-relaxed relative z-10">
                  <p>
                    <strong>Seancrystal Global Services Limited</strong> is the exclusive architectural owner, developer, and sole proprietor of the SentinelFi® platform and its underlying intellectual property.
                  </p>
                  <p>
                    As a multifaceted technology and services firm, Seancrystal recognized a critical gap in the market for sovereign, multi-tenant work breakdown structure (WBS) governance. 
                  </p>
                  <p>
                    Through rigorous engineering and strategic foresight, Seancrystal designed SentinelFi® to serve as the absolute source of truth for enterprise capital lifecycle management.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                  <div className="flex items-center gap-3 text-sm text-gray-400 font-mono tracking-wider uppercase">
                    <ShieldCheck className="w-5 h-5 text-brand-primary" /> Registered Trademark Owner
                  </div>
                </div>
              </div>
            </div>
            <div className="md:w-1/2 order-1 md:order-2 space-y-6">
              <h2 className="text-4xl font-black text-white m-heading tracking-tight">The Architect & Proprietor</h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                Every line of code, every architectural decision, and every security protocol within SentinelFi® was forged by the engineering teams at Seancrystal.
              </p>
            </div>
          </div>

          {/* Funder Section */}
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2 space-y-6">
              <h2 className="text-4xl font-black text-white m-heading tracking-tight">The Financial Engine</h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                Transformational software requires transformational backing. Solution Energy and Engineering Services Limited provided the strategic capital necessary to bring SentinelFi® to the global market.
              </p>
            </div>
            <div className="md:w-1/2">
              <div className="glass-card p-10 border border-alert-critical/20 bg-alert-critical/5 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-alert-critical/20 blur-3xl -mr-10 -mt-10 rounded-full" />
                <h3 className="text-3xl font-black m-heading text-white mb-6 relative z-10">
                  Solution Energy & Engineering Services Limited (SEESL)
                </h3>
                <div className="space-y-4 text-m-text-muted leading-relaxed relative z-10">
                  <p>
                    <strong>Solution Energy and Engineering Services Limited</strong> is the principal institutional sponsor and primary financial backer of the SentinelFi® platform.
                  </p>
                  <p>
                    As a dominant force in global energy infrastructure, SEESL understands the catastrophic cost of poor project governance. Their significant capital investment ensured SentinelFi® was built to the exact, unforgiving standards required by the energy and heavy engineering sectors.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                  <div className="flex items-center gap-3 text-sm text-gray-400 font-mono tracking-wider uppercase">
                    <Zap className="w-5 h-5 text-alert-critical" /> Principal Financial Sponsor
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Trust CTA */}
      <section className="py-32 bg-brand-dark text-center relative overflow-hidden">
         <div className="container mx-auto px-6 relative z-10">
            <h2 className="text-4xl md:text-5xl font-black text-white m-heading mb-8">Deploy With Confidence</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
              Backed by robust engineering and significant institutional capital, your financial data is secured by an enterprise built for longevity.
            </p>
            <Link href="/landing/pricing" className="m-button-primary px-12 py-6 text-lg">
              Secure Your Sovereign Instance <ArrowRight className="w-6 h-6 ml-2 inline" />
            </Link>
         </div>
      </section>
    </>
  );
};

BrandPage.getLayout = (page: React.ReactNode) => {
  return <MarketingLayout title="Brand & Ownership | SentinelFi">{page}</MarketingLayout>;
};

export default BrandPage;
