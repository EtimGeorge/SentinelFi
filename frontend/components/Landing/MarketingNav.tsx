import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MarketingNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '/#features' },
    { name: 'Workflows', href: '/landing/workflows' },
    { name: 'Success Stories', href: '/landing/testimonials' },
    { name: 'Pricing', href: '/landing/pricing' },
    { name: 'About', href: '/about' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 bg-brand-dark ${
      scrolled ? 'bg-opacity-90 backdrop-blur-xl border-b border-white/5 py-3' : 'bg-opacity-0 py-6'
    }`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-20 h-20 p-2 bg-brand-darker border border-white/10 rounded-xl group-hover:border-brand-primary/50 transition-all duration-500 shadow-2xl">
            <Image 
              src="/SentinelFi Logo Concept-bg-remv-logo-only.png" 
              alt="SentinelFi Logo" 
              fill
              className="object-contain p-1 group-hover:scale-110 transition-transform duration-500"
            />
            {/* Subtle Glow */}
            <div className="absolute inset-0 bg-brand-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-white uppercase font-sora active:text-white group-hover:tracking-normal transition-all duration-500">
            SENTINEL<span className="text-orange-500">FI</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              className={`nav-item-animated ${
                router.pathname === link.href ? 'text-white' : ''
              }`}
            >
              {link.name}
              {router.pathname === link.href && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-primary shadow-[0_0_15px_rgba(13,148,136,0.8)]" />
              )}
            </Link>
          ))}
        </div>

        {/* CTAs */}
        <div className="hidden lg:flex items-center gap-6">
          {user ? (
            <Link href="/dashboard" className="m-button-premium text-[10px] py-3 px-8">
              ENTER WORKSPACE <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link href="/landing/pricing" className="m-button-premium text-[10px] py-3 px-8">
                GET STARTED
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className="lg:hidden p-2 text-white hover:text-brand-primary transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden absolute top-full left-0 right-0 bg-brand-dark/95 backdrop-blur-2xl border-b border-white/5 transition-all duration-500 ease-in-out overflow-hidden ${
        isOpen ? 'max-h-[600px] opacity-100 py-8' : 'max-h-0 opacity-0 py-0'
      }`}>
        <div className="container mx-auto px-6 flex flex-col gap-8">
          {navLinks.map((link, idx) => (
            <Link 
              key={link.name} 
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="text-2xl font-black uppercase tracking-widest text-slate-300 hover:text-brand-primary transition-all flex items-center justify-between group"
              style={{ transitionDelay: `${idx * 50}ms` }}
            >
              <span className="font-sora">{link.name}</span>
              <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
            </Link>
          ))}
          <div className="h-px bg-white/5 w-full" />
          {user ? (
            <Link href="/dashboard" className="m-button-premium w-full text-center">
              ENTER WORKSPACE <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <div className="flex flex-col gap-6">
              <Link href="/login" className="text-center py-4 text-slate-300 font-black uppercase tracking-widest">Login</Link>
              <Link href="/landing/pricing" className="m-button-premium w-full text-center">GET STARTED</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default MarketingNav;
