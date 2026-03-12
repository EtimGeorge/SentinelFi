import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  BarChart2,
  TrendingUp,
  PieChart,
  FileText,
  ChevronRight,
  Activity,
  Shield,
  LayoutDashboard,
  Zap,
  Lock
} from 'lucide-react';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';

const ReportingIndexPage: React.FC = () => {
  const modules = [
    {
      title: 'Variance Intelligence',
      subtitle: 'Fiscal Deviation Analysis',
      description: 'Advanced monitoring of budgeted vs actual expenditures with AI anomaly detection.',
      icon: BarChart2,
      path: '/reporting/variance',
      color: 'from-blue-600 to-indigo-600',
      badge: 'Real-time'
    },
    {
      title: 'CAPEX Performance',
      subtitle: 'Capital Asset Utilization',
      description: 'Deep insights into project budgets, WBS rollout progress, and capital efficiency.',
      icon: TrendingUp,
      path: '/reporting/capex',
      color: 'from-emerald-500 to-teal-600',
      badge: 'Audit-ready'
    },
    {
      title: 'OPEX Efficiency',
      subtitle: 'Operational Burn Rates',
      description: 'Professional oversight of departmental spending and cost-center optimization.',
      icon: PieChart,
      path: '/reporting/opex',
      color: 'from-amber-500 to-orange-600',
      badge: 'Compliance'
    },
    {
      title: 'Digital Archive',
      subtitle: 'DCS Vault & Integrity',
      description: 'Access the Document Control System for cryptographically secured report history.',
      icon: FileText,
      path: '/reporting/archive',
      color: 'from-rose-500 to-pink-600',
      badge: 'Secured'
    }
  ];

  return (
    <>
      <Head><title>Reporting Intelligence Hub | SentinelFi</title></Head>
      <PageContainer
        title="Reporting Intelligence Hub"
        subtitle="Enterprise-grade analytics and document control for superior fiscal governance."
        headerContent={<LayoutDashboard className="w-8 h-8 text-brand-primary" />}
      >
        <div className="space-y-12">
          {/* Hero Section */}
          <section className="relative p-10 bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 blur-[100px] -mr-48 -mt-48 rounded-full" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl space-y-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full w-fit">
                  <Zap className="w-3 h-3 text-brand-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Engine Active</span>
                </div>
                <h1 className="text-4xl font-black text-white leading-tight uppercase tracking-tighter">
                  One Source of <span className="text-brand-primary">Truth</span>
                </h1>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Welcome to the SentinelFi Reporting Engine. Every report generated is automatically indexed, hashed, and synchronized with your dedicated Document Control System.
                </p>
              </div>
              <Activity className="w-32 h-32 text-brand-primary opacity-20" />
            </div>
          </section>

          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {modules.map((module) => (
              <Link key={module.title} href={module.path}>
                <div className="group relative bg-slate-950/40 backdrop-blur-xl border border-slate-800 hover:border-brand-primary/50 p-8 rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden transform hover:-translate-y-2 hover:shadow-2xl">
                  {/* Decorative Gradient */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${module.color} opacity-5 blur-3xl group-hover:opacity-20 transition-opacity`} />

                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className={`p-4 bg-gradient-to-br ${module.color} rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform duration-500`}>
                        <module.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {module.badge}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">{module.subtitle}</div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{module.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{module.description}</p>
                    </div>

                    <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                      Access Intelligence <ChevronRight className="w-4 h-4 text-brand-primary" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Trust Footer */}
          <div className="p-8 bg-slate-900/40 backdrop-blur-md rounded-[2rem] border border-slate-800 flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
              <Lock className="w-8 h-8 text-brand-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-white font-bold uppercase tracking-tight flex items-center gap-2">
                DCS Compliance Active <Shield className="w-4 h-4 text-positive" />
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Enterprise protocol enforced. All exports are recorded with permanent audit IDs and stored in the secure vault for regulatory transparency.
              </p>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ReportingIndexPage;
