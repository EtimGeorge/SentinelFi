import React from 'react';
import MarketingLayout from '../../components/Landing/MarketingLayout';
import Link from 'next/link';
import { Lock, ChevronRight, Shield, Database, Eye } from 'lucide-react';

const highlights = [
  { icon: <Shield className="w-6 h-6" />, title: 'Sovereign Schema Isolation', desc: 'Your data is stored in an isolated PostgreSQL schema. No cross-tenant data access is architecturally possible.' },
  { icon: <Lock className="w-6 h-6" />, title: 'Zero Payment Card Storage', desc: 'Payment credentials never touch SentinelFi servers. All transactions are handled by PCI-DSS certified gateways.' },
  { icon: <Database className="w-6 h-6" />, title: 'No Data Selling', desc: `We do not sell, rent, or trade your personal or organizational data to any third party for commercial purposes.` },
  { icon: <Eye className="w-6 h-6" />, title: 'Minimal Data Collection', desc: 'We collect only what is strictly necessary to provide the Platform\'s services. Telemetry is opt-in for authenticated users.' },
];

const sections = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `SentinelFi ("we", "us", "our") respects the privacy of your personal and organizational data. This Privacy Policy explains how we collect, use, disclose, and protect information obtained through the SentinelFi platform. By using the Platform, you consent to the practices described in this policy.`
  },
  {
    id: 'data-collected',
    title: '2. Data We Collect',
    content: `We collect the following categories of data:
    
• Identity Data: Name, email address, professional role, and organizational affiliation provided during account provisioning.
• Usage Data: Log files, session tokens, API request metadata, and feature interaction data (anonymized where possible) used for platform diagnostics and security monitoring.
• Financial & Project Data: Work breakdown structures, budget entries, invoice records, and expenditure logs that are explicitly submitted by Tenant users. This data belongs to your organization.
• Device & Browser Data: IP addresses, browser type, and operating system version, collected for security auditing.
• AI Interaction Data: Prompts and responses submitted to the SentinelFi AI assistant. This data remains within your Tenant schema and is not used to train shared AI models without explicit consent.`
  },
  {
    id: 'data-use',
    title: '3. How We Use Your Data',
    content: `Your data is used solely to operate and improve the SentinelFi platform. Specific uses include: (a) provisioning and managing your Tenant account; (b) processing subscription payments via third-party gateways; (c) generating AI-powered financial analysis for your organization's exclusive use; (d) detecting security incidents and preventing unauthorized access; (e) sending platform-critical notifications (never marketing without explicit opt-in); (f) complying with legal obligations.`
  },
  {
    id: 'data-sharing',
    title: '4. Data Sharing & Third Parties',
    content: `We do not sell your data. We share data only with: (a) Payment processors (Paystack, PayPal) who independently govern their processing under their respective privacy policies; (b) Infrastructure providers (cloud hosting, CDN) who are bound by strict data processing agreements; (c) Law enforcement or regulatory authorities when required by valid legal process. We contractually require all third parties to implement appropriate technical and organizational safeguards.`
  },
  {
    id: 'data-retention',
    title: '5. Data Retention',
    content: `Operational Tenant data is retained for the duration of your active subscription. Upon termination, data is archived for 90 days to facilitate export requests, after which it is permanently and irrecoverably deleted. Anonymized aggregate usage statistics may be retained indefinitely for product improvement purposes. Log data for security auditing is retained for 12 months.`
  },
  {
    id: 'your-rights',
    title: '6. Your Rights',
    content: `Depending on your jurisdiction, you may have the right to: access, rectify, or erase your personal data; restrict or object to certain processing; request data portability in a machine-readable format; withdraw consent for any processing based on consent. To exercise these rights, contact your Tenant Administrator or reach us directly at privacy@sentinelfi.com. We will respond within 30 days.`
  },
  {
    id: 'security',
    title: '7. Security Measures',
    content: `We implement industry-standard security measures including TLS 1.3 in transit, AES-256 at rest, schema-level row separation for multi-tenancy, JWT with short-lived access tokens, and automated anomaly detection on login patterns. We conduct periodic penetration testing and maintain an internal security incident response plan. Despite these measures, no system is 100% secure; we encourage you to use strong, unique passwords.`
  },
  {
    id: 'cookies',
    title: '8. Cookies & Tracking',
    content: `We use strictly necessary cookies for session management and CSRF protection. We do not use third-party advertising cookies, tracking pixels, or retargeting technology. Authenticated users may opt into anonymized product telemetry to help us improve the platform. This telemetry never includes financial or project data.`
  },
  {
    id: 'changes',
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy periodically. Material changes will be communicated via email to the Tenant Account Owner at least 14 days before taking effect. Continued use of the Platform after the effective date constitutes acceptance of the updated policy.`
  },
];

const PrivacyPage: React.FC = () => {
  return (
    <MarketingLayout title="Privacy Policy | SentinelFi">
      <section className="py-28">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="mb-16">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
              <Link href="/" className="hover:text-brand-primary transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-300">Privacy Policy</span>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl">
                <Lock className="w-8 h-8 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-primary">Data Governance</p>
                <h1 className="text-4xl font-black text-white font-sora">Privacy Policy</h1>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
              SentinelFi is built on the principle that your organizational data is sovereign. This policy explains how we protect that sovereignty.
            </p>
            <div className="mt-4 text-xs text-gray-600">
              Last updated: <span className="text-gray-400">March 2026</span> &nbsp;·&nbsp;
              Effective: <span className="text-gray-400">1 April 2026</span>
            </div>
          </div>

          {/* Privacy Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
            {highlights.map((h) => (
              <div key={h.title} className="glass-card p-6 flex items-start gap-4">
                <div className="text-brand-primary shrink-0 mt-1">{h.icon}</div>
                <div>
                  <p className="font-black text-white text-sm mb-1">{h.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-12">
            {sections.map((section) => (
              <div key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-xl font-black text-white font-sora mb-4 pb-3 border-b border-white/5">
                  {section.title}
                </h2>
                <p className="text-gray-400 leading-relaxed text-sm whitespace-pre-line">{section.content}</p>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="mt-20 p-8 bg-brand-primary/5 border border-brand-primary/20 rounded-[2rem] text-center">
            <p className="text-gray-400 text-sm mb-4">Privacy questions or data requests?</p>
            <a href="mailto:privacy@sentinelfi.com" className="inline-flex items-center gap-2 text-brand-primary font-black text-sm hover:underline">
              privacy@sentinelfi.com <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default PrivacyPage;
