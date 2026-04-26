// =============================================================================
// 腾曦生产管理系统 - 角色管理API
// 描述: 角色CRUD、权限分配、数据权限设置
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, paginatedResponse, badRequestResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { z } from 'zod';

// 创建角色验证
const createRoleSchema = z.object({
  roleName: z.string().min(1, '角色名称不能为空').max(100),
  roleCode: z.string().min(1, '角色代码不能为空').max(50),
  dataScope: z.enum(['all', 'dept', 'deptAndChild', 'custom']).optional().default('custom'),
  status: z.enum(['active', 'disabled']).optional().default('active'),
  sortOrder: z.number().int().optional().default(0),
  remark: z.string().optional().nullable(),
});

// 更新角色验证
const updateRoleSchema = z.object({
  roleName: z.string().min(1, '角色名称不能为空').max(100).optional(),
  dataScope: z.enum(['all', 'dept', 'deptAndChild', 'custom']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  sortOrder: z.number().int().optional(),
  remark: z.string().optional().nullable(),
});

// 分配权限验证
const assignPermissionSchema = z.object({
  menuIds: z.array(z.number().int().positive()).optional().default([]),
  permissions: z.array(z.object({
    menuId: z.number().int().positive(),
    actions: z.array(z.enum(['view', 'add', 'edit', 'delete', 'export', 'import'])),
  })).optional().default([]),
  deptIds: z.array(z.number().int().positive()).optional().default([]),
});

// =============================================================================
// 获取角色列表
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
    const status = searchParams.get('status');

    // 构建查询条件
    const where: any = { isDelete: false };
    
    if (keyword) {
      where.OR = [
        { roleName: { contains: keyword } },
        { roleCode: { contains: keyword } },
      ];
    }
    
    if (status) {
      where.status = status;
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        select: {
          id: true,
          roleName: true,
          roleCode: true,
          dataScope: true,
          status: true,
          sortOrder: true,
          remark: true,
          createdAt: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.role.count({ where }),
    ]);

    // 获取每个角色的用户数量
    const roleIds = roles.map(r => r.id);
    const userRoles = await prisma.user.findMany({
      where: { 
        isDelete: false,
        roleIds: { not: null },
      },
      select: { roleIds: true },
    });

    const userCountMap = new Map<number, number>();
    userRoles.forEach(u => {
      try {
        const ids = JSON.parse(u.roleIds || '[]');
        ids.forEach((id: number) => {
          userCountMap.set(id, (userCountMap.get(id) || 0) + 1);
        });
      } catch {}
    });

    const rolesWithCount = roles.map(r => ({
      ...r,
      userCount: userCountMap.get(r.id) || 0,
    }));

    return paginatedResponse(rolesWithCount, { page, pageSize, total });

  } catch (error: any) {
    console.error('Get roles error:', error);
    return serverErrorResponse('查询角色列表失败');
  }
}

// =============================================================================
// 创建角色
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

    const validationResult = createRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0].message);
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查角色代码是否已存在
    const existingRole = await prisma.role.findFirst({
      where: { roleCode: data.roleCode, isDelete: false },
    });

    if (existingRole) {
      return errorResponse(400, '角色代码已存在');
    }

    const role = await prisma.role.create({
      data: {
        roleName: data.roleName,
        roleCode: data.roleCode,
        dataScope: data.dataScope,
        status: data.status,
        sortOrder: data.sortOrder,
        remark: data.remark || null,
        createdBy: authResult.userId,
      },
    });

    await operationLog.logCreate(
      '角色管理',
      authResult.userId,
      authResult.username,
      { roleId: role.id, roleName: role.roleName, roleCode: role.roleCode },
      clientIp
    );

    return successResponse({ id: role.id, roleCode: role.roleCode }, '角色创建成功');

  } catch (error: any) {
    console.error('Create role error:', error);
    return serverErrorResponse(error.message);
  }
}
