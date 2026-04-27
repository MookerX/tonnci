/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用Turbopack以避免Prisma客户端缓存问题
  experimental: {
    turbo: {
      // 禁用Turbo
    },
  },
  // 设置编译选项
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
