/**
 * 系统初始化状态检查API
 * 检查系统是否已完成初始化
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

    const isInitialized = !!initStatus;

    // 检查数据库中是否有数据
    let hasData = false;
    let databaseConfig: any = null;
    let adminUser: any = null;

    if (isInitialized && initStatus?.configData) {
      try {
        const config = JSON.parse(initStatus.configData);
        databaseConfig = config.database;
        adminUser = config.admin;
      } catch (e) {
        console.error("解析初始化配置失败", e);
      }
    }

    // 检查业务数据
    if (isInitialized) {
      try {
        const userCount = await prisma.user.count({ where: { isDelete: false } });
        hasData = userCount > 0;

        if (adminUser && userCount === 0) {
          hasData = false;
        }
      } catch (e) {
        hasData = false;
      }
    }

    return NextResponse.json({
      code: 200,
      message: "获取初始化状态成功",
      data: {
        isInitialized,
        hasData,
        databaseConfig,
        adminUser,
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
