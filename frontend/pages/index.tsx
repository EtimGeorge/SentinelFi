import Head from 'next/head';
import React from 'react';

/**
 * The Root Page (/) serves only as a redirector.
 * The actual redirection logic is now centralized in the AuthProvider.
 * This page just provides a fallback UI during the brief moment of redirection.
 */
const IndexPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>SentinelFi</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-brand-dark">
        <div className="text-xl text-white">Redirecting...</div>
      </div>
    </>
  );
};

export default IndexPage;
