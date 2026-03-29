// frontend/components/Layout/PublicLayout.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield } from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-gray-300">
      {/* Simple Header for Public Pages (Login, Register, etc.) */}
      <header className="bg-brand-dark/80 backdrop-blur-md border-b border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-20 h-20 p-2 bg-brand-darker border border-white/5 rounded-xl transition-all duration-500 overflow-hidden">
                <Image 
                  src="/SentinelFi Logo Concept-bg-remv-logo-only.png" 
                  alt="SentinelFi Logo" 
                  fill
                  className="object-contain p-1"
                />
              </div>
              <span className="text-xl font-black tracking-tighter text-white uppercase font-sora">
                SENTINEL<span className="text-orange-500">FI</span>
              </span>
            </Link>

            {/* Navigation - Minimal for Login/Register pages */}
            <nav className="flex items-center gap-6">
              {typeof window !== 'undefined' && window.location.pathname !== '/login' && (
                <Link 
                  href="/login" 
                  className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
                >
                  LOGIN
                </Link>
              )}
              <Link 
                href="/" 
                className="text-sm font-bold text-orange-500 hover:text-white transition-colors"
              >
                GO HOME
              </Link>
            </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-slate-300">
            <p>&copy; {new Date().getFullYear()} SentinelFi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;