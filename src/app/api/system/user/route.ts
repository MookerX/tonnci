// =============================================================================
// 腾曦生产管理系统 - 用户管理API
// 描述: 用户CRUD操作、重置密码、批量操作等
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, paginatedResponse, badRequestResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { hashPassword } from '@/lib/auth/jwt';
import { z } from 'zod';

// 创建用户验证
const createUserSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(50),
  password: z.string().min(6, '密码至少6个字符').max(50),
  realName: z.string().max(50).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('邮箱格式不正确').or(z.literal('')).optional().nullable(),
  deptId: z.union([z.number().int().positive(), z.literal("")]).optional().nullable().transform(v => v === "" ? null : v),
  roleIds: z.array(z.number().int().positive()).optional().default([]),
  status: z.enum(['active', 'disabled', 'locked']).optional().default('active'),
  remark: z.string().optional().nullable(),
});

// 更新用户验证
const updateUserSchema = z.object({
  realName: z.string().max(50).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('邮箱格式不正确').or(z.literal('')).optional().nullable(),
  gender: z.enum(['male', 'female', 'unknown']).optional().nullable(),
  deptId: z.union([z.number().int().positive(), z.literal("")]).optional().nullable().transform(v => v === "" ? null : v),
  roleIds: z.array(z.number().int().positive()).optional(),
  status: z.enum(['active', 'disabled', 'locked']).optional(),
  remark: z.string().optional().nullable(),
});

// 重置密码验证
const resetPasswordSchema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(6, '密码至少6个字符').max(50).optional(),
});

// 批量操作验证
const batchOperateSchema = z.object({
  userIds: z.array(z.number().int().positive()).min(1, '至少选择一个用户'),
  action: z.enum(['enable', 'disable', 'delete']),
});

// =============================================================================
// 获取用户列表
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword') || '';
    const deptId = searchParams.get('deptId');
    const status = searchParams.get('status');
    const roleId = searchParams.get('roleId');

    // 构建查询条件
    const where: any = { isDelete: false };
    
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { realName: { contains: keyword } },
        { phone: { contains: keyword } },
        { email: { contains: keyword } },
      ];
    }
    
    if (deptId) {
      where.deptId = parseInt(deptId);
    }
    
    if (status) {
      where.status = status;
    }

    // 查询数据
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    // 获取角色信息
    const allRoleIds = users.flatMap(u => {
      try {
        return u.roleIds ? JSON.parse(u.roleIds as any) : [];
      } catch {
        return [];
      }
    });
    
    const roles = await prisma.role.findMany({
      where: {
        id: { in: [...new Set(allRoleIds)] },
        isDelete: false,
      },
      select: { id: true, roleCode: true, roleName: true },
    });
    const roleMap = new Map(roles.map(r => [r.id, r]));

    // 获取部门信息
    const allDeptIds = users.map(u => u.deptId).filter((id): id is number => id !== null);
    const depts = await prisma.dept.findMany({
      where: { id: { in: allDeptIds }, isDelete: false },
      select: { id: true, deptName: true },
    });
    const deptMap = new Map(depts.map(d => [d.id, d]));

    // 格式化返回数据
    const formattedUsers = users.map(user => {
      const userRoleIds = user.roleIds ? JSON.parse(user.roleIds as any) : [];
      const userRoles = userRoleIds.map((id: number) => roleMap.get(id)).filter(Boolean);
      const dept = user.deptId ? deptMap.get(user.deptId) : null;
      
      return {
        ...user,
        roleIds: userRoleIds,
        roles: userRoles,
        dept: dept,
      };
    });

    return paginatedResponse(formattedUsers, { page, pageSize, total });

  } catch (error) {
    console.error('Get users error:', error);
    return serverErrorResponse('查询用户列表失败');
  }
}

// =============================================================================
// 创建用户
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors?.[0]?.message || '参数验证失败';
      return badRequestResponse(errorMessage);
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findFirst({
      where: { username: data.username, isDelete: false },
    });

    if (existingUser) {
      return errorResponse(400, '用户名已存在');
    }

    // 密码加密
    const hashedPassword = await hashPassword(data.password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        uuid: crypto.randomUUID(),
        username: data.username,
        password: hashedPassword,
        realName: data.realName || null,
        phone: data.phone || null,
        email: data.email || null,
        deptId: data.deptId || null,
        roleIds: data.roleIds ? JSON.stringify(data.roleIds) : null,
        userType: 'internal',
        status: data.status || 'active',
        remark: data.remark || null,
        createdBy: authResult.userId,
      },
    });

    // 记录日志
    await operationLog.logCreate(
      '用户管理',
      authResult.userId,
      authResult.username,
      { username: user.username, realName: user.realName },
      clientIp
    );

    return successResponse({ id: user.id, username: user.username }, '用户创建成功');

  } catch (error: any) {
    console.error('Create user error:', error);
    return serverErrorResponse(error.message);
  }
}

// =============================================================================
// 批量操作
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    // 检查是否是批量操作
    if (body.action) {
      const validationResult = batchOperateSchema.safeParse(body);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors?.[0]?.message || '参数验证失败';
        return badRequestResponse(errorMessage);
      }

      const { userIds, action } = validationResult.data;
      const clientIp = getClientIp(request);

      let updateData: any = {};
      let logDesc = '';

      switch (action) {
        case 'enable':
          updateData = { status: 'active' };
          logDesc = '批量启用用户';
          break;
        case 'disable':
          updateData = { status: 'disabled' };
          logDesc = '批量禁用用户';
          break;
        case 'delete':
          updateData = { isDelete: true };
          logDesc = '批量删除用户';
          break;
      }

      updateData.modifiedBy = authResult.userId;

      await prisma.user.updateMany({
        where: { id: { in: userIds }, isDelete: false },
        data: updateData,
      });

      await operationLog.log(
        '用户管理',
        logDesc,
        authResult.userId,
        authResult.username,
        { userIds, action },
        clientIp,
        'success'
      );

      return successResponse(null, `${logDesc}成功`);
    }

    // 否则是重置密码操作
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0].message);
    }

    const { userId, newPassword } = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId, isDelete: false },
    });

    if (!user) {
      return notFoundResponse('用户不存在');
    }

    // 生成新密码（如果未提供）
    const password = newPassword || '123456';
    const hashedPassword = await hashPassword(password);

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
      { userId, username: user.username },
      clientIp,
      'success'
    );

    return successResponse({ defaultPassword: newPassword ? undefined : password }, '密码重置成功' + (newPassword ? '' : '，默认密码为123456'));

  } catch (error: any) {
    console.error('Batch operate error:', error);
    return serverErrorResponse(error.message);
  }
}
