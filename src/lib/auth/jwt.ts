// =============================================================================
// 腾曦生产管理系统 - JWT认证工具
// 描述: JWT Token生成、验证、解析
// =============================================================================

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getJwtSecret, getJwtExpiresIn } from '../config/env';

// =============================================================================
// JWT负载数据类型
// =============================================================================

export interface JwtPayload {
  sub: string;        // 用户ID
  uuid: string;       // 用户UUID
  username: string;   // 用户名
  roles: string[];    // 角色列表
  permissions?: string[]; // 权限列表（* 表示全部权限）
  deptId?: number;    // 部门ID
  userType: string;   // 用户类型: internal, customer
  iat?: number;       // 签发时间
  exp?: number;       // 过期时间
}

// =============================================================================
// JWT Token管理类
// =============================================================================

export class JwtTokenManager {
  private secret: string;
  private expiresIn: number;

  constructor() {
    this.secret = getJwtSecret();
    this.expiresIn = getJwtExpiresIn();
  }

  /**
   * 生成访问令牌
   */
  generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: 'tengxi-production-system',
    });
  }

  /**
   * 生成刷新令牌
   */
  generateRefreshToken(userId: string): string {
    return jwt.sign(
      { sub: userId, type: 'refresh', jti: uuidv4() },
      this.secret,
      { expiresIn: this.expiresIn * 7 } // 刷新令牌7天有效期
    );
  }

  /**
   * 验证并解析Token
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as JwtPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析Token（不验证）
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * 检查Token是否过期
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  }

  /**
   * 获取Token剩余有效时间（秒）
   */
  getTokenRemainingTime(token: string): number {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return 0;
    const remaining = decoded.exp * 1000 - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }
}

// 导出单例
export const jwtTokenManager = new JwtTokenManager();

// =============================================================================
// 密码加密工具
// =============================================================================

const SALT_ROUNDS = 10;

/**
 * 密码加密
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 密码验证
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 生成随机密码
 */
export function generateRandomPassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// =============================================================================
// Token提取工具
// =============================================================================

/**
 * 从请求头提取Token
 */
export function extractTokenFromHeader(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * 从Cookie提取Token
 */
export function extractTokenFromCookie(cookieHeader?: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'access_token') {
      return value;
    }
  }
  
  return null;
}

/**
 * 从请求提取Token（优先Header，其次Cookie）
 */
export function extractToken(request: Request): string | null {
  // 尝试从Header获取
  const authHeader = request.headers.get('Authorization');
  let token = extractTokenFromHeader(authHeader);
  
  if (token) return token;
  
  // 尝试从Cookie获取
  const cookieHeader = request.headers.get('Cookie');
  token = extractTokenFromCookie(cookieHeader);
  
  return token;
}

export default jwtTokenManager;
