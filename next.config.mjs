/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Full type checking runs in CI (GitHub Actions with larger runners).
    // Local builds rely on editor TS and `npm run lint` for checking.
    ignoreBuildErrors: false,
  },

  // Vercel uses standalone output for optimal cold starts
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rpbjravqgflidnwjkgvc.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Increase memory for builds on constrained environments
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
