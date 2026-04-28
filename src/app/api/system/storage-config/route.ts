// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 存储配置管理API
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, notFoundResponse, serverErrorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

const storageConfigSchema = z.object({
  storageName: z.string().min(1, '存储名称不能为空').max(100),
  storageType: z.enum(['local', 'nas', 'oss']).default('local'),
  basePath: z.string().max(500).optional().nullable(),
  fileTypes: z.string().min(1, '绑定文件类型不能为空'),
  maxFileSize: z.number().int().positive().default(10485760),
  isDefault: z.boolean().optional().default(false),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  remark: z.string().optional().nullable(),
});

/**
 * GET /api/system/storage-config - 获取存储配置列表
 */
export async function GET(request: NextRequest) {
  try {
    const list = await prisma.storageConfig.findMany({
      where: { isDelete: false },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return successResponse(list);
  } catch (error: any) {
    console.error('获取存储配置列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * POST /api/system/storage-config - 创建存储配置
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validation = storageConfigSchema.safeParse(body);
    if (!validation.success) {
      const errorMessage = validation.error.issues?.[0]?.message || '参数验证失败';
      return badRequestResponse(errorMessage);
    }

    const data = validation.data;

    // 如果设为默认，取消其他默认
    if (data.isDefault) {
      await prisma.storageConfig.updateMany({
        where: { isDelete: false, isDefault: true },
        data: { isDefault: false },
      });
    }

    const storage = await prisma.storageConfig.create({
      data: {
        storageName: data.storageName,
        storageType: data.storageType,
        basePath: data.basePath || null,
        fileTypes: data.fileTypes,
        maxFileSize: data.maxFileSize,
        isDefault: data.isDefault,
        status: data.status,
        remark: data.remark || null,
        createdBy: authResult.userId,
        modifiedBy: authResult.userId,
      },
    });

    return successResponse(storage, '创建成功');
  } catch (error: any) {
    console.error('创建存储配置失败:', error);
    return serverErrorResponse(error.message);
  }
}
