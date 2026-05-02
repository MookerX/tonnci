// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 分布式数据库配置API
// 描述: 多数据库连接配置管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { z } from 'zod';

const databaseConfigSchema = z.object({
  moduleName: z.string().min(1, '模块名称不能为空').max(100),
  moduleCode: z.string().min(1, '模块代码不能为空').max(50),
  host: z.string().min(1, '主机地址不能为空').max(255),
  port: z.number().int().positive().default(3306),
  database: z.string().min(1, '数据库名不能为空').max(100),
  username: z.string().min(1, '用户名不能为空').max(100),
  password: z.string().min(0).max(500),
  remark: z.string().optional(),
});

/**
 * GET /api/system/database - 获取数据库配置列表
 */
export async function GET(request: NextRequest) {
  try {
    const list = await prisma.databaseConfig.findMany({
      where: { isDelete: false },
      orderBy: { createdAt: 'desc' },
    });

    // 隐藏密码
    const safeList = list.map(item => ({
      ...item,
      password: item.password ? '******' : '',
    }));

    return successResponse(safeList);
  } catch (error: any) {
    console.error('获取数据库配置列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * POST /api/system/database - 创建数据库配置 / 测试连接 / 创建数据库
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const { action, data } = body;

    // 测试数据库连接
    if (action === 'test' && data) {
      return await testDatabaseConnection(data);
    }

    // 创建数据库
    if (action === 'createDatabase' && data) {
      return await createDatabaseIfNotExists(data);
    }

    // 创建配置（直接发送配置数据，不带 action）
    if (!action) {
      return await createDatabaseConfig(body, request);
    }

    return badRequestResponse('无效的操作类型');

  } catch (error: any) {
    console.error('创建数据库配置失败:', error);
    return serverErrorResponse(error.message);
  }
}

// 独立的创建配置函数
async function createDatabaseConfig(data: any, request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const validationResult = databaseConfigSchema.safeParse(data);
  if (!validationResult.success) {
    return badRequestResponse(validationResult.error.issues?.[0]?.message || '参数验证失败');
  }

  const configData = validationResult.data;
  const clientIp = getClientIp(request);

  // 检查模块代码是否已存在
  const existing = await prisma.databaseConfig.findUnique({
    where: { moduleCode: configData.moduleCode }
  });

  if (existing) {
    return errorResponse(400, '模块代码已存在');
  }

  // 创建数据库配置
  const config = await prisma.databaseConfig.create({
    data: {
      moduleName: configData.moduleName,
      moduleCode: configData.moduleCode,
      host: configData.host,
      port: configData.port,
      database: configData.database,
      username: configData.username,
      password: configData.password || '',
      remark: configData.remark || null,
    },
  });

  // 记录日志
  await operationLog.logCreate(
    '数据库配置',
    authResult.userId,
    authResult.username,
    { moduleCode: config.moduleCode },
    clientIp
  );

  return successResponse({ ...config, password: '******' }, '数据库配置创建成功');
}

/**
 * 测试数据库连接
 */
async function testDatabaseConnection(data: any) {
  try {
    const mysql = require('mysql2/promise');
    const { host, port, username, password, database } = data;

    // 先尝试连接指定数据库
    let connection;
    try {
      connection = await mysql.createConnection({
        host,
        port: port || 3306,
        user: username,
        password: password || '',
        database,
        connectTimeout: 5000,
      });
      await connection.end();
      return successResponse({ connected: true, message: '连接成功' });
    } catch (dbError: any) {
      // 如果是 Unknown database 错误，尝试不指定数据库连接
      if (dbError.code === 'ER_BAD_DB_ERROR' || dbError.message?.includes('Unknown database')) {
        try {
          connection = await mysql.createConnection({
            host,
            port: port || 3306,
            user: username,
            password: password || '',
            connectTimeout: 5000,
          });
          await connection.end();
          return successResponse({ 
            connected: true, 
            canConnect: true,
            databaseExists: false,
            message: '可以连接到服务器，但数据库不存在，是否创建？' 
          });
        } catch (serverError: any) {
          return errorResponse(400, `服务器连接失败: ${serverError.message}`);
        }
      }
      return errorResponse(400, `连接失败: ${dbError.message}`);
    }
  } catch (error: any) {
    console.error('测试数据库连接失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * 创建数据库（如果不存在）
 */
async function createDatabaseIfNotExists(data: any) {
  try {
    const mysql = require('mysql2/promise');
    const { host, port, username, password, database } = data;

    // 先连接服务器（不指定数据库）
    let connection;
    try {
      connection = await mysql.createConnection({
        host,
        port: port || 3306,
        user: username,
        password: password || '',
        connectTimeout: 5000,
      });
    } catch (connError: any) {
      return errorResponse(400, `无法连接到服务器: ${connError.message}`);
    }

    // 创建数据库
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await connection.end();
      return successResponse({ created: true, message: `数据库 ${database} 创建成功` });
    } catch (createError: any) {
      await connection.end();
      return errorResponse(400, `创建数据库失败: ${createError.message}`);
    }
  } catch (error: any) {
    console.error('创建数据库失败:', error);
    return serverErrorResponse(error.message);
  }
}

