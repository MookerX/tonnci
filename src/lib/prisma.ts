// =============================================================================
// 腾曦生产管理系统 - Prisma数据库客户端
// 描述: Prisma ORM初始化与配置 (Prisma 7.x)
// =============================================================================

import { PrismaClient } from '@prisma/client';

// 全局Prisma客户端实例
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 创建Prisma客户端实例
function createPrismaClient(): PrismaClient {
  // Prisma 7.x 使用标准方式初始化
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
  });
}

// 导出单例模式的Prisma客户端
export const prisma = globalThis.prisma ?? createPrismaClient();

// 在开发环境中，将客户端保存到全局变量以避免热重载时重复创建
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
