// =============================================================================
// 腾曦生产管理系统 - 用户详情/编辑/删除API
// 描述: 单个用户的CRUD操作
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { hashPassword } from '@/lib/auth/jwt';
import { z } from 'zod';

const updateUserSchema = z.object({
  realName: z.string().max(50).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
  gender: z.enum(['male', 'female', 'unknown']).optional().nullable(),
  deptId: z.number().int().positive().optional().nullable(),
  roleIds: z.array(z.number().int().positive()).optional(),
  status: z.enum(['active', 'disabled', 'locked']).optional(),
  remark: z.string().optional().nullable(),
});

// =============================================================================
// 获取用户详情
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return badRequestResponse('无效的用户ID');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, isDelete: false },
      select: {
        id: true,
        uuid: true,
        username: true,
        realName: true,
        email: true,
        phone: true,
        avatar: true,
        gender: true,
        deptId: true,
        roleIds: true,
        userType: true,
        customerId: true,
        status: true,
        lastLoginAt: true,
        loginIp: true,
        remark: true,
        createdAt: true,
        createdBy: true,
      },
    });

    if (!user) {
      return notFoundResponse('用户不存在');
    }

    // 获取角色信息
    const roleIds = user.roleIds ? JSON.parse(user.roleIds) : [];
    const roles = roleIds.length > 0 ? await prisma.role.findMany({
      where: { id: { in: roleIds }, isDelete: false },
      select: { id: true, roleCode: true, roleName: true },
    }) : [];

    // 获取部门信息
    const dept = user.deptId ? await prisma.dept.findUnique({
      where: { id: user.deptId, isDelete: false },
      select: { id: true, deptName: true },
    }) : null;

    return successResponse({
      ...user,
      roleIds,
      roles,
      dept,
    });

  } catch (error: any) {
    console.error('Get user detail error:', error);
    return serverErrorResponse(error.message);
  }
}

// =============================================================================
// 更新用户
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return badRequestResponse('无效的用户ID');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    // 检查是否是重置密码操作
    if (body.action === 'resetPassword') {
      const newPassword = body.newPassword || '123456';
      const hashedPassword = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          modifiedBy: authResult.userId,
        },
      });

      await operationLog.log(
        '用户管理',
        '重置密码',
        authResult.userId,
        authResult.username,
        { userId },
        getClientIp(request),
        'success'
      );

      return successResponse({ defaultPassword: body.newPassword ? undefined : newPassword }, '密码重置成功');
    }

    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0].message);
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId, isDelete: false },
    });

    if (!existingUser) {
      return notFoundResponse('用户不存在');
    }

    // 构建更新数据
    const updateData: any = {
      modifiedBy: authResult.userId,
    };

    if (data.realName !== undefined) updateData.realName = data.realName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.deptId !== undefined) updateData.deptId = data.deptId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remark !== undefined) updateData.remark = data.remark;
    if (data.roleIds !== undefined) updateData.roleIds = JSON.stringify(data.roleIds);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 记录日志
    await operationLog.logUpdate(
      '用户管理',
      authResult.userId,
      authResult.username,
      { id: existingUser.id, username: existingUser.username },
      { id: updated.id, username: updated.username },
      clientIp
    );

    return successResponse({ id: updated.id, username: updated.username }, '用户更新成功');

  } catch (error: any) {
    console.error('Update user error:', error);
    return serverErrorResponse(error.message);
  }
}

// =============================================================================
// 删除用户（软删除）
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return badRequestResponse('无效的用户ID');
    }

    const clientIp = getClientIp(request);

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId, isDelete: false },
    });

    if (!existingUser) {
      return notFoundResponse('用户不存在');
    }

    // 不允许删除自己
    if (userId === authResult.userId) {
      return errorResponse(400, '不能删除当前登录用户');
    }

    // 软删除
    await prisma.user.update({
      where: { id: userId },
      data: {
        isDelete: true,
        status: 'disabled',
        modifiedBy: authResult.userId,
      },
    });

    // 记录日志
    await operationLog.logDelete(
      '用户管理',
      authResult.userId,
      authResult.username,
      { id: existingUser.id, username: existingUser.username },
      clientIp
    );

    return successResponse(null, '用户删除成功');

  } catch (error: any) {
    console.error('Delete user error:', error);
    return serverErrorResponse(error.message);
  }
}
