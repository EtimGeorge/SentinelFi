import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Menu, X, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MARKETING_NAV_LINKS, MARKETING_ACTIONS } from './marketingContent';
import { trackMarketingEvent } from './marketingAnalytics';

// Spacing system (NN/g + Stripe Atlas + Linear/Vercel synthesis):
// menu gutters gap-7 (28px) at lg, action group gap-3 (12px),
// hamburger is mobile-only (below lg); desktop keeps the full header.
const MarketingNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const close = () => setIsOpen(false);
    router.events.on('routeChangeStart', close);
    return () => router.events.off('routeChangeStart', close);
  }, [router.events]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (href: string) =>
    router.pathname === href || (href !== '/' && router.pathname.startsWith(href));

  // Header CTA instrumentation — same event bus as the hero so trial-vs-tour
  // can be compared per headline variant in one place.
  const trackHeaderCta = (cta: string, destination: string) => () => {
    trackMarketingEvent('marketing.cta_click', { cta, destination });
  };

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
      scrolled ? 'border-white/10 bg-brand-dark/90 shadow-elev-md backdrop-blur-xl' : 'border-transparent bg-brand-dark/60 backdrop-blur-md'
    }`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-brand-dark">
        Skip to content
      </a>
      <nav aria-label="Primary" className={`mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 transition-all duration-300 lg:px-6 ${scrolled ? 'h-16' : 'h-[72px]'}`}>
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2.5" aria-label="SentinelFi home">
          <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-brand-darker p-1 transition-colors group-hover:border-brand-primary/50">
            <Image src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="" fill sizes="40px" className="object-contain" priority />
          </span>
          <span className="hidden min-w-0 flex-col leading-none min-[400px]:flex">
            <span className="text-lg font-black uppercase text-white">Sentinel<span className="text-orange-500">Fi</span></span>
            <span className="hidden text-xs font-semibold normal-case text-slate-400 xl:block">Capital assurance platform</span>
          </span>
        </Link>

        <ul className="hidden min-w-0 flex-1 items-center justify-center gap-4 px-2 lg:flex xl:gap-7" role="list">
          {MARKETING_NAV_LINKS.map((link) => (
            <li key={link.href} className="shrink-0">
              <Link href={link.href} aria-current={isActive(link.href) ? 'page' : undefined} title={link.description} className={`nav-item-animated whitespace-nowrap lg:text-[0.72rem] xl:text-[0.8rem] ${isActive(link.href) ? 'is-active' : ''}`}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden shrink-0 items-center gap-2 lg:flex xl:gap-3">
          {user ? (
            <Link href={MARKETING_ACTIONS.workspace.href} onClick={trackHeaderCta('header-workspace', MARKETING_ACTIONS.workspace.href)} data-cta="header-workspace" className="m-button-primary m-button-sm">
              {MARKETING_ACTIONS.workspace.label} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <>
              <Link href={MARKETING_ACTIONS.signIn.href} onClick={trackHeaderCta('header-signin', MARKETING_ACTIONS.signIn.href)} data-cta="header-signin" className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-sm font-semibold text-slate-300 transition-colors hover:text-white xl:px-3">
                <LogIn className="h-4 w-4" aria-hidden />{MARKETING_ACTIONS.signIn.label}
              </Link>
              <span className="hidden h-5 w-px bg-white/10 lg:block xl:block" aria-hidden />
              <Link href={MARKETING_ACTIONS.tertiary.href} onClick={trackHeaderCta('header-talk', MARKETING_ACTIONS.tertiary.href)} data-cta="header-talk" className="inline-flex min-h-[40px] items-center whitespace-nowrap rounded-md px-1.5 text-sm font-semibold text-slate-300 transition-colors hover:text-white xl:px-3">
                {MARKETING_ACTIONS.tertiary.label}
              </Link>
              <Link href={MARKETING_ACTIONS.primary.href} onClick={trackHeaderCta('header-start-trial', MARKETING_ACTIONS.primary.href)} data-cta="header-start-trial" className="m-button-primary m-button-sm">
                {MARKETING_ACTIONS.primary.label} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </>
          )}
        </div>

        <button type="button" className="tap-target inline-flex h-11 w-11 items-center justify-center rounded-md text-white transition-colors hover:text-brand-primary lg:hidden" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-controls="marketing-mobile-menu" aria-label={isOpen ? 'Close menu' : 'Open menu'}>
          {isOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </nav>

      <div id="marketing-mobile-menu" className={`overflow-hidden border-t border-white/5 bg-brand-dark/95 backdrop-blur-2xl transition-all duration-300 lg:hidden ${isOpen ? 'max-h-[80vh] overflow-y-auto opacity-100' : 'max-h-0 opacity-0'}`}>
        <nav aria-label="Mobile" className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-6">
          {MARKETING_NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} aria-current={isActive(link.href) ? 'page' : undefined} className={`flex min-h-[48px] items-center justify-between rounded-lg px-3 text-base font-bold transition-colors ${isActive(link.href) ? 'bg-white/5 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
              <span>{link.label}<span className="mt-0.5 block text-xs font-normal text-slate-500">{link.description}</span></span>
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            </Link>
          ))}
          <div className="my-4 h-px w-full bg-white/5" />
          {user ? (
            <Link href={MARKETING_ACTIONS.workspace.href} onClick={trackHeaderCta('mobile-workspace', MARKETING_ACTIONS.workspace.href)} data-cta="mobile-workspace" className="m-button-primary w-full justify-center">
              {MARKETING_ACTIONS.workspace.label} <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          ) : (
            <div className="flex flex-col gap-3">
              <Link href={MARKETING_ACTIONS.primary.href} onClick={trackHeaderCta('mobile-start-trial', MARKETING_ACTIONS.primary.href)} data-cta="mobile-start-trial" className="m-button-primary w-full justify-center">
                {MARKETING_ACTIONS.primary.label} <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link href={MARKETING_ACTIONS.signIn.href} onClick={trackHeaderCta('mobile-signin', MARKETING_ACTIONS.signIn.href)} data-cta="mobile-signin" className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-white/10 text-sm font-bold uppercase text-slate-300">{MARKETING_ACTIONS.signIn.label}</Link>
                <Link href={MARKETING_ACTIONS.tertiary.href} onClick={trackHeaderCta('mobile-talk', MARKETING_ACTIONS.tertiary.href)} data-cta="mobile-talk" className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-white/10 text-sm font-bold uppercase text-slate-300">{MARKETING_ACTIONS.tertiary.label}</Link>
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default MarketingNav;
