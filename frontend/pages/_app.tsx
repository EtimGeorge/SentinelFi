import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css'; // <-- Import global CSS for Tailwind
import { AuthProvider } from '../components/context/AuthContext'; // <-- Auth Provider to be created next

function SentinelFiApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>SentinelFi - WBS Financial Control</title>
        <meta name="description" content="SentinelFi: Real-Time Control. Proactive Precision." />
        <link rel="icon" href="/SentinelFi Logo Concept-bg-remv-logo-only.png" />
      </Head>
      
      {/* CRITICAL: Wrap the entire application in the AuthProvider */}
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </>
  );
}

export default SentinelFiApp;
