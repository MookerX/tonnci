// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 获取当前用户权限API
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/response';
import { jwtTokenManager, extractTokenFromHeader } from '@/lib/auth/jwt';

/**
 * GET /api/auth/permissions
 * 获取当前登录用户的权限列表
 * 返回: { permissions: string[], menus: string[] }
 *   permissions: ["system:user:query", "system:user:create", ...] 或 ["*"]
 *   menus: ["system-user", "system-role", ...] 有权访问的菜单key列表
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 从请求头获取token
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return unauthorizedResponse('未登录');
    }

    const payload = jwtTokenManager.verifyToken(token);
    if (!payload) {
      return unauthorizedResponse('登录已过期');
    }

    const userId = Number(payload.sub);
    if (!userId) {
      return unauthorizedResponse('无效的用户信息');
    }

    // 2. 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId, isDelete: false },
      select: {
        id: true,
        username: true,
        realName: true,
        phone: true,
        email: true,
        avatar: true,
        deptId: true,
        roleIds: true,
        status: true,
      },
    });

    if (!user || user.status !== 'active') {
      return unauthorizedResponse('用户不存在或已禁用');
    }

    // 3. 解析角色ID（roleIds格式可能是 "[1,3,2]" 或 "1,3,2"）
    let roleIds: number[] = [];
    if (user.roleIds) {
      try {
        const raw = String(user.roleIds);
        // 尝试JSON解析（格式: "[1,3,2]"）
        roleIds = JSON.parse(raw);
      } catch {
        // 降级为逗号分隔（格式: "1,3,2"）
        roleIds = String(user.roleIds).split(',').filter(Boolean).map(Number);
      }
      roleIds = roleIds.filter((id: number) => !isNaN(id) && id > 0);
    }

    // 4. 获取权限列表
    let permissions: string[] = [];
    let isSuperAdmin = false;

    // 检查是否包含超级管理员角色
    if (roleIds.length > 0) {
      const superAdminRole = await prisma.role.findFirst({
        where: {
          id: { in: roleIds },
          roleCode: 'super_admin',
          isDelete: false,
          status: 'active',
        },
      });

      if (superAdminRole) {
        permissions = ['*'];
        isSuperAdmin = true;
      } else {
        // 普通用户：从 role_permission 表获取权限字符串
        const permRecords = await prisma.rolePermission.findMany({
          where: {
            roleId: { in: roleIds },
            isDelete: false,
            permission: { not: null },
          },
          select: {
            permission: true,
          },
        });
        permissions = permRecords.map(p => p.permission).filter((p): p is string => p !== null);
      }
    }

    // 5. 根据权限推算可访问的菜单
    const menus: string[] = [];

    // 菜单key与权限模块的映射关系
    const menuPermissionMap: Record<string, string> = {
      'system-user': 'system:user',
      'system-role': 'system:role',
      'system-dept': 'system:dept',
      'system-menu': 'system:menu',
      'system-log': 'system:log',
      'system-database': 'system:database',
      'system-storage': 'system:storage',
      'system-config': 'system:config',
      'tech-bom': 'tech:material',
      'tech-drawing': 'tech:drawing',
      'tech-process': 'tech:process',
      'tech-route': 'tech:route',
      'tech-manhour': 'tech:route',
      'tech-task': 'techTask:techTask',
      'order': 'order:productionOrder',
      'prod-task': 'production:productionTask',
      'prod-nesting': 'production:nesting',
      'prod-report': 'production:workReport',
      'prod-instruction': 'production:productionTask',
      'inventory': 'inventory:inventory',
      'quality': 'quality:qcRecord',
      'purchase-supplier': 'purchase:supplier',
      'purchase-demand': 'purchase:purchaseRequirement',
      'purchase-order': 'purchase:purchaseOrder',
      'purchase-receive': 'purchase:purchaseReceive',
      'delivery-plan': 'delivery:deliveryPlan',
      'delivery-ship': 'delivery:deliveryPlan',
      'delivery-sign': 'delivery:afterSalesRecord',
      'account-recon': 'accounting:customerReconciliation',
      'account-invoice': 'accounting:invoice',
      'account-payment': 'accounting:paymentRecord',
      'wages-data': 'wages:wageSettlement',
      'wages-calc': 'wages:wageSettlement',
      'wages-pay': 'wages:wagePaymentRecord',
      'customer-portal': 'order:productionOrder',
    };

    if (isSuperAdmin) {
      // 超级管理员拥有所有菜单
      Object.keys(menuPermissionMap).forEach(key => menus.push(key));
    } else {
      // 根据权限判断菜单可见性
      for (const [menuKey, permPrefix] of Object.entries(menuPermissionMap)) {
        const hasAccess = permissions.some(p => p.startsWith(permPrefix));
        if (hasAccess) {
          menus.push(menuKey);
        }
      }
    }

    // 6. 获取部门信息
    let deptInfo = null;
    if (user.deptId) {
      try {
        const dept = await prisma.dept.findUnique({
          where: { id: user.deptId },
        });
        if (dept) {
          deptInfo = { id: dept.id, deptName: dept.deptName };
        }
      } catch {}
    }

    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        deptId: user.deptId,
        dept: deptInfo,
        roles: roleIds,
        isSuperAdmin,
      },
      permissions,
      menus,
    });
  } catch (error: any) {
    console.error('获取权限失败:', error?.message || error);
    return serverErrorResponse(`获取权限失败: ${error?.message || '未知错误'}`);
  }
}
