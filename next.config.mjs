import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour Docker/Coolify
  output: "standalone",
  
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // Désactiver ESLint en production pour éviter les erreurs
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimisations production
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Configuration pour Docker
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

export default withNextIntl(nextConfig);
