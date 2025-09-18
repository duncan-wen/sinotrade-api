/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 允許跨域開發存取
  allowedDevOrigins: ['192.168.0.5', '192.168.0.*', '10.0.0.*', '172.16.0.*'],
  // 代理 API 請求到後端服務器
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ]
  },
}

export default nextConfig
