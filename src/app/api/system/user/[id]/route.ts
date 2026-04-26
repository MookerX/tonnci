// =============================================================================
// 腾曦生产管理系统 - 用户详情/修改/重置密码API
// 描述: 用户CRUD单条操作
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  successResponse, 
  badRequestResponse, 
  notFoundResponse,
  serverErrorResponse 
} from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { hashPassword, generateRandomPassword, verifyPassword } from '@/lib/auth/jwt';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';
import { z } from 'zod';

const updateUserSchema = z.object({
  realName: z.string().min(1, '姓名不能为空').optional(),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  deptId: z.number().int().positive().optional().nullable(),
  roleIds: z.array(z.number().int().positive()).optional(),
  status: z.enum(['active', 'disabled', 'locked']).optional(),
  remark: z.string().optional().nullable(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少6位').max(32, '新密码最多32位'),
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
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        remark: true,
        department: {
          select: {
            id: true,
            deptCode: true,
            deptName: true,
          },
        },
      },
    });

    if (!user) {
      return notFoundResponse('用户不存在');
    }

    // 获取角色信息
    const roleIds = user.roleIds ? JSON.parse(user.roleIds as any) : [];
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds }, isDelete: false },
      select: {
        id: true,
        roleCode: true,
        roleName: true,
        roleType: true,
      },
    });

    return successResponse({
      ...user,
      roles,
    });

  } catch (error) {
    console.error('Get user detail error:', error);
    return serverErrorResponse('获取用户详情失败');
  }
}

// =============================================================================
// 修改用户信息
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

    const auth = authResult;
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return badRequestResponse('无效的用户ID');
    }

    // 解析请求参数
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse('参数验证失败');
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

    // 验证角色
    if (data.roleIds && data.roleIds.length > 0) {
      const existingRoles = await prisma.role.findMany({
        where: { id: { in: data.roleIds }, isDelete: false },
      });
      if (existingRoles.length !== data.roleIds.length) {
        return badRequestResponse('部分角色不存在');
      }
    }

    // 构建更新数据
    const updateData: any = {
      updatedBy: auth.userId,
      updatedAt: new Date(),
    };

    if (data.realName !== undefined) updateData.realName = data.realName;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.deptId !== undefined) updateData.deptId = data.deptId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remark !== undefined) updateData.remark = data.remark;
    if (data.roleIds !== undefined) updateData.roleIds = JSON.stringify(data.roleIds);

    // 执行更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        uuid: true,
        username: true,
        realName: true,
        email: true,
        phone: true,
        deptId: true,
        roleIds: true,
        status: true,
        updatedAt: true,
      },
    });

    // 记录日志
    await operationLog.logUpdate(
      '用户管理',
      auth.userId,
      auth.username,
      { id: existingUser.id, username: existingUser.username },
      { id: updatedUser.id, username: updatedUser.username },
      clientIp
    );

    return successResponse(updatedUser, '用户信息更新成功');

  } catch (error) {
    console.error('Update user error:', error);
    return serverErrorResponse('更新用户失败');
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

    const auth = authResult;
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return badRequestResponse('无效的用户ID');
    }

    // 不能删除自己
    if (userId === auth.userId) {
      return badRequestResponse('不能删除当前登录用户');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, isDelete: false },
    });

    if (!user) {
      return notFoundResponse('用户不存在');
    }

    // 执行软删除
    await prisma.user.update({
      where: { id: userId },
      data: {
        isDelete: true,
        updatedBy: auth.userId,
        updatedAt: new Date(),
      },
    });

    // 记录日志
    await operationLog.logDelete(
      '用户管理',
      auth.userId,
      auth.username,
      { id: user.id, username: user.username, realName: user.realName },
      getClientIp(request)
    );

    return successResponse(null, '用户删除成功');

  } catch (error) {
    console.error('Delete user error:', error);
    return serverErrorResponse('删除用户失败');
  }
}
