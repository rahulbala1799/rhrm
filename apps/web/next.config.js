/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable SWC minification (default in Next.js 14+)
  swcMinify: true,
  // Image optimization
  images: {
    domains: [],
  },
}

module.exports = nextConfig

