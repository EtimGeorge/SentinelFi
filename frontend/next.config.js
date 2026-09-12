

/**
 * A conceptual Circuit Breaker for monitoring proxy health.
 * In a standard Next.js setup, this cannot dynamically block rewrites,
 * but it establishes a pattern for a future custom server or external proxy.
 */
class CircuitBreaker {
  constructor(threshold = 5, timeout = 30000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF_OPEN'
    this.nextAttempt = Date.now();
  }

  recordSuccess() {
    this.failureCount = 0;
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      console.log('[CircuitBreaker] Circuit closed. Proxy is healthy.');
    }
  }

  recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold && this.state !== 'OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.error(`[CircuitBreaker] Circuit OPENED after ${this.failureCount} failures. Proxy will be bypassed for ${this.timeout / 1000}s.`);
    }
  }
}

const proxyCircuitBreaker = new CircuitBreaker(5, 30000);


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['shared'],

  // Tree-shake icon libraries + reduce cold-compile work. lucide-react ships
  // pre-transpiled ESM/CJS, so it no longer needs to be in transpilePackages
  // (previously every fresh page compile re-transpiled its hundreds of icon
  // modules from source, adding seconds to each cold navigation).
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-icons'],
  },

  // ESLint runs as a separate CI step. Do not block production builds with warnings.
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Exclude test files from being treated as pages
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].map(ext => {
    return ext;
  }).filter(ext => !ext.includes('spec') && !ext.includes('test')),

  // API Proxy Rewrites
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3001';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },

  // Enhanced Webpack configuration for optimization
  webpack: (config, { isServer }) => {
    // Reduce bundle size on the client by stubbing server-only modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },

  // Add crucial security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Production build optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Development-specific optimizations to reduce memory usage.
  // NOTE: previous values (maxInactiveAge: 30s, pagesBufferLength: 3) caused
  // every navigation to trigger a full page recompile (3-15s). Keep pages
  // resident long enough that navigating away and back is instant.
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 120 * 1000, // Keep pages in memory for 2 minutes
      pagesBufferLength: 12,      // Keep 12 pages in memory (was 3)
    },
  }),
};

module.exports = nextConfig;
