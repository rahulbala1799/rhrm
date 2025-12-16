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
}

module.exports = nextConfig

