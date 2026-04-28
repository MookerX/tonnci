// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 权限菜单API
// 描述: 菜单树形结构、权限点管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { z } from 'zod';

// 创建菜单验证
const createMenuSchema = z.object({
  parentId: z.number().int().positive().optional().nullable(),
  menuName: z.string().min(1, '菜单名称不能为空').max(100),
  menuCode: z.string().max(50).optional().nullable(),
  menuType: z.enum(['directory', 'menu', 'button']).default('menu'),
  icon: z.string().max(50).optional().nullable(),
  path: z.string().max(255).optional().nullable(),
  component: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isVisible: z.boolean().optional(),
  visible: z.enum(['visible', 'hidden']).optional(),
  status: z.enum(['active', 'disabled']).optional().default('active'),
  permission: z.string().max(100).optional().nullable(),
  remark: z.string().optional().nullable(),
});

// 更新菜单验证
const updateMenuSchema = z.object({
  parentId: z.number().int().positive().optional().nullable(),
  menuName: z.string().min(1, '菜单名称不能为空').max(100).optional(),
  menuCode: z.string().max(50).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  path: z.string().max(255).optional().nullable(),
  component: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().optional(),
  visible: z.enum(['visible', 'hidden']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  permission: z.string().max(100).optional().nullable(),
  remark: z.string().optional().nullable(),
});

// =============================================================================
// 获取菜单列表
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'tree'; // tree=树形, list=列表, perms=权限列表
    const roleId = searchParams.get('roleId');

    // 获取所有菜单
    const menus = await prisma.menu.findMany({
      where: { isDelete: false },
      select: {
        id: true,
        parentId: true,
        menuName: true,
        menuCode: true,
        menuType: true,
        icon: true,
        path: true,
        component: true,
        sortOrder: true,
        visible: true,
        status: true,
        permission: true,
        remark: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    // 如果指定了角色，获取角色已分配的权限
    let roleMenuIds: number[] = [];
    let rolePermissions: string[] = [];
    
    if (roleId) {
      const rid = parseInt(roleId);
      const perms = await prisma.$queryRaw<any[]>`
        SELECT menu_id as menuId, permission 
        FROM role_permission 
        WHERE role_id = ${rid} AND is_delete = false
      `;
      roleMenuIds = perms.filter(p => p.menuId).map(p => p.menuId);
      rolePermissions = perms.filter(p => p.permission).map(p => p.permission);
    }

// Helper: transform Prisma menu record to API response with isVisible boolean
function transformMenu(m: any): any {
  return {
    ...m,
    isVisible: m.visible === 'visible',
  };
}

// Helper: build tree with isVisible
function buildTreeWithIsVisible(parentId: number | null): any[] {
  return menus
    .filter(m => m.parentId === parentId)
    .map(m => {
      const children = buildTreeWithIsVisible(m.id);
      return {
        ...transformMenu(m),
        children: children.length > 0 ? children : undefined,
        ...(roleId ? {
          checked: roleMenuIds.includes(m.id),
          halfChecked: children.some(c => roleMenuIds.includes(c.id)),
        } : {}),
      };
    });
}

    // 构建树形结构
    if (type === 'tree' || type === 'perms') {
      const tree = buildTreeWithIsVisible(null);

      if (type === 'perms') {
        // 返回权限列表格式（用于角色权限配置）
        return successResponse({
          tree,
          selectedMenuIds: roleMenuIds,
          selectedPermissions: rolePermissions,
        });
      }

      return successResponse(tree);
    } else if (type === 'sort') {
      // 批量更新菜单排序
      const { orders } = await request.json();
      if (!Array.isArray(orders)) {
        return errorResponse('orders must be an array', 400);
      }
      await prisma.menu.updateMany({
        where: { id: { in: orders.map((o: any) => o.id) } },
        data: orders.map((o: any) => ({ sortOrder: o.sortOrder })),
      });
      return successResponse({ updated: orders.length });
    } else {
      return successResponse(menus.map(transformMenu));
    }
  } catch (error: any) {
    console.error('Get menus error:', error);
    console.error('Error stack:', error?.stack);
    return serverErrorResponse(error?.message || '查询菜单列表失败');
  }
}

// =============================================================================
// 创建菜单
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

    const validationResult = createMenuSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues?.[0]?.message || '参数验证失败');
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 如果设置了父菜单，检查父菜单是否存在
    if (data.parentId) {
      const parentMenu = await prisma.menu.findUnique({
        where: { id: data.parentId, isDelete: false },
      });
      if (!parentMenu) {
        return badRequestResponse('父菜单不存在');
      }
      // 按钮类型必须挂在菜单下面
      if (data.menuType === 'button' && parentMenu.menuType === 'button') {
        return errorResponse(400, '按钮不能直接挂在另一个按钮下面');
      }
    }

    // 目录类型不能有路径和组件
    if (data.menuType === 'directory') {
      data.path = null;
      data.component = null;
    }

    const menu = await prisma.menu.create({
      data: {
        parentId: data.parentId || null,
        menuName: data.menuName,
        menuCode: data.menuCode || null,
        menuType: data.menuType,
        icon: data.icon || null,
        path: data.path || null,
        component: data.component || null,
        sortOrder: data.sortOrder,
        visible: data.isVisible !== undefined
          ? (data.isVisible ? 'visible' : 'hidden')
          : (data.visible || 'visible'),
        status: data.status,
        permission: data.permission || null,
        remark: data.remark || null,
        createdBy: authResult.userId,
      },
    });

    await operationLog.logCreate(
      '菜单权限',
      authResult.userId,
      authResult.username,
      { id: menu.id, menuName: menu.menuName, menuType: menu.menuType },
      clientIp
    );

    return successResponse({ id: menu.id, menuName: menu.menuName }, '菜单创建成功');

  } catch (error: any) {
    console.error('Create menu error:', error);
    return serverErrorResponse(error.message);
  }
}
