// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * 系统初始化设置API
 * 支持分步骤初始化：
 * 1. 保存配置文件（数据库、存储） -> /api/system/init/config/save
 * 2. 创建超级管理员 -> 本接口
 * 3. 完成初始化 -> 本接口
 */

import { NextRequest, NextResponse } from "next/server";
import { configExists, readConfig, markAsInitialized, getDatabaseUrl } from "@/lib/config";
import { PrismaClient } from '@prisma/client';
import { hashPassword } from "@/lib/auth/jwt";

// 创建者ID：0 表示系统创建
const SYSTEM_CREATOR_ID = 0;

/**
 * 检查配置状态
 */
export async function GET() {
  try {
    if (!configExists()) {
      return NextResponse.json({
        code: 200,
        message: "配置文件不存在",
        data: {
          configured: false,
          initialized: false,
        },
      });
    }

    const config = readConfig();
    if (!config) {
      return NextResponse.json({
        code: 500,
        message: "配置文件已损坏",
      });
    }

    return NextResponse.json({
      code: 200,
      message: "配置已就绪",
      data: {
        configured: true,
        initialized: config.system.initialized,
        systemName: config.system.name,
      },
    });
  } catch (error: any) {
    console.error("Init check error:", error);
    return NextResponse.json({
      code: 500,
      message: "检查失败: " + error.message,
    });
  }
}

/**
 * 执行系统初始化
 * POST body: {
 *   mode: 'new' | 'reuse',  // 新建或重用数据
 *   admin: {
 *     username: string,
 *     password: string,
 *     realName: string,
 *     phone?: string,
 *     email?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 检查配置文件是否存在
    if (!configExists()) {
      return NextResponse.json({
        code: 400,
        message: "请先配置数据库和存储",
        data: { step: 'config' },
      });
    }

    // 2. 读取配置
    const config = readConfig();
    if (!config) {
      return NextResponse.json({
        code: 500,
        message: "配置文件已损坏",
      });
    }

    // 3. 解析请求参数
    let data: any;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ code: 400, message: "无效的请求参数" });
    }

    // 4. 参数校验
    const { mode = 'new', admin } = data;

    if (!admin?.username || admin.username.length < 2) {
      return NextResponse.json({ code: 400, message: "管理员用户名至少2个字符" });
    }

    if (!admin?.password || admin.password.length < 6) {
      return NextResponse.json({ code: 400, message: "密码至少6个字符" });
    }

    if (!admin?.realName) {
      return NextResponse.json({ code: 400, message: "请输入管理员姓名" });
    }

    // 5. 创建数据库连接（使用配置文件中的数据库）
    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      return NextResponse.json({
        code: 500,
        message: "数据库配置无效",
      });
    }

    // 创建临时的 PrismaClient 使用配置文件中的数据库
    const initPrisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: ['error'],
    });

    try {
      // 测试数据库连接
      await initPrisma.$connect();

      // 6. 在事务中执行初始化
      await initPrisma.$transaction(async (tx) => {
        const reuseData = mode === 'reuse';

        if (!reuseData) {
          // ===== 不重用数据：清空所有数据 =====
          await tx.userRole.deleteMany({});
          await tx.rolePermission.deleteMany({});
          await tx.roleDeptScope.deleteMany({});
          await tx.user.deleteMany({});
          await tx.role.deleteMany({});
          await tx.dept.deleteMany({});
          await tx.menu.deleteMany({});
        }

        // ===== 角色：超级管理员 =====
        let superAdminRole = await tx.role.findFirst({
          where: { roleCode: "super_admin", isDelete: false },
        });

        if (!superAdminRole) {
          superAdminRole = await tx.role.create({
            data: {
              roleCode: "super_admin",
              roleName: "超级管理员",
              dataScope: "all",
              status: "active",
              sortOrder: 1,
              createdBy: SYSTEM_CREATOR_ID,
              remark: "系统内置超级管理员角色，拥有全部权限",
            },
          });
        }

        // ===== 部门：IT部 =====
        let itDept = await tx.dept.findFirst({
          where: { deptCode: "IT", isDelete: false },
        });

        if (!itDept) {
          itDept = await tx.dept.create({
            data: {
              deptCode: "IT",
              deptName: "IT部",
              sortOrder: 0,
              status: "active",
              createdBy: SYSTEM_CREATOR_ID,
              remark: "系统默认IT部门",
            },
          });
        }

        // ===== 用户：超级管理员 =====
        const hashedPassword = await hashPassword(admin.password);

        let adminUser = await tx.user.findFirst({
          where: { username: admin.username, isDelete: false },
        });

        if (adminUser) {
          adminUser = await tx.user.update({
            where: { id: adminUser.id },
            data: {
              password: hashedPassword,
              realName: admin.realName,
              phone: admin.phone || null,
              email: admin.email || null,
              deptId: itDept.id,
              status: "active",
              roleIds: JSON.stringify([superAdminRole.id]),
              modifiedBy: SYSTEM_CREATOR_ID,
            },
          });
        } else {
          adminUser = await tx.user.create({
            data: {
              username: admin.username,
              password: hashedPassword,
              realName: admin.realName,
              phone: admin.phone || null,
              email: admin.email || null,
              deptId: itDept.id,
              userType: "internal",
              roleIds: JSON.stringify([superAdminRole.id]),
              status: "active",
              createdBy: SYSTEM_CREATOR_ID,
            },
          });
        }

        // ===== 角色-用户关联 =====
        const existingRoleUser = await tx.userRole.findFirst({
          where: { userId: adminUser.id, roleId: superAdminRole.id },
        });

        if (!existingRoleUser) {
          await tx.userRole.create({
            data: {
              userId: adminUser.id,
              roleId: superAdminRole.id,
            },
          });
        }

        // ===== 创建默认菜单（仅在新建时） =====
        if (!reuseData) {
          // 创建系统管理目录
          const systemDir = await tx.menu.create({
            data: {
              menuName: "系统管理",
              menuType: "directory",
              icon: "Settings",
              path: "/dashboard/system",
              sortOrder: 100,
              status: "active",
              createdBy: SYSTEM_CREATOR_ID,
            },
          });

          // 创建子菜单
          const subMenus = [
            { menuName: "用户管理", menuType: "menu", path: "/dashboard/system/user", sortOrder: 1 },
            { menuName: "角色管理", menuType: "menu", path: "/dashboard/system/role", sortOrder: 2 },
            { menuName: "部门管理", menuType: "menu", path: "/dashboard/system/dept", sortOrder: 3 },
            { menuName: "菜单管理", menuType: "menu", path: "/dashboard/system/menu", sortOrder: 4 },
          ];

          for (const menu of subMenus) {
            await tx.menu.create({
              data: {
                ...menu,
                parentId: systemDir.id,
                status: "active",
                createdBy: SYSTEM_CREATOR_ID,
              },
            });
          }

          // ===== 角色权限：超级管理员拥有所有菜单权限 =====
          const allMenus = await tx.menu.findMany({
            where: { isDelete: false },
          });

          for (const menu of allMenus) {
            await tx.rolePermission.create({
              data: {
                roleId: superAdminRole.id,
                menuId: menu.id,
                permission: "*",
              },
            });
          }

          // ===== 部门权限 =====
          await tx.roleDeptScope.create({
            data: {
              roleId: superAdminRole.id,
              deptId: itDept.id,
            },
          });
        }

        // ===== 记录初始化状态 =====
        await tx.systemInitStatus.upsert({
          where: { id: 1 },
          create: {
            initStep: "completed",
            stepStatus: "completed",
            completedAt: new Date(),
            configData: JSON.stringify({
              database: {
                host: config.database.host,
                port: config.database.port,
                username: config.database.username,
                database: config.database.name,
              },
              adminUsername: admin.username,
              mode,
            }),
          },
          update: {
            stepStatus: "completed",
            completedAt: new Date(),
          },
        });
      });

      // 7. 标记系统已初始化
      markAsInitialized();

      return NextResponse.json({
        code: 200,
        message: "系统初始化完成",
        data: {
          mode,
          adminUsername: admin.username,
        },
      });
    } finally {
      await initPrisma.$disconnect();
    }
  } catch (error: any) {
    console.error("系统初始化失败", error);

    if (error.code === 'P2002') {
      return NextResponse.json({
        code: 400,
        message: "用户名已存在，请使用其他用户名",
      });
    }

    return NextResponse.json({
      code: 500,
      message: error.message || "系统初始化失败",
    });
  }
}
