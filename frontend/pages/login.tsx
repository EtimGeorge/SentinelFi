// frontend/pages/login.tsx
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';

// Custom components
import { useAuth, AuthLogger, Role } from '../components/context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Eye, EyeOff, Shield, ShieldCheck } from 'lucide-react';

// ============================================================================
// MFA VERIFICATION COMPONENT (NOT YET IMPLEMENTED)
// ============================================================================

/* 
interface MFAVerificationProps {
  mfaToken: string;
  onBack: () => void;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({ mfaToken, onBack }) => {
  // TODO: Implement verifyMFA in AuthContext first
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      // const result = await verifyMFA(code, mfaToken);
      setError('MFA not yet implemented');
    } catch (err) {
      setError('An unexpected error occurred');
      AuthLogger.error('[Login] MFA verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Two-Factor Authentication</h2>
        <p className="mt-2 text-sm text-gray-400">
          Enter the verification code from your authenticator app
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-300">
            Verification Code
          </label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-center text-2xl tracking-widest bg-gray-700 text-white placeholder-gray-500"
            placeholder="000000"
            required
            autoFocus
          />
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-3 flex items-start space-x-3">
              <svg className="h-5 w-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="text-sm font-medium flex-1">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isVerifying || code.length !== 6}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isVerifying ? 'Verifying...' : 'Verify Code'}
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Back to login
        </button>
      </form>
    </div>
  );
};
*/

// ============================================================================
// LOGIN COMPONENT
// ============================================================================

import PublicLayout from '../components/Layout/PublicLayout'; // Import PublicLayout
import { NextPageWithLayout } from './_app'; // Import NextPageWithLayout
import { ReactElement } from 'react'; // Import ReactElement

enum LoginMode {
  SUPER_ADMIN = 'super',
  TENANT = 'tenant',
}

const LoginPage: NextPageWithLayout = () => { // Change to const and use NextPageWithLayout
  const router = useRouter();
  const { login, isAuthenticated, error: authContextError, isLoading: authContextLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tenantId: '',
    rememberMe: false,
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>(LoginMode.TENANT);

  // Use useEffect to clear local error when AuthContext error changes
  useEffect(() => {
    if (authContextError) {
      setError(authContextError.message);
    } else {
      setError('');
    }
  }, [authContextError]);

  // ============================================================================
  // HANDLE LOGIN MODE SWITCH
  // ============================================================================
  const handleModeSwitch = (mode: LoginMode) => {
    setLoginMode(mode);
    setFormData(prev => ({
      ...prev,
      tenantId: mode === LoginMode.SUPER_ADMIN ? '' : prev.tenantId, // Clear tenantId for SuperAdmin
    }));
    setError(''); // Clear any errors on mode switch
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous local errors
    setIsSubmitting(true);

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      setIsSubmitting(false);
      return;
    }
    if (loginMode === LoginMode.TENANT && !formData.tenantId) {
      setError('Please enter your Tenant ID.');
      setIsSubmitting(false);
      return;
    }

    try {
      AuthLogger.info(`Attempting ${loginMode} login for: ${formData.email}`);

      // Convert loginMode to Role
      const role = loginMode === LoginMode.SUPER_ADMIN ? Role.SuperAdmin : Role.AdminDirector;

      // FIXED: Call login with individual parameters, not an object
      await login(formData.email.trim(), formData.password, role);

      // Success case: AuthContext handles navigation automatically after state update.
      // No explicit router.push here.
      AuthLogger.success('[Login] Login successful - AuthContext will handle navigation');

    } catch (err: any) {
      AuthLogger.error('[Login] Unexpected error during login:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER MFA SCREEN (Not yet implemented)
  // ============================================================================

  /*
  if (mfaToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark px-4">
        <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8">
          <MFAVerification 
            mfaToken={mfaToken} 
            onBack={() => {
              setMfaToken(null);
              setFormData({ ...formData, password: '' }); // Clear password on back
            }} 
          />
        </div>
      </div>
    );
  }
  */


  // ============================================================================
  // RENDER LOGIN FORM
  // ============================================================================

  return (

    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">

      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl overflow-hidden">

        {/* Header */}

        <div className="p-8 text-center border-b border-gray-700">

          <div className="flex justify-center mb-6">
            <div className="relative w-40 h-40">
              <Image src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="App Logo" fill className="object-contain p-0.5" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter font-sora">
            SENTINEL<span className="text-orange-500">FI</span>
          </h1>

          <p className="text-sm text-gray-400">Financial Intelligence Platform</p>

        </div>

        {/* BACKEND STATUS WARNING */}
        {authContextError && (
          <div className="bg-yellow-600/20 border-b border-yellow-600/50 p-3 flex items-center justify-center gap-2 text-yellow-500 text-xs font-bold animate-pulse">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            BACKEND CONNECTIVITY ISSUES DETECTED
          </div>
        )}



        {/* Mode Switcher */}

        <div className="flex p-4 bg-gray-700">

          <Button

            type="button"

            onClick={() => handleModeSwitch(LoginMode.TENANT)}

            disabled={isSubmitting || authContextLoading}

            className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${loginMode === LoginMode.TENANT ? 'bg-brand-primary text-white shadow-md' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'

              } ${(isSubmitting || authContextLoading) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}

          >

            Tenant Login

          </Button>

          <Button

            type="button"

            onClick={() => handleModeSwitch(LoginMode.SUPER_ADMIN)}

            disabled={isSubmitting || authContextLoading}

            className={`ml-2 flex-1 py-3 text-sm font-medium rounded-lg transition-all ${loginMode === LoginMode.SUPER_ADMIN ? 'bg-brand-primary text-white shadow-md' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'

              } ${(isSubmitting || authContextLoading) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}

          >

            Super Admin

          </Button>

        </div>



        {/* Form */}

        <form onSubmit={handleSubmit} className="p-8">

          {error && (

            <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6 flex items-start space-x-3">

              <svg className="h-5 w-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>

              </svg>

              <p className="text-sm font-medium flex-1">{error}</p>

            </div>

          )}



          {loginMode === LoginMode.TENANT && (

            <div className="mb-5">

              <label htmlFor="tenantId" className="block text-sm font-medium text-gray-300 mb-2">

                Tenant ID

              </label>

              <Input

                id="tenantId"

                type="text"

                value={formData.tenantId}

                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}

                disabled={isSubmitting || authContextLoading}

                placeholder="Enter your tenant ID"

                required

                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"

              />

            </div>

          )}



          <div className="mb-5">

            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email or Username
            </label>

            <Input

              id="email"

              type="text"

              value={formData.email}

              onChange={(e) => setFormData({ ...formData, email: e.target.value })}

              disabled={isSubmitting || authContextLoading}

              placeholder={loginMode === LoginMode.SUPER_ADMIN ? 'superadmin@sentinelfi.com or super_admin' : 'email@example.com or username'}

              required

              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"

            />

          </div>



          <div className="mb-6">

            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">

              Password

            </label>

            <Input

              id="password"

              type={showPassword ? 'text' : 'password'}

              value={formData.password}

              onChange={(e) => setFormData({ ...formData, password: e.target.value })}

              disabled={isSubmitting || authContextLoading}

              placeholder="••••••••"

              required

              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"

              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-white transition-colors focus:outline-none pr-2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
            />

          </div>



          {/* Remember Me Checkbox and Forgot Password */}

          <div className="mb-6 flex items-center justify-between">

            <div className="flex items-center">

              <input

                id="remember-me"

                name="remember-me"

                type="checkbox"

                className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-600 rounded bg-gray-700"

                checked={formData.rememberMe}

                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}

              />

              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">

                Remember me

              </label>

            </div>

            <Link href="/forgot-password" className="text-brand-primary hover:underline text-sm">

              Forgot Password?

            </Link>

          </div>



          {/* Submit Button */}

          <Button

            type="submit"

            disabled={isSubmitting || authContextLoading}

            className={`w-full py-3 text-base font-semibold rounded-lg transition-colors ${(isSubmitting || authContextLoading) ? 'bg-brand-primary-light cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-primary-dark'

              }`}

          >

            {(isSubmitting || authContextLoading) ? (

              <span className="flex items-center justify-center">

                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">

                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>

                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>

                </svg>

                Signing in...

              </span>

            ) : (

              `Sign in as ${loginMode === LoginMode.SUPER_ADMIN ? 'Super Admin' : 'Tenant User'}`

            )}

          </Button>



          {/* Register Link Disabled for Invite-Only */}
          <div className="mt-8 pt-6 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Access is restricted to authorized personnel.
            </p>
          </div>

        </form>



        {/* Footer */}

        <div className="p-5 bg-gray-700 border-t border-gray-600 text-center">

          <p className="text-xs text-gray-400">

            © 2026 SentinelFi. All rights reserved.

          </p>

        </div>

      </div>

    </div>

  );

}



LoginPage.getLayout = function getLayout(page: ReactElement) {

  return <PublicLayout>{page}</PublicLayout>;

};



export default LoginPage;

