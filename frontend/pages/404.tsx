import React from 'react';
import Link from 'next/link';
import { AlertCircle, Home, LogIn } from 'lucide-react';
import PublicLayout from '../components/Layout/PublicLayout';

import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const Custom404: NextPageWithLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto bg-brand-primary/10 rounded-full flex items-center justify-center border-2 border-brand-primary/30">
          <AlertCircle className="w-12 h-12 text-brand-primary" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">404</h1>
          <h2 className="text-xl font-semibold text-gray-300">Page Not Found</h2>
          <p className="text-gray-400 text-sm">
            The coordinates you provided do not correspond to any known asset in the platform.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/" className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2">
            <Home className="w-5 h-5" /> Return to Command Center
          </Link>
          <Link href="/login" className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2">
            <LogIn className="w-5 h-5" /> Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

Custom404.getLayout = (page: React.ReactElement) => (
  <PublicLayout>{page}</PublicLayout>
);

export default Custom404;
