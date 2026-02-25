/** @type {import('next').NextConfig} */

// 後端 URL：從 .env.local 讀取 BACKEND_URL，找不到時 fallback 到 8000
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

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
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
