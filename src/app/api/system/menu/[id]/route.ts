// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 菜单详情/更新/删除API
// 描述: 菜单CRUD操作
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { z } from 'zod';

const updateMenuSchema = z.object({
  parentId: z.number().int().positive().optional().nullable(),
  menuName: z.string().min(1, '菜单名称不能为空').max(100).optional(),
  menuCode: z.string().max(50).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  path: z.string().max(255).optional().nullable(),
  component: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
  visible: z.enum(['visible', 'hidden']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  permission: z.string().max(100).optional().nullable(),
  remark: z.string().optional().nullable(),
});

// =============================================================================
// 获取菜单详情
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
    const menuId = parseInt(id);

    if (isNaN(menuId)) {
      return badRequestResponse('无效的菜单ID');
    }

    const menu = await prisma.menu.findUnique({
      where: { id: menuId, isDelete: false },
    });

    if (!menu) {
      return notFoundResponse('菜单不存在');
    }

    // 获取子菜单数量
    const childCount = await prisma.menu.count({
      where: { parentId: menuId, isDelete: false },
    });

    // 获取父菜单信息
    const parentMenu = menu.parentId ? await prisma.menu.findUnique({
      where: { id: menu.parentId, isDelete: false },
      select: { id: true, menuName: true },
    }) : null;

    return successResponse({
      ...menu,
      childCount,
      parent: parentMenu,
    });

  } catch (error: any) {
    console.error('Get menu detail error:', error);
    return serverErrorResponse(error.message);
  }
}

// =============================================================================
// 更新菜单
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
    const menuId = parseInt(id);

    if (isNaN(menuId)) {
      return badRequestResponse('无效的菜单ID');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = updateMenuSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues?.[0]?.message || '参数验证失败');
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    const existingMenu = await prisma.menu.findUnique({
      where: { id: menuId, isDelete: false },
    });

    if (!existingMenu) {
      return notFoundResponse('菜单不存在');
    }

    // 不能将自己设置为自己的子菜单
    if (data.parentId === menuId) {
      return errorResponse(400, '不能将自己设置为父菜单');
    }

    // 不能将自己的子菜单设置为父菜单（避免循环）
    if (data.parentId) {
      const getAllChildIds = async (parentId: number): Promise<number[]> => {
        const children = await prisma.menu.findMany({
          where: { parentId, isDelete: false },
          select: { id: true },
        });
        let ids: number[] = children.map(c => c.id);
        for (const child of children) {
          ids = [...ids, ...await getAllChildIds(child.id)];
        }
        return ids;
      };

      const childIds = await getAllChildIds(menuId);
      if (childIds.includes(data.parentId)) {
        return errorResponse(400, '不能将自己或子菜单设置为父菜单');
      }
    }

    const updateData: any = {
      modifiedBy: authResult.userId,
    };

    // parentId: null = 顶级菜单, undefined = 不修改, number = 设置父菜单
    if ('parentId' in data) updateData.parentId = data.parentId;
    if (data.menuName !== undefined) updateData.menuName = data.menuName;
    if (data.menuCode !== undefined) updateData.menuCode = data.menuCode;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.path !== undefined) updateData.path = data.path;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.visible !== undefined) updateData.visible = data.visible;
    if (data.isVisible !== undefined) updateData.visible = data.isVisible ? 'visible' : 'hidden';
    if (data.status !== undefined) updateData.status = data.status;
    if (data.permission !== undefined) updateData.permission = data.permission;
    if (data.remark !== undefined) updateData.remark = data.remark;

    const updated = await prisma.menu.update({
      where: { id: menuId },
      data: updateData,
    });

    await operationLog.logUpdate(
      '菜单权限',
      authResult.userId,
      authResult.username,
      { id: existingMenu.id, menuName: existingMenu.menuName },
      { id: updated.id, menuName: updated.menuName },
      clientIp
    );

    return successResponse({ id: updated.id, menuName: updated.menuName }, '菜单更新成功');

  } catch (error: any) {
    console.error('Update menu error:', error);
    return serverErrorResponse(error.message);
  }
}

// =============================================================================
// 删除菜单（软删除）
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
    const menuId = parseInt(id);

    if (isNaN(menuId)) {
      return badRequestResponse('无效的菜单ID');
    }

    const clientIp = getClientIp(request);

    const existingMenu = await prisma.menu.findUnique({
      where: { id: menuId, isDelete: false },
    });

    if (!existingMenu) {
      return notFoundResponse('菜单不存在');
    }

    // 检查是否有子菜单
    const childCount = await prisma.menu.count({
      where: { parentId: menuId, isDelete: false },
    });

    if (childCount > 0) {
      return errorResponse(400, `该菜单下有 ${childCount} 个子菜单，请先删除子菜单`);
    }

    // 软删除
    await prisma.menu.update({
      where: { id: menuId },
      data: {
        isDelete: true,
        status: 'disabled',
        modifiedBy: authResult.userId,
      },
    });

    // 删除角色权限关联
    await prisma.$executeRaw`
      DELETE FROM role_permission WHERE menu_id = ${menuId}
    `;

    await operationLog.logDelete(
      '菜单权限',
      authResult.userId,
      authResult.username,
      { id: existingMenu.id, menuName: existingMenu.menuName },
      clientIp
    );

    return successResponse(null, '菜单删除成功');

  } catch (error: any) {
    console.error('Delete menu error:', error);
    return serverErrorResponse(error.message);
  }
}
