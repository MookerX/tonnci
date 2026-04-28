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
  isEnabled: z.boolean().optional().default(false),
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
 * POST /api/system/database - 创建数据库配置
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = databaseConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues?.[0]?.message || '参数验证失败');
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查模块代码是否已存在
    const existing = await prisma.databaseConfig.findUnique({
      where: { moduleCode: data.moduleCode }
    });

    if (existing) {
      return errorResponse(400, '模块代码已存在');
    }

    // 创建数据库配置
    const config = await prisma.databaseConfig.create({
      data: {
        moduleName: data.moduleName,
        moduleCode: data.moduleCode,
        host: data.host,
        port: data.port,
        database: data.database,
        username: data.username,
        password: data.password,
        isEnabled: data.isEnabled,
        remark: data.remark || null,
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

  } catch (error: any) {
    console.error('创建数据库配置失败:', error);
    return serverErrorResponse(error.message);
  }
}

