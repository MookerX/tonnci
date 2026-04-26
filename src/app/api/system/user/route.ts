// =============================================================================
// 腾曦生产管理系统 - 用户管理API
// 描述: 用户CRUD操作
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  successResponse, 
  badRequestResponse, 
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  paginatedResponse 
} from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { hashPassword, generateRandomPassword } from '@/lib/auth/jwt';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp, generateUuid } from '@/lib/utils';
import { z } from 'zod';

// =============================================================================
// Schema定义
// =============================================================================

const createUserSchema = z.object({
  username: z.string().min(3, '用户名至少3位').max(20, '用户名最多20位'),
  password: z.string().min(6, '密码至少6位').max(32, '密码最多32位'),
  realName: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  deptId: z.number().int().positive().optional(),
  roleIds: z.array(z.number().int().positive()),
  userType: z.enum(['internal', 'customer']).optional(),
  customerId: z.number().int().positive().optional(),
  remark: z.string().optional(),
});

const updateUserSchema = z.object({
  realName: z.string().min(1, '姓名不能为空').optional(),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  deptId: z.number().int().positive().optional(),
  roleIds: z.array(z.number().int().positive()).optional(),
  status: z.enum(['active', 'disabled', 'locked']).optional(),
  remark: z.string().optional(),
});

// =============================================================================
// 查询用户列表
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. 验证登录状态
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // 2. 解析查询参数
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));
    const keyword = url.searchParams.get('keyword') || '';
    const deptId = url.searchParams.get('deptId');
    const status = url.searchParams.get('status');
    const userType = url.searchParams.get('userType');
    const sortField = url.searchParams.get('sortField') || 'createdAt';
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // 3. 构建查询条件
    const where: any = {
      isDelete: false,
    };

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

    if (userType) {
      where.userType = userType;
    }

    // 4. 查询数据
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
        orderBy: {
          [sortField]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    // 5. 获取角色信息
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
      select: {
        id: true,
        roleCode: true,
        roleName: true,
      },
    });

    const roleMap = new Map(roles.map(r => [r.id, r]));

    // 6. 获取部门信息
    const allDeptIds = users.map(u => u.deptId).filter((id): id is number => id !== null);
    const depts = await prisma.dept.findMany({
      where: {
        id: { in: allDeptIds },
        isDelete: false,
      },
      select: {
        id: true,
        deptName: true,
      },
    });
    const deptMap = new Map(depts.map(d => [d.id, d]));

    // 7. 格式化返回数据
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

    return paginatedResponse(formattedUsers, {
      page,
      pageSize,
      total,
    });

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
    // 1. 验证登录状态
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const auth = authResult;

    // 2. 解析请求参数
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse('参数验证失败');
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 3. 检查用户名唯一性
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username, isDelete: false },
    });

    if (existingUser) {
      return badRequestResponse('用户名已存在');
    }

    // 4. 验证部门存在
    if (data.deptId) {
      const dept = await prisma.department.findUnique({
        where: { id: data.deptId, isDelete: false },
      });
      if (!dept) {
        return notFoundResponse('指定的部门不存在');
      }
    }

    // 5. 验证角色存在
    if (data.roleIds.length > 0) {
      const existingRoles = await prisma.role.findMany({
        where: { id: { in: data.roleIds }, isDelete: false },
      });
      if (existingRoles.length !== data.roleIds.length) {
        return badRequestResponse('部分角色不存在');
      }
    }

    // 6. 创建用户
    const hashedPassword = await hashPassword(data.password);
    
    const newUser = await prisma.user.create({
      data: {
        uuid: generateUuid(),
        username: data.username,
        password: hashedPassword,
        realName: data.realName,
        email: data.email || null,
        phone: data.phone || null,
        gender: data.gender || 'unknown',
        deptId: data.deptId || null,
        roleIds: JSON.stringify(data.roleIds),
        userType: data.userType || 'internal',
        customerId: data.customerId || null,
        status: 'active',
        isFirstLogin: true,
        remark: data.remark || null,
        createdBy: auth.userId,
      },
      select: {
        id: true,
        uuid: true,
        username: true,
        realName: true,
        email: true,
        phone: true,
        deptId: true,
        roleIds: true,
        userType: true,
        status: true,
        createdAt: true,
      },
    });

    // 7. 记录日志
    await operationLog.logCreate('用户管理', auth.userId, auth.username, {
      userId: newUser.id,
      username: newUser.username,
      realName: newUser.realName,
    }, clientIp);

    return successResponse(newUser, '用户创建成功');

  } catch (error) {
    console.error('Create user error:', error);
    return serverErrorResponse('创建用户失败');
  }
}

// =============================================================================
// 批量删除用户
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    // 1. 验证登录状态
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const auth = authResult;
    const clientIp = getClientIp(request);

    // 2. 解析请求参数
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return badRequestResponse('请选择要删除的用户');
    }

    // 3. 检查是否包含当前登录用户
    if (ids.includes(auth.userId)) {
      return badRequestResponse('不能删除当前登录用户');
    }

    // 4. 执行软删除
    const result = await prisma.user.updateMany({
      where: {
        id: { in: ids },
        isDelete: false,
      },
      data: {
        isDelete: true,
        updatedBy: auth.userId,
        updatedAt: new Date(),
      },
    });

    // 5. 记录日志
    await operationLog.log({
      moduleName: '用户管理',
      businessType: 'delete',
      operatorId: auth.userId,
      operatorName: auth.username,
      operationDesc: `批量删除用户`,
      requestParams: { deletedIds: ids, count: result.count },
      ipAddress: clientIp,
      status: 'success',
    });

    return successResponse({ deletedCount: result.count }, `成功删除 ${result.count} 个用户`);

  } catch (error) {
    console.error('Delete users error:', error);
    return serverErrorResponse('删除用户失败');
  }
}
