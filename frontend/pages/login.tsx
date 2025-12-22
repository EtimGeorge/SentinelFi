import React, { useState } from 'react';
import { useAuth } from '../components/context/AuthContext';
import Head from 'next/head';
import Logo from '../components/common/Logo'; // <-- New Import

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // NOTE: Password is 'P@ssw0rd' for all seeded users
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setLoading(false);
    }
    // Success redirect is handled inside AuthContext.tsx
  };

  return (
    <>
      <Head>
        <title>SentinelFi | Secure Login</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          
          <div className="flex flex-col items-center mb-8">
            {/* LOGO FIX: Use the Centralized Logo Component (lg size) */}
            <Logo size="lg" className="mb-4" /> 
            
            <h1 className="text-3xl font-bold text-brand-dark">SentinelFi</h1>
            <p className="text-sm text-gray-500 mt-1">Real-Time Control. Proactive Precision.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition duration-150 ease-in-out"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default LoginPage;