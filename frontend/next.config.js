import { withGluestackUI } from '@gluestack/ui-next-adapter'
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [],
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
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': 'react-native-web',
    }
    return config
  },
}

export default withGluestackUI(nextConfig)
