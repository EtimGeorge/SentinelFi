import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import MarketingNav from './MarketingNav';
import { ArrowRight, Play } from 'lucide-react';

interface MarketingLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const MarketingLayout: React.FC<MarketingLayoutProps> = ({
  children, title = "SentinelFi | Financial Control Tower for Capital Projects", description = "SentinelFi locks every capital dollar to a work-breakdown structure, verifies every invoice with AI, and gives CEOs, PMs and auditors one shared source of truth."
}) => {
  return (
    <div className="marketing-root min-h-screen bg-[#0B0F1A] selection:bg-m-primary selection:text-m-dark">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {/* Modern font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>

      <MarketingNav />

      <main id="main-content" className="relative pt-[72px]">
        {children}
      </main>

      {/* Pre-footer explorer band — the "Explore live tour" invitation lives
          here (full-width, well styled) instead of cramped inside the footer. */}
      <section aria-label="Explore SentinelFi live" className="relative overflow-hidden border-t border-white/5 bg-brand-dark">
        <div className="hero-glow left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-7">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-1.5 text-xs font-bold uppercase text-brand-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-primary" aria-hidden />
              New here? Start here
            </p>
            <h2 className="m-heading mb-4 text-3xl font-black tracking-tight text-white md:text-4xl">
              See a live workspace in 2 minutes.
            </h2>
            <p className="max-w-xl leading-relaxed text-slate-400">
              Tour real WBS budgets, variance heatmaps and a quarantined duplicate
              invoice — then launch your own free tenant when you are ready.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:col-span-5 lg:justify-end">
            <Link href="/landing/workflows" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-white/20 px-8 text-base font-bold text-white transition-colors hover:border-brand-primary/60 hover:text-brand-primary">
              <Play className="h-5 w-5" aria-hidden /> Explore live tour
            </Link>
            <Link href="/landing/pricing" className="m-button-primary justify-center px-8 py-4 text-base">
              Start free trial <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-m-dark border-t border-white/5 py-16">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="space-y-6 md:col-span-5">
            {/* Brand lockup — identical to the header: logo mark + SENTINEL orange-Fi */}
            <Link href="/" className="group flex items-center gap-3" aria-label="SentinelFi home">
              <span className="relative block h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-brand-darker p-1 transition-colors group-hover:border-brand-primary/50">
                <Image src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="" fill sizes="40px" className="object-contain" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-lg font-black uppercase text-white">Sentinel<span className="text-orange-500">Fi</span></span>
                <span className="text-xs font-semibold normal-case text-slate-400">Capital assurance platform</span>
              </span>
            </Link>
            <p className="text-m-text-muted max-w-sm leading-relaxed">
              The financial control tower for capital projects, every dollar locked to a
              work-breakdown structure, every invoice verified by AI, every decision auditable.
            </p>
            <div className="pt-4 border-t border-white/10 space-y-2">
              <p className="text-xs text-m-text-muted">
                Built & Owned by <strong className="text-white hover:text-m-primary transition-colors cursor-pointer">Seancrystal Global Services Limited</strong>
              </p>
              <p className="text-xs text-m-text-muted">
                Funded by{' '}
                <a
                  href="https://www.solutionenergylimited.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white underline decoration-white/20 underline-offset-4 transition-colors hover:text-m-primary hover:decoration-m-primary"
                >
                  Solution Energy and Engineering Services Limited
                </a>
              </p>
            </div>
          </div>

          <nav aria-label="Explore" className="md:col-span-4">
            <h4 className="text-white font-bold mb-6 m-heading uppercase text-xs">Explore</h4>
            <ul className="space-y-4 text-sm text-m-text-muted">
              <li><Link href="/landing/features" className="hover:text-m-primary transition-colors">Platform, what it does</Link></li>
              <li><Link href="/landing/workflows" className="hover:text-m-primary transition-colors">Live tour, how it feels</Link></li>
              <li><Link href="/landing/testimonials" className="hover:text-m-primary transition-colors">Customers, proof it works</Link></li>
              <li><Link href="/landing/pricing" className="hover:text-m-primary transition-colors">Pricing, start free trial</Link></li>
            </ul>
          </nav>

          <nav aria-label="Company" className="md:col-span-3">
            <h4 className="text-white font-bold mb-6 m-heading uppercase text-xs">Company</h4>
            <ul className="space-y-4 text-sm text-m-text-muted">
              <li><Link href="/about" className="hover:text-m-primary transition-colors">About us</Link></li>
              <li><Link href="/training" className="hover:text-m-primary transition-colors">Academy & training</Link></li>
              <li><Link href="/contact" className="hover:text-m-primary transition-colors">Talk to us</Link></li>
              <li><Link href="/brand" className="hover:text-m-primary transition-colors">Brand & ownership</Link></li>
            </ul>
          </nav>
        </div>
        
        <div className="mx-auto max-w-7xl px-6 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-m-text-muted">
          <p>© {new Date().getFullYear()} SentinelFi® - A Seancrystal Global Services Limited Product.</p>
          <div className="flex gap-6">
            <Link href="/brand" className="hover:text-white transition-colors">Brand & Ownership</Link>
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
