// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * 系统配置检查API
 * GET: 检查配置文件是否存在及状态
 * 规则：
 * - 配置文件(.config/system.enc)存在 = 已初始化
 * - 配置文件只存储：initialized 标记
 * - 从数据库读取：systemName、adminInfo、storageType
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
    let storageType = "未设置";
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
      const systemConfigs = await configDb.systemConfig.findMany({
        where: { isDelete: false },
      });

      for (const cfg of systemConfigs) {
        if (cfg.paramKey === "system_name") {
          systemName = cfg.paramValue || "未设置";
        }
      }

      // 读取存储配置（如果有）
      const storageConfig = await configDb.storageConfig.findFirst({
        where: { isDelete: false },
        orderBy: { createdAt: "desc" },
      });
      if (storageConfig) {
        storageType = storageConfig.storageType === "local" ? "本地存储" 
          : storageConfig.storageType === "nas" ? "NAS存储" 
          : storageConfig.storageType === "oss" ? "对象存储" 
          : "未设置";
      }

      // 管理员信息（从配置文件读取：adminUsername/adminRealName）
      const adminUsername = config.initInfo?.adminUsername;
      const adminRealName = config.initInfo?.adminRealName;
      if (adminUsername) {
        adminInfo = {
          username: adminUsername,
          realName: adminRealName || "未知",
        };
      } else if (adminRole) {
        const adminUser = await configDb.user.findFirst({
          where: { roleId: adminRole.id, isDelete: false },
        });
        if (adminUser) {
          adminInfo = {
            username: adminUser.username,
            realName: adminUser.realName,
          };
        }
      }

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
        storageType,
        // 管理员信息（从数据库读取）
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
