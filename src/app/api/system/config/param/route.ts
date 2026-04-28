// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 系统参数配置API
// 描述: 系统参数CRUD操作
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, notFoundResponse, serverErrorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { z } from 'zod';

const configParamSchema = z.object({
  paramKey: z.string().min(1, '参数键不能为空').max(100),
  paramValue: z.string().max(1000),
  paramType: z.enum(['string', 'number', 'boolean']).default('string'),
  remark: z.string().optional(),
});

/**
 * PUT /api/system/config/param - 更新系统参数
 */
export async function PUT(request: NextRequest) {
  try {
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

    const validationResult = configParamSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues?.[0]?.message || '参数验证失败');
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 查找现有配置
    const existing = await prisma.systemConfig.findFirst({
      where: { 
        paramKey: data.paramKey,
        isDelete: false 
      }
    });

    if (existing) {
      // 更新现有配置
      const updated = await prisma.systemConfig.update({
        where: { id: existing.id },
        data: {
          paramValue: data.paramValue,
          paramType: data.paramType,
          remark: data.remark || existing.remark,
          modifiedBy: authResult.userId,
        },
      });

      await operationLog.logUpdate(
        '系统参数',
        authResult.userId,
        authResult.username,
        { paramKey: existing.paramKey, paramValue: existing.paramValue },
        { paramKey: updated.paramKey, paramValue: updated.paramValue },
        clientIp
      );

      return successResponse(updated, '系统参数更新成功');
    } else {
      // 创建新配置
      const created = await prisma.systemConfig.create({
        data: {
          paramKey: data.paramKey,
          paramValue: data.paramValue,
          paramType: data.paramType,
          remark: data.remark || null,
          createdBy: authResult.userId,
        },
      });

      await operationLog.logCreate(
        '系统参数',
        authResult.userId,
        authResult.username,
        { paramKey: created.paramKey, paramValue: created.paramValue },
        clientIp
      );

      return successResponse(created, '系统参数创建成功');
    }

  } catch (error: any) {
    console.error('更新系统参数失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * GET /api/system/config/param - 获取单个系统参数
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paramKey = searchParams.get('key');

    if (!paramKey) {
      return badRequestResponse('缺少参数键');
    }

    const config = await prisma.systemConfig.findFirst({
      where: { paramKey, isDelete: false },
    });

    if (!config) {
      return notFoundResponse('系统参数不存在');
    }

    return successResponse(config);

  } catch (error: any) {
    console.error('获取系统参数失败:', error);
    return serverErrorResponse(error.message);
  }
}
