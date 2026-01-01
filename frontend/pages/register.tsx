import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import api from '../lib/api'; // Import the API instance
import { useRouter } from 'next/router';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      // API call to register new user
      // The backend endpoint /auth/register needs to be implemented.
      // As per requirement, roles are assigned by Admin/IT lead.
      // So, this frontend will register with a default role (e.g., 'Assigned Project User').
      await api.post('/auth/register', { 
        email, 
        password,
        // Default role for self-registration. Admin can change later.
        // Role enum needs to be available client-side if we wanted to pick one.
        // For now, assume backend assigns a default for self-registration.
        // We will explicitly set this in the backend create endpoint.
        // The user also wants the role assigned by Admin/IT Lead, so we won't pass it here.
      });
      setMessage('Registration successful! Please log in with your new account.');
      router.push('/login?registered=true'); // Redirect to login page with a success flag
    } catch (err) {
      console.error('Registration error:', err);
      setError((err as any).response?.data?.message || 'Registration failed. Please try again.');
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
          Create Your SentinelFi Account
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

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-brand-dark/50 border border-gray-700 rounded-lg text-white p-2"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-400 mb-2">
              Confirm Password
            </label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-brand-dark/50 border border-gray-700 rounded-lg text-white p-2"
            />
          </div>

          <Button
            type="submit"
            className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </Button>

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-brand-primary hover:underline">
              Already have an account? Log In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
