import React from 'react';
import MarketingLayout from '../../components/Landing/MarketingLayout';
import Link from 'next/link';
import { Shield, ChevronRight } from 'lucide-react';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using SentinelFi ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the Terms, you do not have permission to access the Platform. Your continued use of the Platform following changes to these Terms constitutes acceptance of those changes.`
  },
  {
    id: 'description',
    title: '2. Description of Service',
    content: `SentinelFi provides a multi-tenant, AI-augmented financial intelligence and digital project assurance platform. The Platform enables organizations ("Tenants") to enforce Work Breakdown Structure (WBS) governance, conduct AI-powered financial forensics, manage invoices, budgets, and track expenditure across complex capital projects. Each Tenant is provisioned a sovereign, isolated database schema to ensure data separation.`
  },
  {
    id: 'accounts',
    title: '3. User Accounts & Tenant Provisioning',
    content: `User accounts are provisioned exclusively by an authorized Tenant Administrator. Self-registration outside of an explicit invitation flow is not supported. You are responsible for maintaining the confidentiality of your credentials. You agree to immediately notify your Tenant Administrator of any unauthorized use of your account. SentinelFi bears no liability for losses arising from unauthorized access resulting from your failure to safeguard your credentials.`
  },
  {
    id: 'data-sovereignty',
    title: '4. Data Sovereignty & Isolation',
    content: `All Tenant data, including financial records, project structures, user information, and AI-generated analysis, is stored within an isolated PostgreSQL schema unique to your organization. SentinelFi's engineering team does not access Tenant data without explicit written authorization from the Tenant Account Owner, except as required for platform integrity, security incident response, or as required by law. Data is not co-mingled between Tenants under any circumstances.`
  },
  {
    id: 'acceptable-use',
    title: '5. Acceptable Use Policy',
    content: `You agree not to use the Platform to: (a) violate any applicable law or regulation; (b) transmit any data that is fraudulent, false, or misleading; (c) attempt to gain unauthorized access to other Tenants' data or systems; (d) introduce malware, viruses, or other harmful code; (e) use automated bots or scrapers against the Platform's API without written authorization; (f) re-sell or resemble access to the Platform without a formal white-label agreement.`
  },
  {
    id: 'payments',
    title: '6. Payments & Subscriptions',
    content: `Subscription fees are billed monthly or annually per your selected plan. All payments are processed through PCI-DSS compliant third-party gateways (Paystack for continental transactions, PayPal for international transactions). SentinelFi does not store payment card data. Subscription fees are non-refundable, except where required by applicable consumer protection law. Annual subscriptions are billed upfront and do not carry over if cancelled mid-term.`
  },
  {
    id: 'ai-limitations',
    title: '7. AI-Augmented Analysis Disclaimer',
    content: `SentinelFi's forensic intelligence features leverage machine learning models to detect anomalies, forecast risks, and flag discrepancies. This analysis is intended as a decision-support tool, not a substitute for qualified human judgment. AI-generated flags are probabilistic in nature. SentinelFi makes no warranty that AI analysis is free of error, complete, or appropriate for any specific legal or regulatory compliance requirement. You are solely responsible for decisions made based on AI-generated insights.`
  },
  {
    id: 'termination',
    title: '8. Termination',
    content: `Either party may terminate this agreement with 30 days' written notice. Upon termination, your Tenant schema will be archived for 90 days, during which you may request a data export. After 90 days, all Tenant data is permanently deleted. SentinelFi reserves the right to immediately suspend or terminate access for violation of the Acceptable Use Policy, non-payment, or court order without additional notice.`
  },
  {
    id: 'liability',
    title: '9. Limitation of Liability',
    content: `To the maximum extent permitted by law, SentinelFi shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising from your use of the Platform. SentinelFi's total aggregate liability to you for all claims shall not exceed the total fees paid by you in the 12 months preceding the claim.`
  },
  {
    id: 'governing-law',
    title: '10. Governing Law',
    content: `These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict of law principles. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the competent courts of Lagos State, Nigeria.`
  },
];

const TermsPage: React.FC = () => {
  return (
    <MarketingLayout title="Terms of Service | SentinelFi">
      <section className="py-28">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="mb-16">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
              <Link href="/" className="hover:text-brand-primary transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-300">Terms of Service</span>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl">
                <Shield className="w-8 h-8 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-primary">Legal Framework</p>
                <h1 className="text-4xl font-black text-white font-sora">Terms of Service</h1>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
              These Terms of Service govern your access to and use of the SentinelFi platform. Please read them carefully before proceeding.
            </p>
            <div className="mt-4 text-xs text-gray-600">
              Last updated: <span className="text-gray-400">March 2026</span> &nbsp;·&nbsp;
              Effective: <span className="text-gray-400">1 April 2026</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="glass-card p-6 mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Quick Navigation</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-brand-primary transition-colors py-1.5"
                >
                  <ChevronRight className="w-4 h-4 text-brand-primary shrink-0" />
                  {s.title}
                </a>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-12">
            {sections.map((section) => (
              <div key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-xl font-black text-white font-sora mb-4 pb-3 border-b border-white/5">
                  {section.title}
                </h2>
                <p className="text-gray-400 leading-relaxed text-sm">{section.content}</p>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="mt-20 p-8 bg-brand-primary/5 border border-brand-primary/20 rounded-[2rem] text-center">
            <p className="text-gray-400 text-sm mb-4">Questions about these Terms?</p>
            <Link href="/contact" className="inline-flex items-center gap-2 text-brand-primary font-black text-sm hover:underline">
              Contact our Legal Team <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default TermsPage;
