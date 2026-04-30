// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * 系统配置检查API
 * GET: 检查配置文件是否存在及状态
 */

import { NextResponse } from "next/server";
import { configExists, readConfig } from "@/lib/config";
import prisma from "@/lib/prisma";

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

    // 检查是否已初始化完成
    let initialized = false;
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

      // 检查 system_init_status 表
      const initStatus = await configDb.systemInitStatus.findFirst({
        where: { stepStatus: "completed", isDelete: false },
        orderBy: { updatedAt: "desc" },
      });

      if (initStatus) {
        initialized = true;
        const configData = JSON.parse(initStatus.configData || "{}");
        adminInfo = {
          username: configData.adminUsername,
          realName: configData.adminRealName,
        };
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
        // 数据库信息
        database: {
          host: config.database.host,
          port: config.database.port,
          name: config.database.name,
          hasCredentials: !!(config.database.username && config.database.password),
        },
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
