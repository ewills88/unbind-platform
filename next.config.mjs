/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type checking runs in CI (GitHub Actions). Build skips TS errors to prevent
    // strict-mode blocking on Supabase client generics and response types.
    ignoreBuildErrors: true,
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
