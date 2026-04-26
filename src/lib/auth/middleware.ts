// =============================================================================
// 腾曦生产管理系统 - 认证与授权中间件
// 描述: JWT认证拦截、RBAC权限验证
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtTokenManager, extractToken, JwtPayload } from './jwt';
import { unauthorizedResponse, forbiddenResponse } from '../response';

// =============================================================================
// 认证上下文
// =============================================================================

export interface AuthContext {
  userId: number;
  userUuid: string;
  username: string;
  roles: string[];
  deptId: number | null;
  userType: string;
  permissions: string[];
}

// =============================================================================
// 白名单路由（不需要认证）
// =============================================================================

const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/system/init/check',
  '/api/system/init/setup',
  '/api/public/',
];

const PUBLIC_PATTERNS = [
  /^\/api\/auth\//,
  /^\/api\/system\/init\//,
  /^\/api\/public\//,
];

// =============================================================================
// 认证检查函数
// =============================================================================

/**
 * 检查路由是否在白名单中
 */
function isPublicRoute(path: string): boolean {
  // 精确匹配
  if (PUBLIC_ROUTES.includes(path)) {
    return true;
  }
  
  // 模式匹配
  for (const pattern of PUBLIC_PATTERNS) {
    if (pattern.test(path)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 获取当前用户权限列表
 */
async function getUserPermissions(roleIds: number[]): Promise<string[]> {
  if (!roleIds.length) return [];
  
  const permissions = await prisma.permission.findMany({
    where: {
      isDelete: false,
      status: 'active',
      rolePermissions: {
        some: {
          roleId: { in: roleIds },
        },
      },
    },
    select: {
      permissionCode: true,
    },
  });
  
  return permissions.map(p => p.permissionCode);
}

/**
 * 验证用户状态
 */
async function validateUserStatus(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDelete: false },
    select: { status: true, isFirstLogin: true },
  });
  
  if (!user) return false;
  if (user.status === 'disabled') return false;
  if (user.status === 'locked') return false;
  
  return true;
}

/**
 * 获取认证上下文
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const token = extractToken(request);
  
  if (!token) {
    return null;
  }
  
  const payload = jwtTokenManager.verifyToken(token);
  
  if (!payload) {
    return null;
  }
  
  // 验证用户状态
  const isValid = await validateUserStatus(parseInt(payload.sub));
  
  if (!isValid) {
    return null;
  }
  
  // 获取用户权限
  const roleIds = payload.roles.map(r => parseInt(r)).filter(id => !isNaN(id));
  const permissions = await getUserPermissions(roleIds);
  
  return {
    userId: parseInt(payload.sub),
    userUuid: payload.uuid,
    username: payload.username,
    roles: payload.roles,
    deptId: payload.deptId || null,
    userType: payload.userType,
    permissions,
  };
}

/**
 * 要求认证中间件
 * 如果未认证则返回401
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext | NextResponse> {
  // 白名单检查
  if (isPublicRoute(request.url)) {
    return null as any;
  }
  
  const authContext = await getAuthContext(request);
  
  if (!authContext) {
    return unauthorizedResponse('请先登录');
  }
  
  return authContext;
}

/**
 * 要求特定权限
 */
export function requirePermission(permissionCode: string) {
  return async (request: NextRequest): Promise<AuthContext | NextResponse> => {
    const authContext = await requireAuth(request);
    
    if (authContext instanceof NextResponse) {
      return authContext;
    }
    
    // 管理员拥有所有权限
    if (authContext.roles.includes('admin') || authContext.roles.includes('super_admin')) {
      return authContext;
    }
    
    if (!authContext.permissions.includes(permissionCode)) {
      return forbiddenResponse('无此操作权限');
    }
    
    return authContext;
  };
}

/**
 * 要求特定角色
 */
export function requireRole(...roles: string[]) {
  return async (request: NextRequest): Promise<AuthContext | NextResponse> => {
    const authContext = await requireAuth(request);
    
    if (authContext instanceof NextResponse) {
      return authContext;
    }
    
    // 管理员拥有所有角色权限
    if (authContext.roles.includes('admin') || authContext.roles.includes('super_admin')) {
      return authContext;
    }
    
    const hasRole = roles.some(role => authContext.roles.includes(role));
    
    if (!hasRole) {
      return forbiddenResponse('无此角色权限');
    }
    
    return authContext;
  };
}

/**
 * 要求客户用户
 */
export async function requireCustomerUser(request: NextRequest): Promise<AuthContext | NextResponse> {
  const authContext = await requireAuth(request);
  
  if (authContext instanceof NextResponse) {
    return authContext;
  }
  
  if (authContext.userType !== 'customer') {
    return forbiddenResponse('仅限客户账号访问');
  }
  
  return authContext;
}

/**
 * 要求内部用户
 */
export async function requireInternalUser(request: NextRequest): Promise<AuthContext | NextResponse> {
  const authContext = await requireAuth(request);
  
  if (authContext instanceof NextResponse) {
    return authContext;
  }
  
  if (authContext.userType !== 'internal') {
    return forbiddenResponse('仅限内部账号访问');
  }
  
  return authContext;
}

// =============================================================================
// 便捷的请求处理函数
// =============================================================================

/**
 * 获取当前登录用户ID
 */
export async function getCurrentUserId(request: NextRequest): Promise<number | null> {
  const authContext = await getAuthContext(request);
  return authContext?.userId || null;
}

/**
 * 获取当前登录用户信息
 */
export async function getCurrentUser(request: NextRequest) {
  const authContext = await getAuthContext(request);
  
  if (!authContext) {
    return null;
  }
  
  return prisma.user.findUnique({
    where: { id: authContext.userId, isDelete: false },
    select: {
      id: true,
      uuid: true,
      username: true,
      realName: true,
      email: true,
      phone: true,
      avatar: true,
      deptId: true,
      roleIds: true,
      userType: true,
      customerId: true,
    },
  });
}

export default {
  getAuthContext,
  requireAuth,
  requirePermission,
  requireRole,
  requireCustomerUser,
  requireInternalUser,
  getCurrentUserId,
  getCurrentUser,
};
