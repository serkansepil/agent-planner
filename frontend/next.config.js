/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API base URL configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',
  },
}

module.exports = nextConfig
