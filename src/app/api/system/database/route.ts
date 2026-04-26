// =============================================================================
// 腾曦生产管理系统 - 分布式数据库配置API
// 描述: 多数据库连接配置管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/**
/** GET /api/system/database - 获取数据库配置列表
/**/
export async function GET(request: NextRequest) {
  try {
    const list = await prisma.databaseConfig.findMany({
      where: { isDelete: false },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(list);
  } catch (error: any) {
    console.error('获取数据库配置列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

