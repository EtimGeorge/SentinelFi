import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, Role } from '../components/context/AuthContext';
import Head from 'next/head';

/**
 * The Root Page (/) serves only as a redirector based on authentication status.
 */
const IndexPage: React.FC = () => {
  const { isAuthenticated, user, isInitialLoad } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication state has been checked
    if (isInitialLoad) return;

    if (!isAuthenticated) {
      // Unauthenticated users go to the login page
      router.replace('/login');
      return;
    }

    // Authenticated users are routed based on their primary role (as per the PRD/UX)
    if (user) {
      if (user.role === Role.CEO || user.role === Role.Finance || user.role === Role.Admin || user.role === Role.ITHead) {
        router.replace('/dashboard/ceo'); // Executive Dashboard
      } else if (user.role === Role.AssignedProjectUser) {
        // Direct the Assigned Project User to the primary write operation interface
        router.replace('/expense/tracker');
      } else {
        // Fallback for other authenticated roles
        router.replace('/dashboard/home');
      }
    }
  }, [isAuthenticated, user, isInitialLoad, router]);

  return (
    <>
      <Head>
        <title>SentinelFi</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-brand-dark">Redirecting to SentinelFi Dashboard...</div>
      </div>
    </>
  );
};

export default IndexPage;
