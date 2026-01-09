/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // New monorepo configuration
  transpilePackages: ['shared'],
  // CRITICAL FIX: Add rewrites to proxy API requests to the backend for local development.
  // This explicitly directs /api/v1 calls to the local backend server, overriding any defaults.
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3001/api/v1/:path*', // Explicitly target localhost
      },
    ]
  },
}

module.exports = nextConfig