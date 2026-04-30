// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * 系统配置写入API
 * POST: 保存配置文件
 */

import { NextRequest, NextResponse } from "next/server";
import { writeConfig, readConfig, SystemConfig } from "@/lib/config";
import * as mysql from 'mysql2/promise';
import * as fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // 验证必要参数
    if (!data.database || !data.storage) {
      return NextResponse.json({
        code: 400,
        message: "缺少必要的配置参数",
      });
    }

    const configData: SystemConfig = {
      database: {
        host: data.database.host || '127.0.0.1',
        port: parseInt(data.database.port) || 3306,
        username: data.database.username || 'root',
        password: data.database.password || '',
        name: data.database.name || 'tengxi_pms',
      },
      storage: {
        type: data.storage.type || 'local',
        path: data.storage.path || '',
        nasHost: data.storage.nasHost,
        nasUsername: data.storage.nasUsername,
        nasPassword: data.storage.nasPassword,
      },
      system: {
        name: data.systemName || '腾曦生产管理系统',
        initialized: false,
      },
    };

    // 测试数据库连接
    const dbTestResult = await testDatabaseConnection(configData);
    if (!dbTestResult.success) {
      return NextResponse.json({
        code: 400,
        message: "数据库连接失败: " + dbTestResult.error,
        data: {
          step: 'database',
          error: dbTestResult.error,
        },
      });
    }

    // 测试存储路径
    const storageTestResult = testStoragePath(configData);
    if (!storageTestResult.success) {
      return NextResponse.json({
        code: 400,
        message: "存储路径不可用: " + storageTestResult.error,
        data: {
          step: 'storage',
          error: storageTestResult.error,
        },
      });
    }

    // 保存配置
    const saved = writeConfig(configData);
    if (!saved) {
      return NextResponse.json({
        code: 500,
        message: "保存配置失败",
      });
    }

    // 检查是否有老数据
    const hasOldData = await checkOldData(configData);

    return NextResponse.json({
      code: 200,
      message: "配置保存成功",
      data: {
        configSaved: true,
        databaseConnected: true,
        storageReady: true,
        hasOldData: hasOldData.hasData,
        tablesInfo: hasOldData.tablesInfo,
        step: 'config_saved',
      },
    });
  } catch (error: any) {
    console.error("Config save error:", error);
    return NextResponse.json({
      code: 500,
      message: "保存配置失败: " + error.message,
    });
  }
}

/**
 * 测试数据库连接
 */
async function testDatabaseConnection(config: SystemConfig): Promise<{ success: boolean; error?: string }> {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.name,
      connectTimeout: 5000,
    });

    await connection.ping();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 测试存储路径
 */
function testStoragePath(config: SystemConfig): { success: boolean; error?: string } {
  try {
    const storagePath = config.storage.path;

    if (!storagePath) {
      return { success: false, error: "存储路径不能为空" };
    }

    // 检查父目录是否存在
    const parentDir = storagePath.includes('/')
      ? storagePath.substring(0, storagePath.lastIndexOf('/'))
      : storagePath.substring(0, storagePath.lastIndexOf('\\'));

    if (!fs.existsSync(parentDir)) {
      return { success: false, error: "父目录不存在" };
    }

    // 尝试创建目录（如果不存在）
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true, mode: 0o755 });
    }

    // 尝试写入测试文件
    const testFile = `${storagePath}/.storage_test`;
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 检查是否有老数据
 */
async function checkOldData(config: SystemConfig): Promise<{ hasData: boolean; tablesInfo?: any }> {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.name,
      connectTimeout: 5000,
    });

    // 检查核心表是否存在数据
    const tables = ['user', 'role', 'dept', 'menu', 'operation_log'];

    const tablesInfo: any = {};
    let totalData = 0;

    for (const table of tables) {
      try {
        const [rows] = await connection.query(`SELECT COUNT(*) as count FROM \`${table}\` WHERE isDelete = 0`);
        const count = rows?.[0]?.count || 0;
        tablesInfo[table] = { exists: true, count };
        totalData += count;
      } catch {
        tablesInfo[table] = { exists: false, count: 0 };
      }
    }

    return {
      hasData: totalData > 0,
      tablesInfo,
    };
  } catch {
    return { hasData: false };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
