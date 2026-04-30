// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * 系统配置检查API
 * GET: 检查配置文件是否存在及状态
 * 规则：
 * - 配置文件(.config/system.enc)存在 = 已初始化
 * - 配置文件只存储：数据库连接信息、initialized 标记
 * - 从数据库读取：systemName、adminInfo、storageInfo
 */

import { NextResponse } from "next/server";
import { configExists, readConfig } from "@/lib/config";

export async function GET() {
  try {
    const exists = configExists();

    if (!exists) {
      return NextResponse.json({
        code: 200,
        message: "配置文件不存在",
        data: {
          exists: false,
          initialized: false,
        },
      });
    }

    // 读取配置
    const config = readConfig();

    if (!config) {
      return NextResponse.json({
        code: 200,
        message: "配置文件已损坏",
        data: {
          exists: false,
          initialized: false,
        },
      });
    }

    // 从配置文件读取初始化状态
    const initInfo = config.initInfo || {};
    const initialized = initInfo.initialized || false;
    const initializedAt = initInfo.initializedAt || null;

    // 从数据库读取其他信息
    let systemName = "未设置";
    let storageInfo = null;
    let adminInfo = null;

    try {
      // 创建新的 Prisma 客户端连接到配置中的数据库
      const { PrismaClient } = await import("@prisma/client");
      const configDb = new PrismaClient({
        datasources: {
          db: {
            url: `mysql://${config.database.username}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`,
          },
        },
      });

      // 读取系统配置
      const systemConfig = await configDb.systemConfig.findFirst({
        where: { paramKey: "system_name", isDelete: false },
      });
      if (systemConfig) {
        systemName = systemConfig.paramValue || "未设置";
      }

      // 读取存储配置（名称为"系统图片文件存储"）
      const storageConfig = await configDb.storageConfig.findFirst({
        where: { 
          storageName: "系统图片文件存储",
          isDelete: false 
        },
      });
      if (storageConfig) {
        storageInfo = {
          storageType: storageConfig.storageType === "local" ? "本地存储" 
            : storageConfig.storageType === "nas" ? "NAS存储" 
            : storageConfig.storageType === "oss" ? "对象存储" 
            : "未设置",
          storagePath: storageConfig.basePath || "未设置",
        };
      }

      // 读取超级管理员（创建时间最早的用户）
      const adminUser = await configDb.user.findFirst({
        where: { isDelete: false },
        orderBy: { createdAt: "asc" },
      });
      if (adminUser) {
        adminInfo = {
          username: adminUser.username,
          realName: adminUser.realName || adminUser.username,
          createdAt: adminUser.createdAt,
        };
      }
      console.log("Admin user query result:", adminUser);

      await configDb.$disconnect();
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      // 数据库连接失败时，不影响返回
    }

    return NextResponse.json({
      code: 200,
      message: initialized ? "系统已初始化" : "配置文件存在",
      data: {
        exists: true,
        initialized,
        initializedAt,
        // 数据库信息
        database: {
          host: config.database.host,
          port: config.database.port,
          name: config.database.name,
          hasCredentials: !!(config.database.username && config.database.password),
        },
        // 系统信息（从数据库读取）
        systemName,
        // 存储信息（从数据库读取：系统图片文件存储）
        storageInfo,
        // 管理员信息（从数据库读取：创建时间最早的超级管理员）
        adminInfo,
      },
    });
  } catch (error: any) {
    console.error("Config check error:", error);
    return NextResponse.json({
      code: 500,
      message: "检查配置失败",
    });
  }
}
