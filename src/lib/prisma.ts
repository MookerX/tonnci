// =============================================================================
// 腾曦生产管理系统 - Prisma数据库客户端
// 描述: Prisma ORM初始化与配置，支持从配置文件读取数据库连接
// 
// 重要: Prisma 客户端在模块加载时就会读取环境变量 DATABASE_URL
// 我们需要在运行时动态读取配置文件
// =============================================================================

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 配置文件路径
const CONFIG_FILE = path.join(process.cwd(), '.config', 'system.enc');

// 加密密钥
function getEncryptionKey(): string {
  const secret = process.env.JWT_SECRET || 'tengxi-default-secret-key-change-in-production';
  return crypto.createHash('sha256').update(secret).digest('hex').slice(0, 32);
}

/**
 * 解密配置文件
 */
function decryptConfig(ciphertext: string): string | null {
  try {
    const key = Buffer.from(getEncryptionKey(), 'utf8');
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return null;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * 获取数据库连接URL（每次都重新读取配置文件）
 */
export function getDatabaseUrl(): string | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }

    const encryptedData = fs.readFileSync(CONFIG_FILE, 'utf8').trim();
    const decryptedData = decryptConfig(encryptedData);
    if (!decryptedData) {
      return null;
    }

    const config = JSON.parse(decryptedData);
    if (!config.database) {
      return null;
    }

    const { host, port, username, password, name } = config.database;
    // 使用 encodeURIComponent 对密码进行 URL 编码
    return `mysql://${username}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
  } catch {
    return null;
  }
}

/**
 * 创建 Prisma 客户端实例
 */
function createPrismaClient(): PrismaClient {
  const dbUrl = getDatabaseUrl();
  let host = '', port = '', name = '';
  
  // 解析数据库信息用于日志
  if (dbUrl) {
    const match = dbUrl.match(/mysql:\/\/[^:]+:[^@]+@([^:]+):(\d+)\/([^?]+)/);
    if (match) {
      [, host, port, name] = match;
    }
  }
  
  const options: any = {
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
  };
  
  // 如果有配置文件中的数据库URL，使用它
  if (dbUrl) {
    options.datasources = {
      db: {
        url: dbUrl,
      },
    };
    console.log(`[Prisma] 使用配置数据库: ${host}:${port}/${name}`);
  }
  
  return new PrismaClient(options);
}

// 缓存当前配置的md5，用于检测配置变化
let lastConfigMd5: string | null = null;
let cachedPrisma: PrismaClient | null = null;

/**
 * 获取 Prisma 客户端实例
 * - 如果配置文件发生变化，自动重新创建客户端
 */
export function getPrisma(): PrismaClient {
  // 计算当前配置的 md5
  let currentMd5: string | null = null;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8').trim();
      const crypto = require('crypto');
      currentMd5 = crypto.createHash('md5').update(content).digest('hex');
    }
  } catch {}

  // 检查配置是否变化
  if (cachedPrisma && currentMd5 && lastConfigMd5 === currentMd5) {
    return cachedPrisma;
  }

  // 配置变化了，关闭旧连接
  if (cachedPrisma) {
    console.log('[Prisma] 配置已更新，重新创建数据库连接...');
    cachedPrisma.$disconnect().catch(() => {});
  }

  // 创建新客户端
  cachedPrisma = createPrismaClient();
  lastConfigMd5 = currentMd5;
  
  // 开发环境下保存到全局变量
  if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = cachedPrisma;
  }
  
  return cachedPrisma;
}

// 全局Prisma客户端实例
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 导出便捷的 prisma 实例（兼容旧代码）
// 使用 Proxy 在每次属性访问时获取最新的客户端
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = client[prop as keyof PrismaClient];
    // 如果是函数，绑定到当前客户端实例
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
