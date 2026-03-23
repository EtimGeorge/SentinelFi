import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MarketingNav from './MarketingNav';
import { Shield } from 'lucide-react';

interface MarketingLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const MarketingLayout: React.FC<MarketingLayoutProps> = ({ 
  children, 
  title = "SentinelFi | Digital Project Assurance", 
  description = "The industry standard for multi-tenant project finance, automated auditing, and absolute financial transparency."
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

      <main className="relative pt-20">
        {children}
      </main>

      <footer className="bg-m-dark border-t border-white/5 py-16">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-m-primary/20 rounded-lg">
                <Shield className="w-6 h-6 text-m-primary" />
              </div>
              <span className="text-2xl font-bold m-heading">SentinelFi</span>
            </div>
            <p className="text-m-text-muted max-w-sm leading-relaxed">
              Eliminating financial ambiguity through automated WBS governance, 
              AI-driven intelligence, and absolute multi-tenant sovereignty.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6 m-heading uppercase tracking-widest text-xs">Ecosystem</h4>
            <ul className="space-y-4 text-sm text-m-text-muted">
              <li><Link href="/landing/features" className="hover:text-m-primary transition-colors">Features</Link></li>
              <li><Link href="/landing/workflows" className="hover:text-m-primary transition-colors">Workflows</Link></li>
              <li><Link href="/landing/pricing" className="hover:text-m-primary transition-colors">Pricing</Link></li>
              <li><Link href="/landing/testimonials" className="hover:text-m-primary transition-colors">Success Stories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 m-heading uppercase tracking-widest text-xs">Platform</h4>
            <ul className="space-y-4 text-sm text-m-text-muted">
              <li><Link href="/about" className="hover:text-m-primary transition-colors">About Us</Link></li>
              <li><Link href="/training" className="hover:text-m-primary transition-colors">Training</Link></li>
              <li><Link href="/contact" className="hover:text-m-primary transition-colors">Contact</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-m-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="container mx-auto px-6 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-m-text-muted font-mono uppercase tracking-tighter">
          <p>© 2026 SentinelFi Technology Operations. All Rights Reserved.</p>
          <div className="flex gap-6">
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
