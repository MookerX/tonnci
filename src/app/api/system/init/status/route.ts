// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
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
    let adminUser: any = null;
    let hasData = false; // 主数据库是否有数据

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
            
            // 连接成功，查询当前管理员信息和数据量
            const [userRows]: any = await connection.query(`
              SELECT u.username, u.real_name as realName, u.status, u.dept_id as deptId
              FROM user u
              INNER JOIN user_role ur ON u.id = ur.user_id
              INNER JOIN role r ON ur.role_id = r.id
              WHERE r.role_code = 'super_admin' AND u.isDelete = 0
              LIMIT 1
            `);
            
            // 查询用户数量判断是否有数据
            const [countResult]: any = await connection.query(`
              SELECT COUNT(*) as count FROM user WHERE isDelete = 0
            `);
            hasData = countResult && countResult[0]?.count > 0;
            
            await connection.end();
            
            connectionTest = { success: true, message: "连接成功" };
            if (userRows && userRows.length > 0) {
              adminUser = {
                username: userRows[0].username,
                realName: userRows[0].realName,
              };
            }
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
        adminUser,
        hasData,
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
