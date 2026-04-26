// =============================================================================
// 腾曦生产管理系统 - 角色详情/更新/删除/权限API
// 描述: 角色CRUD、权限分配、数据权限设置
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { z } from 'zod';

const updateRoleSchema = z.object({
  roleName: z.string().min(1, '角色名称不能为空').max(100).optional(),
  dataScope: z.enum(['all', 'dept', 'deptAndChild', 'custom']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  sortOrder: z.number().int().optional(),
  remark: z.string().optional().nullable(),
});

const assignPermissionSchema = z.object({
  menuIds: z.array(z.number().int().positive()).optional().default([]),
  permissions: z.array(z.object({
    menuId: z.number().int().positive(),
    actions: z.array(z.enum(['view', 'add', 'edit', 'delete', 'export', 'import'])),
  })).optional().default([]),
  deptIds: z.array(z.number().int().positive()).optional().default([]),
});

// =============================================================================
// 获取角色详情
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
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return badRequestResponse('无效的角色ID');
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId, isDelete: false },
    });

    if (!role) {
      return notFoundResponse('角色不存在');
    }

    // 获取角色已分配的菜单ID
    const menuPermissions = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT menu_id as menuId 
      FROM role_permission 
      WHERE role_id = ${roleId} AND is_delete = false
    `;
    const menuIds = menuPermissions.map(p => p.menuId);

    // 获取角色已分配的权限操作
    const actionPermissions = await prisma.$queryRaw<any[]>`
      SELECT menu_id as menuId, permission 
      FROM role_permission 
      WHERE role_id = ${roleId} AND is_delete = false AND permission IS NOT NULL
    `;

    const permissionMap = new Map<number, string[]>();
    actionPermissions.forEach(p => {
      if (!permissionMap.has(p.menuId)) {
        permissionMap.set(p.menuId, []);
      }
      permissionMap.get(p.menuId)!.push(p.permission);
    });

    // 获取数据权限部门范围
    const deptScopes = await prisma.$queryRaw<any[]>`
      SELECT dept_id as deptId 
      FROM role_dept_scope 
      WHERE role_id = ${roleId} AND is_delete = false
    `;
    const deptIds = deptScopes.map(d => d.deptId);

    return successResponse({
      ...role,
      menuIds,
      permissions: Array.from(permissionMap.entries()).map(([menuId, actions]) => ({
        menuId,
        actions,
      })),
      deptIds,
    });

  } catch (error: any) {
    console.error('Get role detail error:', error);
    return serverErrorResponse(error.message);
  }
}

// =============================================================================
// 更新角色
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
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return badRequestResponse('无效的角色ID');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    // 权限分配操作
    if (body.action === 'assignPermission') {
      const validationResult = assignPermissionSchema.safeParse(body);
      if (!validationResult.success) {
        return badRequestResponse(validationResult.error.errors[0].message);
      }

      const { menuIds, permissions, deptIds } = validationResult.data;
      const clientIp = getClientIp(request);

      await prisma.$transaction(async (tx) => {
        // 删除旧的权限记录
        await tx.$executeRaw`
          DELETE FROM role_permission WHERE role_id = ${roleId} AND is_delete = false
        `;

        // 删除旧的数据权限范围
        await tx.$executeRaw`
          DELETE FROM role_dept_scope WHERE role_id = ${roleId} AND is_delete = false
        `;

        // 批量插入新的菜单权限
        if (menuIds.length > 0) {
          const menuPermissionValues = menuIds.map(menuId => `(${roleId}, ${menuId}, NULL, NULL)`).join(',');
          await tx.$executeRaw(`
            INSERT INTO role_permission (role_id, menu_id, permission, is_delete, created_at) 
            VALUES ${menuPermissionValues.replace(/'/g, "''")}
          `);
        }

        // 批量插入新的操作权限
        for (const perm of permissions) {
          for (const action of perm.actions) {
            await tx.$executeRaw(`
              INSERT INTO role_permission (role_id, menu_id, permission, is_delete, created_at) 
              VALUES (${roleId}, ${perm.menuId}, '${action}', false, NOW())
            `);
          }
        }

        // 批量插入数据权限部门范围
        if (deptIds.length > 0) {
          const deptScopeValues = deptIds.map(deptId => `(${roleId}, ${deptId})`).join(',');
          await tx.$executeRaw(`
            INSERT INTO role_dept_scope (role_id, dept_id, is_delete, created_at) 
            VALUES ${deptScopeValues.replace(/'/g, "''")}
          `);
        }
      });

      await operationLog.log(
        '角色管理',
        '分配权限',
        authResult.userId,
        authResult.username,
        { roleId, menuIds, permissions, deptIds },
        clientIp,
        'success'
      );

      return successResponse(null, '权限分配成功');
    }

    // 普通更新
    const validationResult = updateRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0].message);
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    const existingRole = await prisma.role.findUnique({
      where: { id: roleId, isDelete: false },
    });

    if (!existingRole) {
      return notFoundResponse('角色不存在');
    }

    // 不允许修改超级管理员
    if (existingRole.roleCode === 'super_admin') {
      return errorResponse(400, '不能修改超级管理员角色');
    }

    const updateData: any = {
      modifiedBy: authResult.userId,
    };

    if (data.roleName !== undefined) updateData.roleName = data.roleName;
    if (data.dataScope !== undefined) updateData.dataScope = data.dataScope;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.remark !== undefined) updateData.remark = data.remark;

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: updateData,
    });

    await operationLog.logUpdate(
      '角色管理',
      authResult.userId,
      authResult.username,
      { id: existingRole.id, roleName: existingRole.roleName },
      { id: updated.id, roleName: updated.roleName },
      clientIp
    );

    return successResponse({ id: updated.id, roleName: updated.roleName }, '角色更新成功');

  } catch (error: any) {
    console.error('Update role error:', error);
    return serverErrorResponse(error.message);
  }
}

// =============================================================================
// 删除角色（软删除）
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
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return badRequestResponse('无效的角色ID');
    }

    const clientIp = getClientIp(request);

    const existingRole = await prisma.role.findUnique({
      where: { id: roleId, isDelete: false },
    });

    if (!existingRole) {
      return notFoundResponse('角色不存在');
    }

    // 不允许删除超级管理员
    if (existingRole.roleCode === 'super_admin') {
      return errorResponse(400, '不能删除超级管理员角色');
    }

    // 检查是否有用户使用此角色
    const usersWithRole = await prisma.user.findMany({
      where: { 
        isDelete: false,
        roleIds: { contains: String(roleId) },
      },
      select: { id: true, username: true },
    });

    if (usersWithRole.length > 0) {
      const usernames = usersWithRole.map(u => u.username).join(', ');
      return errorResponse(400, `该角色已被以下用户使用：${usernames}，请先解除关联`);
    }

    // 软删除角色
    await prisma.role.update({
      where: { id: roleId },
      data: {
        isDelete: true,
        status: 'disabled',
        modifiedBy: authResult.userId,
      },
    });

    // 删除角色权限关联
    await prisma.$transaction([
      prisma.$executeRaw`DELETE FROM role_permission WHERE role_id = ${roleId}`,
      prisma.$executeRaw`DELETE FROM role_dept_scope WHERE role_id = ${roleId}`,
    ]);

    await operationLog.logDelete(
      '角色管理',
      authResult.userId,
      authResult.username,
      { id: existingRole.id, roleName: existingRole.roleName },
      clientIp
    );

    return successResponse(null, '角色删除成功');

  } catch (error: any) {
    console.error('Delete role error:', error);
    return serverErrorResponse(error.message);
  }
}
