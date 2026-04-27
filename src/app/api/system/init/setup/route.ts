/**
 * 系统初始化设置接口
 * 支持首次初始化和重新初始化
 * 重新初始化时支持：重用数据（保留业务数据）或清空数据（全部重置）
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/response";
import { hashPassword } from "@/lib/auth/jwt";
import { Prisma } from "@prisma/client";

// 业务表列表（重新初始化时根据模式决定是否清空）
const BUSINESS_TABLES = [
  // 采购相关
  "PurchaseInvoice", "PurchaseReceive", "PurchaseOrderItem", "PurchaseOrder", "PurchaseRequirement",
  // 发货相关
  "AfterSalesRecord", "DeliveryItem", "DeliveryPlan",
  // 财务相关
  "PaymentRecord", "Invoice", "ReconciliationItem", "CustomerReconciliation",
  // 工资相关
  "WagePaymentRecord", "WageSettlementItem", "WageSettlement",
  // 生产相关
  "WorkReport", "TaskProcess", "ProductionTask", "Nesting",
  // 库存相关
  "InventoryLog", "InventoryLock", "Inventory",
  // 质量相关
  "ReworkPlan", "QcRecord",
  // 员工相关
  "Worker",
  // 工序相关
  "RouteProcess", "ProcessRoute", "Process",
  // 班组相关
  "Team",
  // BOM相关
  "TechBomItem", "TechTaskTransfer", "TechTask", "BomItem",
  // 订单相关
  "ProductionOrder",
  // 客户相关
  "CustomerFeedback", "CustomerPermission", "Customer",
  // 物料相关
  "Material",
  // 权限相关
  "RolePermission", "RoleDeptScope", "UserRole",
];

// 初始化相关表（始终保留或重建）
const INIT_TABLES = [
  "User", "Role", "Dept", "Menu",
];

// 所有表列表
const ALL_TABLES = [...INIT_TABLES, ...BUSINESS_TABLES];

// 参数校验
function validateParams(data: any, hasExistingData: boolean): { valid: boolean; message?: string } {
  const username = data.admin?.username || data.adminUsername;
  const password = data.admin?.password || data.adminPassword;
  const realName = data.admin?.realName || data.adminRealName;

  if (!username || username.length < 2) {
    return { valid: false, message: "管理员用户名至少2个字符" };
  }

  // 如果有现有数据且选择重用模式，可以不填密码（保持原密码）
  if (!password || password.length < 6) {
    if (hasExistingData && data.mode === "reuse") {
      // 重用模式可以不填密码
    } else {
      return { valid: false, message: "管理员密码至少6个字符" };
    }
  }

  if (!realName) {
    return { valid: false, message: "请输入管理员姓名" };
  }

  return { valid: true };
}

// 清空所有业务数据（软删除）
async function clearBusinessData(tx: any) {
  console.log("清空所有业务数据...");

  for (const modelName of BUSINESS_TABLES) {
    try {
      // 检查模型是否存在
      if (!(tx as any)[modelName]) {
        console.log(`模型 ${modelName} 不存在，跳过`);
        continue;
      }

      // 使用 updateMany 进行软删除
      await (tx as any)[modelName].updateMany({
        where: { isDelete: false },
        data: { isDelete: true },
      });
      console.log(`已软删除 ${modelName}`);
    } catch (e) {
      console.log(`处理 ${modelName} 时出错:`, e);
    }
  }
}

// 清空所有数据（硬删除 - 危险操作）
async function clearAllData(tx: any) {
  console.log("清空所有数据...");

  for (const table of ALL_TABLES) {
    try {
      // 使用原生SQL进行硬删除
      await tx.$executeRawUnsafe(`DELETE FROM \`${table}\``);
      console.log(`已删除 ${table} 表数据`);
    } catch (e) {
      console.log(`处理 ${table} 时出错:`, e);
    }
  }
}

// 获取所有表名（用于数据库检查）
async function getAllTableNames(tx: any): Promise<string[]> {
  try {
    const result = await tx.$queryRaw`
      SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    `;
    return (result as any[]).map((row: any) => row.TABLE_NAME);
  } catch (e) {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求参数
    let data: any;
    try {
      data = await request.json();
    } catch {
      return errorResponse("无效的请求参数", 400);
    }

    // 2. 检查是否有现有数据
    const existingInit = await prisma.systemInitStatus.findFirst({
      orderBy: { id: "desc" },
    });

    let hasExistingData = false;
    try {
      const userCount = await prisma.user.count({ where: { isDelete: false } });
      hasExistingData = userCount > 0;
    } catch (e) {
      hasExistingData = false;
    }

    // 3. 参数校验
    const validation = validateParams(data, hasExistingData);
    if (!validation.valid) {
      return errorResponse(validation.message || "参数校验失败", 400);
    }

    // 4. 获取或解析模式
    const mode = data.mode || (hasExistingData ? null : "new");
    if (hasExistingData && !mode) {
      return errorResponse("请选择初始化模式", 400);
    }

    // 5. 执行初始化
    await prisma.$transaction(async (tx) => {
      // 检查数据库表是否存在，不存在则创建
      const existingTables = await getAllTableNames(tx);

      // 5.1 清空数据（根据模式）
      if (hasExistingData) {
        if (mode === "clear") {
          // 清空所有数据
          await clearAllData(tx);
        } else if (mode === "reuse") {
          // 只清空初始化相关表（User, Role, Dept, Menu）
          for (const table of INIT_TABLES) {
            try {
              await tx.$executeRawUnsafe(`DELETE FROM \`${table}\``);
            } catch (e) {
              console.log(`清空 ${table} 失败:`, e);
            }
          }
        }
      }

      // 5.2 创建超级管理员角色
      const superAdminRole = await tx.role.create({
        data: {
          roleCode: "super_admin",
          roleName: "超级管理员",
          dataScope: "all",
          status: "active",
          sortOrder: 1,
          remark: "系统内置超级管理员角色，拥有全部权限",
        },
      });

      // 5.3 创建默认部门
      const defaultDept = await tx.dept.create({
        data: {
          deptCode: "HQ",
          deptName: "公司总部",
          sortOrder: 0,
          status: "active",
          remark: "系统默认顶级部门",
        },
      });

      // 5.4 创建超级管理员用户
      const username = data.admin?.username || data.adminUsername;
      let password = data.admin?.password || data.adminPassword;
      const realName = data.admin?.realName || data.adminRealName;
      const phone = data.admin?.phone || data.adminPhone;
      const email = data.admin?.email || data.adminEmail;

      // 如果是重用模式且没有提供密码，从现有用户获取
      if (hasExistingData && mode === "reuse" && !password) {
        const existingUser = await tx.user.findFirst({
          where: { username, isDelete: true },
          orderBy: { id: "desc" },
        });
        if (existingUser) {
          password = existingUser.password; // 复用原密码的哈希值
        } else {
          password = "123456"; // 默认密码
        }
      }

      const hashedPassword = password ? await hashPassword(password) : await hashPassword("123456");

      const adminUser = await tx.user.create({
        data: {
          uuid: crypto.randomUUID(),
          username,
          password: hashedPassword,
          realName,
          phone: phone || null,
          email: email || null,
          deptId: defaultDept.id,
          status: "active",
          createdBy: 0,
        },
      });

      // 5.5 绑定用户角色
      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      });

      // 5.6 创建默认菜单
      const menuData = [
        // 系统管理
        { menuName: "系统管理", menuType: "directory", path: "/dashboard/system", icon: "Setting", sortOrder: 100 },
      ];

      for (const menu of menuData) {
        await tx.menu.create({
          data: {
            ...menu,
            status: "active",
          },
        });
      }

      // 5.7 记录初始化状态
      await tx.systemInitStatus.upsert({
        where: { id: existingInit?.id || 0 },
        create: {
          initStep: "completed",
          stepStatus: "completed",
          completedAt: new Date(),
          configData: JSON.stringify({
            database: data.database,
            admin: { username, realName },
          }),
        },
        update: {
          stepStatus: "completed",
          completedAt: new Date(),
          configData: JSON.stringify({
            database: data.database,
            admin: { username, realName },
          }),
        },
      });

      console.log("系统初始化完成");
    });

    return successResponse({
      message: mode === "reuse" ? "系统配置已更新，保留现有业务数据" : "系统初始化完成",
      mode,
    });
  } catch (error: any) {
    console.error("系统初始化失败", error);
    return errorResponse(error.message || "系统初始化失败", 500);
  }
}
