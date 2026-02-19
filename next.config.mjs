/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Full type checking runs in CI (GitHub Actions with larger runners).
    // Local builds rely on editor TS and `npm run lint` for checking.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
