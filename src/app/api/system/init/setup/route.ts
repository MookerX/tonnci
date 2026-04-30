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
import { configExists, readConfig, getDatabaseUrl } from "@/lib/config";
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

    if (!config.initialized) {
      return NextResponse.json({
        code: 200,
        message: "配置文件已存在，系统未初始化",
        data: {
          configured: true,
          initialized: false,
          config: {
            systemName: config.systemName,
            database: {
              host: config.database.host,
              port: config.database.port,
              username: config.database.username,
              database: config.database.name,
            },
            storage: config.storage,
            initializedAt: config.initializedAt,
          },
        },
      });
    }

    return NextResponse.json({
      code: 200,
      message: "系统已初始化",
      data: {
        configured: true,
        initialized: true,
        config: {
          systemName: config.systemName,
          initializedAt: config.initializedAt,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      code: 500,
      message: error.message || "检查配置状态失败",
    });
  }
}

/**
 * 提交系统初始化
 */
export async function POST(request: NextRequest) {
  // 1. 检查配置文件
  if (!configExists()) {
    return NextResponse.json({
      code: 400,
      message: "请先配置数据库和存储",
    });
  }

  const config = readConfig();
  if (!config) {
    return NextResponse.json({
      code: 500,
      message: "配置文件已损坏",
    });
  }

  if (config.initialized) {
    return NextResponse.json({
      code: 400,
      message: "系统已初始化，如需重新初始化请先清除配置",
    });
  }

  let data: any;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ code: 400, message: "无效的请求参数" });
  }

  // 2. 参数校验
  const { mode = 'new', admin } = data;

  if (!admin?.username || admin.username.length < 2) {
    return NextResponse.json({ code: 400, message: "管理员用户名至少2个字符" });
  }

  if (!admin?.password || admin.password.length < 6) {
    return NextResponse.json({ code: 400, message: "管理员密码至少6个字符" });
  }

  // 3. 获取数据库连接
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return NextResponse.json({ code: 500, message: "无法获取数据库连接信息" });
  }

  // 4. 创建独立的Prisma实例
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

    // 5. 根据模式清理数据
    const reuseData = mode === 'reuse';

    if (!reuseData) {
      // 清空所有数据（按依赖顺序）
      await initPrisma.userRole.deleteMany({});
      await initPrisma.rolePermission.deleteMany({});
      await initPrisma.roleDeptScope.deleteMany({});
      await initPrisma.user.deleteMany({});
      await initPrisma.role.deleteMany({});
      await initPrisma.dept.deleteMany({});
      await initPrisma.menu.deleteMany({});
      await initPrisma.systemInitStatus.deleteMany({});
    }

    // 6. 创建超级管理员角色
    let superAdminRole = await initPrisma.role.findFirst({
      where: { roleCode: "super_admin", isDelete: false },
    });

    if (!superAdminRole) {
      superAdminRole = await initPrisma.role.create({
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

    // 7. 创建IT部门
    let itDept = await initPrisma.dept.findFirst({
      where: { deptCode: "IT", isDelete: false },
    });

    if (!itDept) {
      itDept = await initPrisma.dept.create({
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

    // 8. 创建超级管理员用户
    const hashedPassword = await hashPassword(admin.password);

    let adminUser = await initPrisma.user.findFirst({
      where: { username: admin.username, isDelete: false },
    });

    if (adminUser) {
      adminUser = await initPrisma.user.update({
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
      const { v4: uuidv4 } = require('uuid');
      adminUser = await initPrisma.user.create({
        data: {
          username: admin.username,
          password: hashedPassword,
          realName: admin.realName,
          phone: admin.phone || null,
          email: admin.email || null,
          uuid: uuidv4(),
          deptId: itDept.id,
          userType: "internal",
          roleIds: JSON.stringify([superAdminRole.id]),
          status: "active",
          createdBy: SYSTEM_CREATOR_ID,
        },
      });
    }

    // 9. 创建角色-用户关联
    const existingRoleUser = await initPrisma.userRole.findFirst({
      where: { userId: adminUser.id, roleId: superAdminRole.id },
    });

    if (!existingRoleUser) {
      await initPrisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      });
    }

    // 10. 创建默认菜单（仅在新建时）
    if (!reuseData) {
      // 创建系统管理目录
      const systemDir = await initPrisma.menu.create({
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
        await initPrisma.menu.create({
          data: {
            ...menu,
            parentId: systemDir.id,
            status: "active",
            createdBy: SYSTEM_CREATOR_ID,
          },
        });
      }

      // 11. 超级管理员拥有所有菜单权限
      const allMenus = await initPrisma.menu.findMany({
        where: { isDelete: false },
      });

      for (const menu of allMenus) {
        await initPrisma.rolePermission.create({
          data: {
            roleId: superAdminRole.id,
            menuId: menu.id,
            permission: "*",
          },
        });
      }

      // 12. 部门权限
      await initPrisma.roleDeptScope.create({
        data: {
          roleId: superAdminRole.id,
          deptId: itDept.id,
        },
      });
    }

    // 13. 记录初始化状态
    await initPrisma.systemInitStatus.upsert({
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

    // 14. 保存系统配置到数据库（仅系统名称和版本，敏感信息在加密配置文件中）
    const systemConfigs = [
      { paramKey: 'system_name', paramValue: config.system.name || '腾曦生产管理系统', paramType: 'string', remark: '系统名称' },
      { paramKey: 'system_version', paramValue: '1.0.0', paramType: 'string', remark: '系统版本' },
    ];

    for (const cfg of systemConfigs) {
      await initPrisma.systemConfig.upsert({
        where: { paramKey: cfg.paramKey },
        create: {
          ...cfg,
          createdBy: SYSTEM_CREATOR_ID,
        },
        update: {
          paramValue: cfg.paramValue,
          modifiedBy: SYSTEM_CREATOR_ID,
        },
      });
    }

    // 15. 标记系统已初始化
    // 配置文件只保存数据库信息，不需要更新

    return NextResponse.json({
      code: 200,
      message: "系统初始化完成",
      data: {
        mode,
        adminUsername: admin.username,
      },
    });
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
  } finally {
    await initPrisma.$disconnect();
  }
}
