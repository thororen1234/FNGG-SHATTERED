/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: '100mb',
    },
  }
};

export default nextConfig;
