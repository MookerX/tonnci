// =============================================================================
// 腾曦生产管理系统 - 配置文件管理模块
// 描述: 加密存储系统配置文件（非公开目录，外网不可访问）
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 配置文件目录（项目根目录下的非公开目录）
const CONFIG_DIR = path.join(process.cwd(), '.config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'system.enc');

// 加密密钥（使用环境变量中的JWT_SECRET或生成随机密钥）
function getEncryptionKey(): string {
  const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'tengxi-default-secret-key-change-in-production';
  // 使用 SHA-256 生成32字节密钥
  return crypto.createHash('sha256').update(secret).digest('hex').slice(0, 32);
}

// 加密算法参数
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * 加密数据
 */
function encrypt(plaintext: string): string {
  const key = Buffer.from(getEncryptionKey(), 'utf8');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // 格式: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 解密数据
 */
function decrypt(ciphertext: string): string {
  try {
    const key = Buffer.from(getEncryptionKey(), 'utf8');
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt configuration data');
  }
}

/**
 * 系统配置接口
 */
export interface SystemConfig {
  // 数据库配置
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
  };
  // 存储配置
  storage: {
    type: 'local' | 'nas' | 'oss';
    path: string;
    // NAS配置
    nasHost?: string;
    nasPort?: number;
    nasUsername?: string;
    nasPassword?: string;
    // OSS配置
    endpoint?: string;
    bucket?: string;
    accessKey?: string;
    secretKey?: string;
  };
  // 系统配置
  system: {
    name: string;
    initialized: boolean;
    initializedAt?: string;
    adminInfo?: {
      username: string;
      realName?: string;
    };
  };
}

/**
 * 默认配置
 */
export function getDefaultConfig(): SystemConfig {
  return {
    database: {
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: '',
      name: 'tengxi_pms',
    },
    storage: {
      type: 'local',
      path: path.join(process.cwd(), 'storage'),
    },
    system: {
      name: '腾曦生产管理系统',
      initialized: false,
    },
  };
}

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * 读取配置文件
 */
export function readConfig(): SystemConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }

    const encryptedData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const decryptedData = decrypt(encryptedData);
    return JSON.parse(decryptedData) as SystemConfig;
  } catch (error) {
    console.error('Failed to read config file:', error);
    return null;
  }
}

/**
 * 写入配置文件
 */
export function writeConfig(config: SystemConfig): boolean {
  try {
    ensureConfigDir();
    const jsonData = JSON.stringify(config, null, 2);
    const encryptedData = encrypt(jsonData);
    fs.writeFileSync(CONFIG_FILE, encryptedData, 'utf8');
    // 设置文件权限为仅所有者可读写
    fs.chmodSync(CONFIG_FILE, 0o600);
    return true;
  } catch (error) {
    console.error('Failed to write config file:', error);
    return false;
  }
}

/**
 * 检查配置是否存在
 */
export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}

/**
 * 更新部分配置
 */
export function updateConfig(partial: Partial<SystemConfig>): boolean {
  const current = readConfig();
  if (!current) {
    return false;
  }

  const updated: SystemConfig = {
    database: { ...current.database, ...partial.database },
    storage: { ...current.storage, ...partial.storage },
    system: { ...current.system, ...partial.system },
  };

  return writeConfig(updated);
}

/**
 * 标记系统已初始化
 * @param adminInfo 管理员信息（可选）
 */
export function markAsInitialized(adminInfo?: { username: string; realName?: string }): boolean {
  const current = readConfig();
  const currentSystem = current?.system || { name: '腾曦生产管理系统', initialized: false };
  return updateConfig({
    system: {
      ...currentSystem,
      initialized: true,
      initializedAt: new Date().toISOString(),
      adminInfo: adminInfo ? {
        username: adminInfo.username,
        realName: adminInfo.realName,
      } : currentSystem.adminInfo,
    },
  });
}

/**
 * 删除配置文件（用于重置系统）
 */
export function deleteConfig(): boolean {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
    return true;
  } catch (error) {
    console.error('Failed to delete config file:', error);
    return false;
  }
}

/**
 * 生成数据库连接URL
 */
export function getDatabaseUrl(): string | null {
  const config = readConfig();
  if (!config) return null;

  const { host, port, username, password, name } = config.database;
  return `mysql://${username}:${password}@${host}:${port}/${name}`;
}
