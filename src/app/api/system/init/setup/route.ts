// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * 系统初始化设置API
 * 支持分步骤初始化：
 * 1. 保存配置文件（数据库） -> /api/system/init/config/save
 * 2. 创建超级管理员 -> 本接口
 * 3. 完成初始化 -> 本接口
 */

import { NextRequest, NextResponse } from "next/server";
import { configExists, readConfig, getDatabaseUrl, updateInitInfo } from "@/lib/config";
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

    // 检查是否已初始化（通过systemInitStatus表）
    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      return NextResponse.json({
        code: 200,
        message: "配置文件存在，系统未初始化",
        data: {
          configured: true,
          initialized: false,
          config: {
            database: {
              host: config.database.host,
              port: config.database.port,
              username: config.database.username,
              database: config.database.name,
            },
          },
        },
      });
    }

    // 尝试连接数据库检查初始化状态
    try {
      const checkPrisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
        log: ['error'],
      });
      
      const initStatus = await checkPrisma.systemInitStatus.findFirst();
      await checkPrisma.$disconnect();
      
      if (initStatus && initStatus.stepStatus === 'completed') {
        return NextResponse.json({
          code: 200,
          message: "系统已初始化",
          data: {
            configured: true,
            initialized: true,
            config: {
              database: {
                host: config.database.host,
                port: config.database.port,
                username: config.database.username,
                database: config.database.name,
              },
            },
          },
        });
      }
    } catch {
      // 数据库连接失败或表不存在
    }

    return NextResponse.json({
      code: 200,
      message: "配置文件存在，系统未初始化",
      data: {
        configured: true,
        initialized: false,
        config: {
          database: {
            host: config.database.host,
            port: config.database.port,
            username: config.database.username,
            database: config.database.name,
          },
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
      message: "请先配置数据库",
    });
  }

  const config = readConfig();
  if (!config) {
    return NextResponse.json({
      code: 500,
      message: "配置文件已损坏",
    });
  }

  // 2. 获取数据库连接
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return NextResponse.json({
      code: 500,
      message: "无法获取数据库连接信息",
    });
  }

  let data: any;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ code: 400, message: "无效的请求参数" });
  }

  // 3. 参数校验
  const { mode = 'new', admin, systemName = '腾曦生产管理系统' } = data;

  if (!admin?.username || admin.username.length < 2) {
    return NextResponse.json({ code: 400, message: "管理员用户名至少2个字符" });
  }

  if (!admin?.password || admin.password.length < 6) {
    return NextResponse.json({ code: 400, message: "管理员密码至少6个字符" });
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

    // 5. 检查是否已初始化
    const existingStatus = await initPrisma.systemInitStatus.findFirst();
    const isAlreadyInitialized = existingStatus && existingStatus.stepStatus === 'completed';

    // 6. 根据模式处理数据
    const reuseData = mode === 'reuse';

    if (isAlreadyInitialized) {
      // 系统已初始化
      if (reuseData) {
        // 重用数据模式：检验数据完整性
        const tables = ['role', 'dept', 'user', 'menu'];
        const missingTables: string[] = [];

        for (const table of tables) {
          try {
            // @ts-ignore - 动态检查表
            const count = await (initPrisma as any)[table].count();
            if (count === 0) {
              missingTables.push(table);
            }
          } catch {
            missingTables.push(table);
          }
        }

        if (missingTables.length > 0) {
          return NextResponse.json({
            code: 400,
            message: `重用数据模式检测到数据不完整，缺少表或数据: ${missingTables.join(', ')}，请选择清空数据模式`,
          });
        }

        // 数据完整，继续重用模式
      } else {
        // 清空数据模式：清除所有业务数据
        await initPrisma.userRole.deleteMany({});
        await initPrisma.rolePermission.deleteMany({});
        await initPrisma.roleDeptScope.deleteMany({});
        await initPrisma.user.deleteMany({});
        await initPrisma.role.deleteMany({});
        await initPrisma.dept.deleteMany({});
        await initPrisma.menu.deleteMany({});
        await initPrisma.systemInitStatus.deleteMany({});
      }
    } else if (!reuseData) {
      // 未初始化且选择清空数据模式：清空所有数据
      await initPrisma.userRole.deleteMany({});
      await initPrisma.rolePermission.deleteMany({});
      await initPrisma.roleDeptScope.deleteMany({});
      await initPrisma.user.deleteMany({});
      await initPrisma.role.deleteMany({});
      await initPrisma.dept.deleteMany({});
      await initPrisma.menu.deleteMany({});
      await initPrisma.systemInitStatus.deleteMany({});
    }
    // 重用数据模式且未初始化：不需要清理，直接创建数据

    // 7. 创建超级管理员角色
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

    // 8. 创建IT部门
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

    // 9. 创建超级管理员用户
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

    // 10. 创建角色-用户关联
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

    // 11. 创建默认菜单（仅在新建时）
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

      // 12. 超级管理员拥有所有菜单权限
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

      // 13. 部门权限
      await initPrisma.roleDeptScope.create({
        data: {
          roleId: superAdminRole.id,
          deptId: itDept.id,
        },
      });
    }

    // 14. 保存系统配置到数据库
    const systemConfigs = [
      { paramKey: 'system_name', paramValue: systemName, paramType: 'string', remark: '系统名称' },
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

    // 15. 保存存储配置到数据库（系统图片文件存储）
    const initStorage = await initPrisma.storageConfig.findFirst({
      where: { storageName: '系统图片文件存储' },
    });

    if (!initStorage) {
      await initPrisma.storageConfig.create({
        data: {
          storageName: '系统图片文件存储',
          storageType: 'local',
          basePath: config.storage?.path || '/workspace/projects/storage',
          fileTypes: 'jpg,jpeg,png,gif,bmp,webp,svg,ico,pdf,doc,docx,xls,xlsx,ppt,pptx',
          isDefault: true,
          status: 'active',
        },
      });
    }

    // 15. 把初始化状态写入配置文件（配置文件存在=已初始化）
    updateInitInfo({
      initialized: true,
      initializedAt: new Date().toISOString(),
    });

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
