// =============================================================================
// 腾曦生产管理系统 - 密码管理API
// 描述: 修改密码、重置密码
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  successResponse, 
  badRequestResponse, 
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse 
} from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { hashPassword, verifyPassword, generateRandomPassword } from '@/lib/auth/jwt';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';
import { z } from 'zod';

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少6位').max(32, '新密码最多32位'),
});

const resetPasswordSchema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(6, '密码至少6位').max(32, '密码最多32位').optional(),
});

const batchResetPasswordSchema = z.object({
  userIds: z.array(z.number().int().positive()).min(1),
  newPassword: z.string().min(6).max(32).optional(),
});

// =============================================================================
// 修改当前用户密码
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const auth = authResult;
    const clientIp = getClientIp(request);

    // 解析请求参数
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = changePasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse('参数验证失败');
    }

    const { oldPassword, newPassword } = validationResult.data;

    // 获取用户
    const user = await prisma.user.findUnique({
      where: { id: auth.userId, isDelete: false },
      select: { password: true, username: true, realName: true },
    });

    if (!user) {
      return notFoundResponse('用户不存在');
    }

    // 验证原密码
    const isValid = await verifyPassword(oldPassword, user.password);
    if (!isValid) {
      return badRequestResponse('原密码错误');
    }

    // 新密码不能与原密码相同
    const isSame = await verifyPassword(newPassword, user.password);
    if (isSame) {
      return badRequestResponse('新密码不能与原密码相同');
    }

    // 更新密码
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: auth.userId },
      data: {
        password: hashedPassword,
        modifiedBy: auth.userId,
      },
    });

    // 记录日志
    await operationLog.log({
      moduleName: '用户管理',
      businessType: 'update',
      operatorId: auth.userId,
      operatorName: auth.username,
      operationDesc: '修改密码',
      ipAddress: clientIp,
      status: 'success',
    });

    return successResponse(null, '密码修改成功');

  } catch (err) {
    console.error('Change password error:', err);
    const msg = err instanceof Error ? err.message : '修改密码失败';
    return serverErrorResponse(msg);
  }
}

// =============================================================================
// 重置用户密码（管理员）
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const auth = authResult;
    const clientIp = getClientIp(request);

    // 解析请求参数
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    // 批量重置密码
    if (body.userIds) {
      const validationResult = batchResetPasswordSchema.safeParse(body);
      if (!validationResult.success) {
        return badRequestResponse('参数验证失败');
      }

      const { userIds, newPassword } = validationResult.data;

      // 检查是否有权限
      if (!auth.roles.includes('admin') && !auth.roles.includes('super_admin')) {
        return forbiddenResponse('只有管理员可以重置密码');
      }

      const password = newPassword || generateRandomPassword(8);
      const hashedPassword = await hashPassword(password);

      await prisma.user.updateMany({
        where: { id: { in: userIds }, isDelete: false },
        data: {
          password: hashedPassword,
          loginFailCount: 0,
          status: 'active',
          modifiedBy: auth.userId,
        },
      });

      await operationLog.log({
        moduleName: '用户管理',
        businessType: 'permission',
        operatorId: auth.userId,
        operatorName: auth.username,
        operationDesc: '批量重置密码',
        requestParams: { userIds, count: userIds.length },
        ipAddress: clientIp,
        status: 'success',
      });

      return successResponse({ 
        count: userIds.length,
        password, // 仅在批量重置时返回明文密码
      }, `成功重置 ${userIds.length} 个用户密码`);
    }

    // 单个重置
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse('参数验证失败');
    }

    const { userId, newPassword } = validationResult.data;

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId, isDelete: false },
      select: { id: true, username: true, realName: true },
    });

    if (!targetUser) {
      return notFoundResponse('用户不存在');
    }

    // 生成密码
    const password = newPassword || generateRandomPassword(8);
    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        loginFailCount: 0,
        status: 'active',
        modifiedBy: auth.userId,
      },
    });

    // 记录日志
    await operationLog.logPermissionChange(
      auth.userId,
      auth.username,
      targetUser.id,
      targetUser.username,
      'reset_password',
      [],
      ['password_changed'],
      clientIp
    );

    return successResponse({ 
      userId: targetUser.id,
      username: targetUser.username,
      newPassword: password, // 仅返回明文密码一次
    }, '密码重置成功，请告知用户');

  } catch (error) {
    console.error('Reset password error:', error);
    return serverErrorResponse('重置密码失败');
  }
}
