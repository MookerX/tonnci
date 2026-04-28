// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 用户登录API
// 描述: 用户登录认证
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  successResponse, 
  badRequestResponse, 
  unauthorizedResponse,
  serverErrorResponse 
} from '@/lib/response';
import { loginSchema } from '@/lib/validators';
import { jwtTokenManager, verifyPassword } from '@/lib/auth/jwt';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';

/**
 * POST /api/auth/login
 * 用户登录
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析登录参数
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse('参数验证失败: ' + validationResult.error.issues.map(e => e.message).join(', '));
    }

    const { username, password } = validationResult.data;
    const clientIp = getClientIp(request);

    // 2. 查询用户
    const user = await prisma.user.findUnique({
      where: { username, isDelete: false },
    });

    // 3. 验证用户存在
    if (!user) {
      try {
        await operationLog.log({
          moduleName: '认证模块',
          businessType: '登录',
          operationDesc: `登录失败: 用户不存在 (${username})`,
          ipAddress: clientIp,
          status: 'fail',
        });
      } catch {}
      return unauthorizedResponse('用户名或密码错误');
    }

    // 3.1 查询部门信息
    let deptInfo = null;
    if (user.deptId) {
      try {
        const dept = await prisma.dept.findUnique({ where: { id: user.deptId } });
        if (dept) deptInfo = { id: dept.id, deptName: dept.deptName };
      } catch {}
    }

    // 4. 验证账号状态
    if (user.status !== 'active') {
      try {
        await operationLog.log({
          moduleName: '认证模块',
          businessType: '登录',
          operatorId: user.id,
          operatorName: user.username,
          operationDesc: '登录失败: 账号已禁用',
          ipAddress: clientIp,
          status: 'fail',
        });
      } catch {}
      return unauthorizedResponse('账号已被禁用');
    }

    // 5. 验证密码
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      try {
        await operationLog.log({
          moduleName: '认证模块',
          businessType: '登录',
          operatorId: user.id,
          operatorName: user.username,
          operationDesc: '登录失败: 密码错误',
          ipAddress: clientIp,
          status: 'fail',
        });
      } catch {}
      return unauthorizedResponse('用户名或密码错误');
    }

    // 6. 解析用户角色
    let parsedRoleIds: string[] = [];
    let parsedRoleIdsInt: number[] = [];
    if (user.roleIds) {
      const raw = String(user.roleIds);
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          parsedRoleIds = arr.map(String);
          parsedRoleIdsInt = arr.map(Number).filter(n => !isNaN(n));
        } else {
          parsedRoleIds = [String(arr)];
          parsedRoleIdsInt = [Number(arr)].filter(n => !isNaN(n));
        }
      } catch {
        parsedRoleIds = raw.split(',').filter(Boolean);
        parsedRoleIdsInt = raw.split(',').map(Number).filter(n => !isNaN(n));
      }
    }

    // 7. 查询用户权限（用于嵌入 JWT）
    // 按角色分别查询，兼容超级管理员（role无记录=拥有全部权限）
    const permSet = new Set<string>();
    let hasEmptyRole = false;
    for (const roleId of parsedRoleIdsInt) {
      const records = await prisma.rolePermission.findMany({
        where: { roleId, isDelete: false, permission: { not: null } },
        select: { permission: true },
      });
      if (records.length === 0) {
        hasEmptyRole = true;
      } else {
        for (const r of records) {
          if (r.permission) permSet.add(r.permission);
        }
      }
    }
    // 如果任一角色没有任何权限记录，说明该角色拥有全部权限（通配符 *）
    let permissions: string[];
    if (hasEmptyRole) {
      permissions = ['*'];
    } else {
      permissions = Array.from(permSet);
    }

    // 收集每个角色的 dataScope
    const dataScopesSet = new Set<string>();
    for (const roleId of parsedRoleIdsInt) {
      const roleRecord = await prisma.role.findUnique({
        where: { id: roleId, isDelete: false },
        select: { dataScope: true },
      });
      if (roleRecord?.dataScope) {
        dataScopesSet.add(roleRecord.dataScope);
      }
    }
    const dataScopes = Array.from(dataScopesSet);

    // 8. 生成JWT令牌（嵌入 permissions 和 dataScopes 字段）
    const token = jwtTokenManager.generateAccessToken({
      sub: String(user.id),
      uuid: user.uuid || String(user.id),
      username: user.username,
      roles: parsedRoleIds,
      permissions,
      dataScopes,
      deptId: user.deptId || undefined,
      userType: user.userType || 'internal',
    });

    // 9. 更新登录信息
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), loginIp: clientIp },
      });
    } catch {}

    // 10. 记录操作日志
    try {
      await operationLog.log({
        moduleName: '认证模块',
        businessType: '登录',
        operatorId: user.id,
        operatorName: user.username,
        operationDesc: '用户登录成功',
        ipAddress: clientIp,
        status: 'success',
      });
    } catch {}

    // 11. 返回成功响应
    return successResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        deptId: user.deptId,
        dept: deptInfo,
        roles: parsedRoleIds,
        permissions,
        dataScopes,
        userType: user.userType || 'internal',
      },
    });
  } catch (error: any) {
    console.error('登录异常:', error);
    return serverErrorResponse('登录失败: ' + error.message);
  }
}
