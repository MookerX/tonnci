/**
 * 系统初始化状态检查API
 * 通过 config_data 中的主数据库信息判断是否已初始化
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 检查系统初始化状态
    const initStatus = await prisma.systemInitStatus.findFirst({
      where: { initStep: "completed" },
      orderBy: { updatedAt: "desc" },
    });

    // 从 configData 中解析主数据库配置
    let databaseConfig: any = null;
    let isInitialized = false;
    let connectionTest = { success: false, message: "未测试" };

    if (initStatus?.configData) {
      try {
        const config = JSON.parse(initStatus.configData);
        if (config.database && config.database.host) {
          databaseConfig = config.database;
          isInitialized = true;
          // 尝试连接主数据库
          try {
            const mysql = require("mysql2/promise");
            const connection = await mysql.createConnection({
              host: config.database.host,
              port: config.database.port || 3306,
              user: config.database.username,
              password: config.database.password,
              database: config.database.database,
              connectTimeout: 5000,
            });
            await connection.end();
            connectionTest = { success: true, message: "连接成功" };
          } catch (dbError: any) {
            connectionTest = { 
              success: false, 
              message: `连接失败: ${dbError.message}` 
            };
          }
        }
      } catch (e) {
        console.error("解析初始化配置失败", e);
      }
    }

    return NextResponse.json({
      code: 200,
      message: "获取初始化状态成功",
      data: {
        isInitialized,
        databaseConfig,
        connectionTest,
      },
    });
  } catch (error: any) {
    console.error("检查初始化状态失败", error);
    return NextResponse.json({
      code: 500,
      message: error.message || "检查初始化状态失败",
      data: null,
    });
  }
}
