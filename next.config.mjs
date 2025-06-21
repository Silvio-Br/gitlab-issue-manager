/** @type {import('next').NextConfig} */
const nextConfig = {
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
