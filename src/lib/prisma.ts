// =============================================================================
// 腾曦生产管理系统 - Prisma数据库客户端
// 描述: Prisma ORM初始化与配置，支持从配置文件读取数据库连接
// 
// 重要: Prisma 客户端在模块加载时就会读取环境变量 DATABASE_URL
// 我们需要在这里动态设置环境变量
// =============================================================================

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 配置文件路径
const CONFIG_FILE = path.join(process.cwd(), '.config', 'system.enc');

// 加密配置
function getEncryptionKey(): string {
  const secret = process.env.JWT_SECRET || 'tengxi-default-secret-key-change-in-production';
  return crypto.createHash('sha256').update(secret).digest('hex').slice(0, 32);
}

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

// 在模块加载时，从配置文件读取数据库URL并设置环境变量
// 这必须在 PrismaClient 实例化之前执行
function initDatabaseUrl(): void {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      console.log('[Prisma] 配置文件不存在，使用 .env 中的 DATABASE_URL');
      return;
    }

    const encryptedData = fs.readFileSync(CONFIG_FILE, 'utf8').trim();
    const decryptedData = decryptConfig(encryptedData);
    if (!decryptedData) {
      console.log('[Prisma] 配置文件解密失败，使用 .env 中的 DATABASE_URL');
      return;
    }

    const config = JSON.parse(decryptedData);
    if (!config.database) {
      console.log('[Prisma] 配置文件缺少数据库配置，使用 .env 中的 DATABASE_URL');
      return;
    }

    const { host, port, username, password, name } = config.database;
    const dbUrl = `mysql://${username}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
    
    // 设置环境变量
    process.env.DATABASE_URL = dbUrl;
    console.log(`[Prisma] 已从配置文件加载数据库连接: ${host}:${port}/${name}`);
    console.log(`[Prisma] DATABASE_URL = ${dbUrl}`);
  } catch (error) {
    console.error('[Prisma] 初始化数据库URL失败:', error);
  }
}

// 在模块加载时执行
initDatabaseUrl();

// 全局Prisma客户端实例
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 创建 Prisma 客户端，尝试使用 datasources 选项覆盖
const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'] as const,
};

// 如果环境变量已经设置（通过 initDatabaseUrl），使用 datasources 覆盖
if (process.env.DATABASE_URL) {
  (prismaClientOptions as any).datasources = {
    db: {
      url: process.env.DATABASE_URL,
    },
  };
  console.log('[Prisma] 使用 datasources.db.url 覆盖');
}

// 导出单例模式的Prisma客户端
export const prisma = globalThis.prisma ?? new PrismaClient(prismaClientOptions);

// 在开发环境中，将客户端保存到全局变量以避免热重载时重复创建
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
