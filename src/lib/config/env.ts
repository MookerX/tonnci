// =============================================================================
// 腾曦生产管理系统 - 环境配置
// 描述: 运行时环境变量配置
// =============================================================================

/**
 * 获取数据库连接URL
 * 优先使用环境变量，否则使用默认配置
 */
export function getDatabaseUrl(): string {
  // 优先使用配置的数据库URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // 从数据库配置构建URL
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const database = process.env.DB_NAME || 'tengxi_production';
  const username = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  
  return `mysql://${username}:${password}@${host}:${port}/${database}?schema=public`;
}

/**
 * 获取JWT密钥
 */
export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'tengxi-production-system-secret-key-2024';
}

/**
 * 获取JWT过期时间（秒）
 */
export function getJwtExpiresIn(): number {
  return parseInt(process.env.JWT_EXPIRES_IN || '86400', 10); // 默认24小时
}

/**
 * 获取文件存储路径
 */
export function getStoragePath(): string {
  return process.env.STORAGE_PATH || '/workspace/projects/storage';
}

/**
 * 获取NAS配置列表
 */
export function getNasConfigs(): Array<{
  id: number;
  host: string;
  port: number;
  username: string;
  password: string;
  sharePath: string;
}> {
  // 从环境变量解析NAS配置
  const nasConfigStr = process.env.NAS_CONFIGS;
  if (nasConfigStr) {
    try {
      return JSON.parse(nasConfigStr);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * 获取系统初始化状态
 */
export function isSystemInitialized(): boolean {
  return process.env.SYSTEM_INITIALIZED === 'true';
}

/**
 * 获取CORS配置
 */
export function getCorsOrigins(): string[] {
  const origins = process.env.CORS_ORIGINS;
  if (origins) {
    return origins.split(',');
  }
  return ['*'];
}

/**
 * 获取日志级别
 */
export function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  return (process.env.LOG_LEVEL as any) || 'info';
}

/**
 * 获取当前环境
 */
export function getNodeEnv(): 'development' | 'production' | 'test' {
  return (process.env.NODE_ENV as any) || 'development';
}

/**
 * 是否开发环境
 */
export function isDevelopment(): boolean {
  return getNodeEnv() === 'development';
}

/**
 * 是否生产环境
 */
export function isProduction(): boolean {
  return getNodeEnv() === 'production';
}
