// =============================================================================
// 腾曦生产管理系统 - 存储配置详情API（更新/删除）
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, notFoundResponse, serverErrorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

const updateSchema = z.object({
  storageName: z.string().min(1).max(100).optional(),
  storageType: z.enum(['local', 'nas', 'oss']).optional(),
  basePath: z.string().max(500).optional().nullable(),
  fileTypes: z.string().min(1).optional(),
  maxFileSize: z.number().int().positive().optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  remark: z.string().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const storageId = parseInt(id);
    if (isNaN(storageId)) return badRequestResponse('无效的ID');

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      const errorMessage = validation.error.errors?.[0]?.message || '参数验证失败';
      return badRequestResponse(errorMessage);
    }

    const data = validation.data;

    // 检查是否存在
    const existing = await prisma.storageConfig.findFirst({
      where: { id: storageId, isDelete: false },
    });
    if (!existing) return notFoundResponse('存储配置不存在');

    // 如果设为默认，取消其他默认
    if (data.isDefault) {
      await prisma.storageConfig.updateMany({
        where: { isDelete: false, isDefault: true, id: { not: storageId } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.storageConfig.update({
      where: { id: storageId },
      data: {
        ...data,
        modifiedBy: authResult.userId,
      },
    });

    return successResponse(updated, '更新成功');
  } catch (error: any) {
    console.error('更新存储配置失败:', error);
    return serverErrorResponse(error.message);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const storageId = parseInt(id);
    if (isNaN(storageId)) return badRequestResponse('无效的ID');

    const existing = await prisma.storageConfig.findFirst({
      where: { id: storageId, isDelete: false },
    });
    if (!existing) return notFoundResponse('存储配置不存在');

    // 软删除
    await prisma.storageConfig.update({
      where: { id: storageId },
      data: {
        isDelete: true,
        modifiedBy: authResult.userId,
      },
    });

    return successResponse(null, '删除成功');
  } catch (error: any) {
    console.error('删除存储配置失败:', error);
    return serverErrorResponse(error.message);
  }
}
