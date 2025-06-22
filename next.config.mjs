/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
