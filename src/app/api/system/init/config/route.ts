// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * 系统配置检查API
 * GET: 检查配置文件是否存在及状态
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

    // 读取配置（不包含敏感信息）
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

    return NextResponse.json({
      code: 200,
      message: "配置文件存在",
      data: {
        exists: true,
        initialized: config.system.initialized,
        initializedAt: config.system.initializedAt,
        systemName: config.system.name,
        // 不返回敏感信息
        database: {
          host: config.database.host,
          port: config.database.port,
          name: config.database.name,
          // 不返回用户名密码
          hasCredentials: !!(config.database.username && config.database.password),
        },
        storage: {
          type: config.storage.type,
          path: config.storage.path,
        },
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
