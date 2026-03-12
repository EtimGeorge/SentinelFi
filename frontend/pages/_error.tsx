import React from 'react';
import { NextPageContext } from 'next';
import Link from 'next/link';
import { ShieldAlert, RefreshCcw } from 'lucide-react';
import PublicLayout from '../components/Layout/PublicLayout';

interface ErrorProps {
  statusCode?: number;
}

const ErrorPage = ({ statusCode }: ErrorProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark px-4 font-inter">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="w-24 h-24 mx-auto bg-red-900/20 rounded-full flex items-center justify-center border-2 border-red-500/50 animate-pulse">
          <ShieldAlert className="w-12 h-12 text-red-500" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            System Error {statusCode ? `(${statusCode})` : ''}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            A critical intercept occurred in the application rendering layer. This usually happens after a major code update that requires a clean build cache.
          </p>
        </div>

        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 text-left">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Recommended Action</h3>
          <p className="text-xs text-gray-300">
            Please try clearing your browser cache and refreshing. If you are the developer, run <code className="bg-gray-900 px-1 py-0.5 rounded text-brand-primary">npm run dev</code> after deleting the <code className="bg-gray-900 px-1 py-0.5 rounded text-brand-primary">.next</code> directory.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-5 h-5" /> Force Refresh
          </button>
          <Link href="/login" className="text-gray-500 hover:text-white text-sm transition-colors">
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

ErrorPage.getLayout = (page: React.ReactElement) => (
  <PublicLayout>{page}</PublicLayout>
);

export default ErrorPage;
