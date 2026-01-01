import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../components/context/AuthContext'; // Import actual useAuth

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false); // New state for remember me
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // New loading state
  const router = useRouter();
  const { login } = useAuth(); // Use the actual login function from useAuth


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true); // Set loading to true
    try {
      await login(email, password, rememberMe); // Pass rememberMe state to login function
      // THE REDIRECT IS NOW HANDLED IN AuthContext
    } catch (err) {
      console.error('Login error:', err);
      setError((err as Error).message || 'An unexpected error occurred. Please try again.');
      setLoading(false); // Set loading to false on error
    }
    // No need to set loading to false on success, as the component will unmount
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-dark"> {/* Adapted background color */}
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md"> {/* Adapted card background color */}
        <div className="flex justify-center mb-6">
          <Image src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="App Logo" height={48} width={192} /> {/* Adapted logo */}
        </div>
        <h2 className="text-3xl font-bold text-white mb-8"> {/* Adapted text color */}
          Sign in to SentinelFi
        </h2>

        <form onSubmit={handleLogin}>
          {error && (
            <div className="bg-alert-critical/20 border border-alert-critical text-alert-critical px-4 py-3 rounded relative mb-4" role="alert"> {/* Adapted error styles */}
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2"> {/* Adapted label color */}
              Username/Email
            </label>
            <Input
              id="email"
              type="text" // Or 'email' depending on your backend
              placeholder="Enter your username or email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-brand-dark/50 border border-gray-700 rounded-lg text-white p-2" // Adapted input styles
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2"> {/* Adapted label color */}
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-brand-dark/50 border border-gray-700 rounded-lg text-white p-2" // Adapted input styles
            />
          </div>

          {/* Remember Me Checkbox */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-700 rounded bg-gray-700"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                Remember me
              </label>
            </div>
            <Link href="/forgot-password" className="text-brand-primary hover:underline text-sm"> {/* Moved link here for better layout */}
              Forgot Password?
            </Link>
          </div>

          <Button 
            type="submit" 
            className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </Button>

          <div className="mt-6 text-center text-sm">
            <p className="mt-2 text-gray-400"> {/* Adapted text color */}
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-brand-primary hover:underline"> {/* Adapted link color */}
                Register
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
