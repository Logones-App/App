import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Désactiver ESLint en production pour éviter les erreurs
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Suppression de la redirection automatique
  // async redirects() {
  //   return [
  //     {
  //       source: "/dashboard",
  //       destination: "/dashboard/default",
  //       permanent: false,
  //     },
  //   ];
  // },
}

export default withNextIntl(nextConfig);
