import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import PublicLayout from '../components/Layout/PublicLayout';

import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const Custom500: NextPageWithLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto bg-alert-warning/10 rounded-full flex items-center justify-center border-2 border-alert-warning/30">
          <AlertTriangle className="w-12 h-12 text-alert-warning" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">500</h1>
          <h2 className="text-xl font-semibold text-gray-300">Something Went Wrong</h2>
          <p className="text-gray-400 text-sm">
            A server-side fault interrupted this operation. The error has been logged — retry,
            and if it persists contact your workspace administrator.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" /> Retry
          </button>
          <Link href="/" className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2">
            <Home className="w-5 h-5" /> Return to Command Center
          </Link>
        </div>
      </div>
    </div>
  );
};

Custom500.getLayout = (page: React.ReactElement) => (
  <PublicLayout>{page}</PublicLayout>
);

export default Custom500;
