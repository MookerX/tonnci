// =============================================================================
// 数据权限工具
// 功能：根据用户角色判断数据权限，自动过滤数据
// =============================================================================

import { prisma } from '@/lib/prisma';

export type DataScope = 'all' | 'dept' | 'custom' | 'self';

export interface DataPermission {
  dataScope: DataScope;
  deptId?: number | null;
  allowedDeptIds?: number[];
}

/**
 * 获取用户的数据权限配置
 * @param userId 用户ID
 * @returns 数据权限配置
 */
export async function getUserDataPermission(userId: number): Promise<DataPermission> {
  // 查找用户的角色
  const user = await prisma.user.findUnique({
    where: { id: userId, isDelete: false },
    select: { roleIds: true, deptId: true },
  });

  if (!user || !user.roleIds) {
    return { dataScope: 'self' };
  }

  const roleIds: number[] = JSON.parse(user.roleIds);
  if (roleIds.length === 0) {
    return { dataScope: 'self' };
  }

  // 获取用户角色的数据权限配置（取权限最大的那个）
  const roles = await prisma.role.findMany({
    where: { id: { in: roleIds }, isDelete: false },
    select: { dataScope: true, roleName: true },
  });

  // 超级管理员拥有所有权限
  const hasAdmin = roles.some(r => r.roleName === '超级管理员' || r.roleName === 'admin');
  if (hasAdmin) {
    return { dataScope: 'all' };
  }

  // 取最高权限（all > custom > dept > self）
  let dataScope: DataScope = 'self';
  for (const role of roles) {
    const scope = role.dataScope as DataScope;
    if (scope === 'all') {
      dataScope = 'all';
      break;
    }
    if (scope === 'custom') {
      dataScope = 'custom';
    }
    if (scope === 'dept' && dataScope !== 'custom') {
      dataScope = 'dept';
    }
  }

  const result: DataPermission = {
    dataScope,
    deptId: user.deptId,
  };

  // 如果是自定义权限，获取允许的部门列表
  if (dataScope === 'custom') {
    const scopes = await prisma.roleDeptScope.findMany({
      where: { roleId: { in: roleIds } },
      select: { deptId: true },
    });
    result.allowedDeptIds = scopes.map(s => s.deptId);
  }

  return result;
}

/**
 * 构建数据权限的查询条件
 * @param permission 数据权限配置
 * @param deptField 数据库中部门字段名（默认 deptId）
 * @returns Prisma where 条件
 */
export function buildDataPermissionWhere(permission: DataPermission, deptField: string = 'deptId'): any {
  switch (permission.dataScope) {
    case 'all':
      // 全部数据，不过滤
      return {};

    case 'dept':
      // 本部门数据
      if (permission.deptId) {
        return { [deptField]: permission.deptId };
      }
      return {};

    case 'custom':
      // 自定义部门
      if (permission.allowedDeptIds && permission.allowedDeptIds.length > 0) {
        return { [deptField]: { in: permission.allowedDeptIds } };
      }
      return {};

    case 'self':
    default:
      // 仅自己的数据（需要传入创建者ID）
      return {};
  }
}

/**
 * 检查用户是否可以访问某条数据
 * @param permission 数据权限配置
 * @param dataDeptId 数据所属部门ID
 * @param creatorId 数据创建者ID（用于 self 权限）
 * @param userId 当前用户ID
 * @returns 是否有权限
 */
export function canAccessData(
  permission: DataPermission,
  dataDeptId: number | null,
  creatorId?: number,
  userId?: number
): boolean {
  switch (permission.dataScope) {
    case 'all':
      return true;

    case 'dept':
      return dataDeptId === permission.deptId;

    case 'custom':
      return permission.allowedDeptIds?.includes(dataDeptId!) ?? false;

    case 'self':
      return creatorId === userId;

    default:
      return false;
  }
}
