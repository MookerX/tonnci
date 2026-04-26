/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用Turbopack，使用传统的webpack
  experimental: {
    // 不使用turbopack
  },
  // 确保使用webpack
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
