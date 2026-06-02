/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  serverExternalPackages: ['puppeteer-core', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth', 'sharp'],
};

export default nextConfig;
