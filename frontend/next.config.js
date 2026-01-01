/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CRITICAL FIX: Add rewrites to proxy API requests to the backend (on port 3000)
  async rewrites() {
    return [
      {
        // This makes all /api/v1 calls go to the local backend
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:3001/api/v1/:path*', // Use 127.0.0.1 for maximum local compatibility
      },
    ]
  },
}

module.exports = nextConfig