// =============================================================================
// 腾曦生产管理系统 - 数据范围过滤服务
// 描述: 根据角色的数据范围(dataScope)自动过滤查询数据
// =============================================================================

import { prisma } from '@/lib/prisma';

export type DataScopeType = 'all' | 'dept' | 'custom';

export interface DataScopeFilter {
  /** 是否为全部数据权限（跳过过滤） */
  isAll: boolean;
  /** 允许访问的部门ID列表 */
  allowedDeptIds: number[];
  /** Prisma where 条件中的 deptId 过滤 */
  deptIdFilter: { in: number[] } | number | null;
}

/**
 * 获取用户的数据范围过滤条件
 * 综合用户所有角色的数据范围，取最宽松的权限
 * 
 * @param userId 用户ID
 * @param deptId 用户所属部门ID
 * @param roleIds 用户角色ID列表
 * @param isSuperAdmin 是否超级管理员（permissions 包含 *）
 * @returns DataScopeFilter 数据范围过滤条件
 */
export async function getDataScopeFilter(
  userId: number,
  deptId: number | null,
  roleIds: number[],
  isSuperAdmin: boolean = false
): Promise<DataScopeFilter> {
  // 超级管理员拥有全部数据权限
  if (isSuperAdmin) {
    return { isAll: true, allowedDeptIds: [], deptIdFilter: null };
  }

  // 没有角色或部门信息，默认只能看自己部门
  if (!roleIds || roleIds.length === 0) {
    if (deptId) {
      return { isAll: false, allowedDeptIds: [deptId], deptIdFilter: deptId };
    }
    return { isAll: false, allowedDeptIds: [], deptIdFilter: null };
  }

  // 查询用户所有角色的数据范围
  const roles = await prisma.role.findMany({
    where: {
      id: { in: roleIds },
      isDelete: false,
    },
    select: {
      id: true,
      dataScope: true,
    },
  });

  // 如果任一角色为 all，则拥有全部数据权限
  if (roles.some(r => r.dataScope === 'all')) {
    return { isAll: true, allowedDeptIds: [], deptIdFilter: null };
  }

  const allowedDeptIds = new Set<number>();

  for (const role of roles) {
    switch (role.dataScope as DataScopeType) {
      case 'all':
        return { isAll: true, allowedDeptIds: [], deptIdFilter: null };

      case 'dept':
        // 本部门数据（自动包含子部门）
        if (deptId) {
          allowedDeptIds.add(deptId);
          const childDeptIds = await getChildDeptIds(deptId);
          childDeptIds.forEach(id => allowedDeptIds.add(id));
        }
        break;

      case 'custom':
        // 自定义部门数据 - 从 RoleDeptScope 表读取
        const customDepts = await prisma.roleDeptScope.findMany({
          where: { roleId: role.id, isDelete: false },
          select: { deptId: true },
        });
        customDepts.forEach(d => allowedDeptIds.add(d.deptId));
        break;
    }
  }

  const deptIdsArray = Array.from(allowedDeptIds);

  if (deptIdsArray.length === 0) {
    return { isAll: false, allowedDeptIds: [], deptIdFilter: null };
  }

  return {
    isAll: false,
    allowedDeptIds: deptIdsArray,
    deptIdFilter: { in: deptIdsArray },
  };
}

/**
 * 递归获取所有子部门ID
 */
async function getChildDeptIds(parentId: number): Promise<number[]> {
  const children = await prisma.dept.findMany({
    where: { parentId, isDelete: false, status: 'active' },
    select: { id: true },
  });

  const ids: number[] = [];
  for (const child of children) {
    ids.push(child.id);
    const grandChildren = await getChildDeptIds(child.id);
    ids.push(...grandChildren);
  }
  return ids;
}

/**
 * 从 AuthContext 构建数据范围过滤（便捷方法）
 * 自动判断超级管理员权限
 */
export async function getDataScopeFilterFromAuth(auth: {
  userId: number;
  deptId: number | null;
  roles: string[];
  permissions?: string[];
}): Promise<DataScopeFilter> {
  const roleIds = auth.roles
    .map(r => {
      try { return parseInt(r); } catch { return NaN; }
    })
    .filter(id => !isNaN(id));

  const isSuperAdmin = auth.permissions?.includes('*') || false;

  return getDataScopeFilter(auth.userId, auth.deptId, roleIds, isSuperAdmin);
}
