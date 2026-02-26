/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/dashboard',
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
