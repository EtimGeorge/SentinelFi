import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import api from '../lib/api'; // Import the API instance

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false); // New state to manage UI after email sent

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      // API call to request password reset
      // The backend endpoint /auth/forgot-password-request needs to be implemented.
      // It should send a password reset email if the user exists.
      await api.post('/auth/forgot-password-request', { email });
      setMessage('If your email is registered with SentinelFi, a password reset link has been sent to your inbox. Please check your email.');
      setEmailSent(true);
    } catch (err) {
      console.error('Forgot password request error:', err);
      // Backend should ideally return a generic success message even if email not found
      // to prevent user enumeration. If backend sends specific error, handle it.
      setError('Failed to send password reset request. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-dark">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="App Logo" height={48} width={192} />
        </div>
        <h2 className="text-3xl font-bold text-white mb-8">
          Forgot Your Password?
        </h2>

        <form onSubmit={handleSubmit}>
          {message && (
            <div className="bg-blue-600/20 border border-blue-500 text-blue-300 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{message}</span>
            </div>
          )}
          {error && (
            <div className="bg-alert-critical/20 border border-alert-critical text-alert-critical px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {!emailSent ? ( // Only show email input if email hasn't been sent
            <>
              <p className="text-gray-400 mb-6 text-sm">
                Enter your email address below and we'll send you a link to reset your password.
              </p>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-brand-dark/50 border border-gray-700 rounded-lg text-white p-2"
                />
              </div>

              <Button
                type="submit"
                className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white"
                disabled={loading}
              >
                {loading ? 'Sending Request...' : 'Send Reset Link'}
              </Button>
            </>
          ) : (
            <p className="text-green-400 text-center mb-4">
              Please check your email for the reset link.
            </p>
          )}

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-brand-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
