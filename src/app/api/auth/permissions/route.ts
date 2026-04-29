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

    // 菜单key与权限模块的映射关系（支持 menuCode 和 menuName）
    const menuPermissionMap: Record<string, string> = {
      // 系统管理相关
      'system-user': 'system:user',
      'system-role': 'system:role',
      'system-dept': 'system:dept',
      'system-menu': 'system:menu',
      'system-log': 'system:log',
      'system-database': 'system:database',
      'system-storage': 'system:storage',
      'system-config': 'system:config',
      // 兼容 menuName
      '用户管理': 'system:user',
      '角色管理': 'system:role',
      '部门管理': 'system:dept',
      '菜单管理': 'system:menu',
      '系统管理': 'system:menu',
      '操作日志': 'system:log',
      '数据库配置': 'system:database',
      '存储配置': 'system:storage',
      '参数配置': 'system:config',
      // 组织管理
      '组织管理': 'system:dept',
      // 工艺管理
      'tech-bom': 'tech:material',
      'tech-drawing': 'tech:drawing',
      'tech-process': 'tech:process',
      'tech-route': 'tech:route',
      'tech-manhour': 'tech:route',
      'tech-task': 'techTask:techTask',
      // 订单管理
      'order': 'order:productionOrder',
      '生产订单': 'order:productionOrder',
      // 生产管理
      'prod-task': 'production:productionTask',
      'prod-nesting': 'production:nesting',
      'prod-report': 'production:workReport',
      'prod-instruction': 'production:productionTask',
      '生产任务': 'production:productionTask',
      '激光套料': 'production:nesting',
      '生产报工': 'production:workReport',
      '生产指令': 'production:productionTask',
      // 库存管理
      'inventory': 'inventory:inventory',
      '库存查询': 'inventory:inventory',
      // 质量管理
      'quality': 'quality:qcRecord',
      '质量检验': 'quality:qcRecord',
      // 采购管理
      'purchase-supplier': 'purchase:supplier',
      'purchase-demand': 'purchase:purchaseRequirement',
      'purchase-order': 'purchase:purchaseOrder',
      'purchase-receive': 'purchase:purchaseReceive',
      '供应商管理': 'purchase:supplier',
      '采购需求': 'purchase:purchaseRequirement',
      '采购订单': 'purchase:purchaseOrder',
      '到货入库': 'purchase:purchaseReceive',
      // 发货管理
      'delivery-plan': 'delivery:deliveryPlan',
      'delivery-ship': 'delivery:deliveryPlan',
      'delivery-sign': 'delivery:afterSalesRecord',
      '发货计划': 'delivery:deliveryPlan',
      '发货出库': 'delivery:deliveryPlan',
      '签收登记': 'delivery:afterSalesRecord',
      // 财务管理
      'account-recon': 'accounting:customerReconciliation',
      'account-invoice': 'accounting:invoice',
      'account-payment': 'accounting:paymentRecord',
      '客户对账': 'accounting:customerReconciliation',
      '发票管理': 'accounting:invoice',
      '回款管理': 'accounting:paymentRecord',
      // 工资管理
      'wages-data': 'wages:wageSettlement',
      'wages-calc': 'wages:wageSettlement',
      'wages-pay': 'wages:wagePaymentRecord',
      '工资数据': 'wages:wageSettlement',
      '工资结算': 'wages:wageSettlement',
      '工资发放': 'wages:wagePaymentRecord',
      // 客户门户
      'customer-portal': 'order:productionOrder',
      '客户查询': 'order:productionOrder',
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
