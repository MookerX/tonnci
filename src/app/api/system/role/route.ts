// =============================================================================
// 腾曦生产管理系统 - 角色管理API
// 描述: 角色CRUD、权限分配
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  successResponse, 
  badRequestResponse, 
  forbiddenResponse,
  serverErrorResponse 
} from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';
import { z } from 'zod';

const createRoleSchema = z.object({
  roleCode: z.string().min(1, '角色编码不能为空'),
  roleName: z.string().min(1, '角色名称不能为空'),
  roleType: z.enum(['system', 'custom']).default('custom'),
  dataScope: z.enum(['all', 'dept', 'self']).default('self'),
  remark: z.string().optional(),
});

const updateRoleSchema = z.object({
  roleName: z.string().min(1).optional(),
  dataScope: z.enum(['all', 'dept', 'self']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().optional().nullable(),
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

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const keyword = url.searchParams.get('keyword') || '';
    const roleType = url.searchParams.get('roleType');

    const where: any = {
      isDelete: false,
    };

    if (keyword) {
      where.OR = [
        { roleCode: { contains: keyword } },
        { roleName: { contains: keyword } },
      ];
    }

    if (roleType) {
      
    }

    const [total, roles] = await Promise.all([
      prisma.role.count({ where }),
      prisma.role.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return successResponse({
      list: roles,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });

  } catch (error) {
    console.error('Get roles error:', error);
    return serverErrorResponse('获取角色列表失败');
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

    const auth = authResult;
    const clientIp = getClientIp(request);

    // 只有管理员可以创建角色
    if (!auth.roles.includes('admin') && !auth.roles.includes('super_admin')) {
      return forbiddenResponse('只有管理员可以创建角色');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = createRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse('参数验证失败');
    }

    const data = validationResult.data;

    // 检查角色编码唯一性
    const existing = await prisma.role.findUnique({
      where: { roleCode: data.roleCode, isDelete: false },
    });

    if (existing) {
      return badRequestResponse('角色编码已存在');
    }

    // 创建角色
    const newRole = await prisma.role.create({
      data: {
        roleCode: data.roleCode,
        roleName: data.roleName,
        roleType: data.roleType,
        dataScope: data.dataScope,
        status: 'active',
        createdBy: auth.userId,
      },
    });

    await operationLog.logCreate('角色管理', auth.userId, auth.username, {
      id: newRole.id,
      roleCode: newRole.roleCode,
      roleName: newRole.roleName,
    }, clientIp);

    return successResponse(newRole, '角色创建成功');

  } catch (error) {
    console.error('Create role error:', error);
    return serverErrorResponse('创建角色失败');
  }
}

// =============================================================================
// 批量删除角色
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const auth = authResult;
    const clientIp = getClientIp(request);

    if (!auth.roles.includes('admin') && !auth.roles.includes('super_admin')) {
      return forbiddenResponse('只有管理员可以删除角色');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return badRequestResponse('请选择要删除的角色');
    }

    // 不能删除系统角色
    const systemRoles = await prisma.role.findMany({
      where: { id: { in: ids }, roleType: 'system', isDelete: false },
    });

    if (systemRoles.length > 0) {
      return badRequestResponse('系统角色不能删除');
    }

    // 检查是否被用户使用
    const usedByUsers = await prisma.user.findFirst({
      where: {
        roleIds: { contains: ids[0].toString() },
        isDelete: false,
      },
    });

    if (usedByUsers) {
      return badRequestResponse('该角色已被用户使用，请先移除');
    }

    await prisma.role.updateMany({
      where: { id: { in: ids }, isDelete: false },
      data: {
        isDelete: true,
        updatedBy: auth.userId,
        updatedAt: new Date(),
      },
    });

    await operationLog.log({
      moduleName: '角色管理',
      businessType: 'delete',
      operatorId: auth.userId,
      operatorName: auth.username,
      operationDesc: '批量删除角色',
      requestParams: { ids },
      ipAddress: clientIp,
      status: 'success',
    });

    return successResponse({ deletedCount: ids.length }, `成功删除 ${ids.length} 个角色`);

  } catch (error) {
    console.error('Delete roles error:', error);
    return serverErrorResponse('删除角色失败');
  }
}
