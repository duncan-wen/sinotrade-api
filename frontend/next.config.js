import { withGluestackUI } from '@gluestack/ui-next-adapter';
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': 'react-native-web',
    };
    return config;
  },
};

export default withGluestackUI(nextConfig);
