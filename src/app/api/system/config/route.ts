// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-expect-error
// =============================================================================
// 腾曦生产管理系统 - 系统配置API
// 描述: 全局参数、字典管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { dictSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/**
/** GET /api/system/config - 获取配置数据
/**/
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dict';
    const dictType = searchParams.get('dictType') || '';

    let result: any;
    if (type === 'dict') {
      const where: any = { isDelete: false };
      if (dictType) where.dictType = dictType;
      result = await prisma.systemDict.findMany({
        where,
        orderBy: [{ dictType: 'asc' }, { sortOrder: 'asc' }],
      });
    } else if (type === 'param') {
      result = await prisma.systemConfig.findMany({
        where: { isDelete: false },
        orderBy: { createdAt: 'desc' },
      });
    }

    return successResponse(result);
  } catch (error: any) {
    console.error('获取配置数据失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
/** POST /api/system/config - 创建/更新配置
/**/
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const auth = authResult;

    const body = await request.json();
    const { type, data } = body;

    let result: any;

    if (type === 'dict') {
      const validation = dictSchema.safeParse(data);
      if (!validation.success) return badRequestResponse('参数验证失败');

      result = await prisma.systemDict.create({
        data: {
          dictType: data.dictType,
          dictLabel: data.dictLabel,
          dictValue: data.dictValue,
          sortOrder: data.sortOrder || 0,
          status: data.status || 'active',
          remark: data.remark,
          createdBy: auth.userId,
        },
      });

      await operationLog({
        module: '系统管理',
        businessType: '新增字典',
        operatorId: auth.userId,
        operatorName: auth.username,
        operationDesc: `新增字典: ${data.dictType} - ${data.dictLabel}`,
        ipAddress: getClientIp(request),
        status: 'success',
      });
    } else if (type === 'param') {
      result = await prisma.systemConfig.create({
        data: {
          paramKey: data.configKey,
          paramValue: data.configValue,
          configType: data.configType || 'string',
          remark: data.remark,
          createdBy: auth.userId,
        },
      });

      await operationLog({
        module: '系统管理',
        businessType: '新增配置',
        operatorId: auth.userId,
        operatorName: auth.username,
        operationDesc: `新增配置: ${data.configKey}`,
        ipAddress: getClientIp(request),
        status: 'success',
      });
    }

    return successResponse(result);
  } catch (error: any) {
    console.error('创建配置失败:', error);
    return serverErrorResponse(error.message);
  }
}
