/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [],
  },
  // Fix for Supabase ESM imports
  experimental: {
    esmExternals: 'loose',
  },
  // Allow build to continue even if error pages fail
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip static generation for error pages
  output: 'standalone',
}

module.exports = nextConfig
