/**
 * 系统初始化设置接口
 * 支持首次初始化和重新初始化
 * 重用数据模式：保留现有角色、部门、用户，只更新管理员信息
 * 不重用/首次初始化：清空所有数据后重新创建
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/jwt";

// 创建者ID：0 表示系统创建
const SYSTEM_CREATOR_ID = 0;

// 参数校验
function validateParams(data: any): { valid: boolean; message?: string } {
  const username = data.admin?.username || data.adminUsername;
  const password = data.admin?.password || data.adminPassword;
  const realName = data.admin?.realName || data.adminRealName;

  if (!username || username.length < 2) {
    return { valid: false, message: "管理员用户名至少2个字符" };
  }

  if (!password || password.length < 6) {
    return { valid: false, message: "密码至少6个字符" };
  }

  if (!realName) {
    return { valid: false, message: "请输入管理员姓名" };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求参数
    let data: any;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ code: 400, message: "无效的请求参数" });
    }

    // 2. 参数校验
    const validation = validateParams(data);
    if (!validation.valid) {
      return NextResponse.json({ code: 400, message: validation.message });
    }

    // 3. 获取参数
    const mode = data.mode || "new"; // 'reuse' | 'clear' | 'new'
    const username = data.admin?.username || data.adminUsername;
    const password = data.admin?.password || data.adminPassword;
    const realName = data.admin?.realName || data.adminRealName;
    const database = data.database || {};

    // 4. 执行初始化
    await prisma.$transaction(async (tx) => {
      // 判断是否重用数据
      const reuseData = mode === "reuse";
      
      if (!reuseData) {
        // ===== 不重用数据：清空所有数据 =====
        // 先删除关联表
        await tx.userRole.deleteMany({});
        await tx.rolePermission.deleteMany({});
        await tx.roleDeptScope.deleteMany({});
        // 清空主表
        await tx.user.deleteMany({});
        await tx.role.deleteMany({});
        await tx.dept.deleteMany({});
        await tx.menu.deleteMany({});
      }

      // ===== 角色：超级管理员 =====
      let superAdminRole = await tx.role.findFirst({
        where: { roleCode: "super_admin", isDelete: false }
      });
      
      if (!superAdminRole) {
        // 不存在则创建
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
        where: { deptCode: "IT", isDelete: false }
      });
      
      if (!itDept) {
        // 不存在则创建
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
      const hashedPassword = await hashPassword(password);
      
      let adminUser = await tx.user.findFirst({
        where: { username: username, isDelete: false }
      });
      
      if (adminUser) {
        // 用户已存在，更新信息
        adminUser = await tx.user.update({
          where: { id: adminUser.id },
          data: {
            password: hashedPassword,
            realName,
            deptId: itDept.id,
            status: "active",
            roleIds: JSON.stringify([superAdminRole.id]),
          },
        });
        
        // 更新用户角色关联
        await tx.userRole.deleteMany({ where: { userId: adminUser.id } });
        await tx.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: superAdminRole.id,
          },
        });
      } else {
        // 用户不存在则创建
        adminUser = await tx.user.create({
          data: {
            uuid: crypto.randomUUID(),
            username,
            password: hashedPassword,
            realName,
            deptId: itDept.id,
            status: "active",
            roleIds: JSON.stringify([superAdminRole.id]),
            createdBy: SYSTEM_CREATOR_ID,
          },
        });
        
        // 创建用户角色关联
        await tx.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: superAdminRole.id,
          },
        });
      }

      // ===== 存储：系统图片存储 =====
      let imageStorage = await tx.storageConfig.findFirst({
        where: { storageName: "系统图片存储", isDelete: false }
      });
      
      if (!imageStorage) {
        await tx.storageConfig.create({
          data: {
            storageName: "系统图片存储",
            storageType: "local",
            basePath: "/workspace/projects/storage/images",
            fileTypes: ".png,.gif,.jpg,.jpeg,.webp,.avif,.svg",
            maxFileSize: 10485760,
            isDefault: true,
            status: "active",
            createdBy: SYSTEM_CREATOR_ID,
            remark: "系统默认图片存储，绑定常用图片格式",
          },
        });
      }

      // ===== 菜单：系统管理 =====
      // 首次初始化才创建菜单
      if (!reuseData) {
        const systemDir = await tx.menu.create({
          data: {
            menuName: "系统管理",
            menuType: "directory",
            path: "/dashboard/system",
            icon: "Setting",
            sortOrder: 100,
            status: "active",
            createdBy: SYSTEM_CREATOR_ID,
          },
        });

        const subMenus = [
          { menuName: "用户管理", menuType: "menu", path: "/dashboard/system/user", component: "dashboard/system/user/page", sortOrder: 1 },
          { menuName: "角色管理", menuType: "menu", path: "/dashboard/system/role", component: "dashboard/system/role/page", sortOrder: 2 },
          { menuName: "部门管理", menuType: "menu", path: "/dashboard/system/dept", component: "dashboard/system/dept/page", sortOrder: 3 },
          { menuName: "菜单管理", menuType: "menu", path: "/dashboard/system/menu", component: "dashboard/system/menu/page", sortOrder: 4 },
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
              host: database.host,
              port: database.port,
              username: database.username,
              password: database.password,
              database: database.database,
            },
          }),
        },
        update: {
          stepStatus: "completed",
          completedAt: new Date(),
          configData: JSON.stringify({
            database: {
              host: database.host,
              port: database.port,
              username: database.username,
              password: database.password,
              database: database.database,
            },
          }),
        },
      });
    });

    return NextResponse.json({
      code: 200,
      message: "系统初始化完成",
      data: { mode },
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
  }
}
