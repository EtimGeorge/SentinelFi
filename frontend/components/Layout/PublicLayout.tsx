// frontend/components/Layout/PublicLayout.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Assuming Image component is used for logo

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-gray-300">
      {/* Simple Header for Public Pages */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Image src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="App Logo" height={32} width={120} />
              <span className="text-xl font-bold text-white hidden sm:block">SentinelFi</span>
            </Link>

            {/* Navigation (simplified for public layout) */}
            <nav className="flex items-center gap-4">
              <Link 
                href="/login" 
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/80 transition-colors"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} SentinelFi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;