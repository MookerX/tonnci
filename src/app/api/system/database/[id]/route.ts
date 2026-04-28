// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 数据库配置详情/更新/删除API
// 描述: 单个数据库配置CRUD操作
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { z } from 'zod';

const updateDatabaseConfigSchema = z.object({
  moduleName: z.string().min(1, '模块名称不能为空').max(100).optional(),
  host: z.string().min(1, '主机地址不能为空').max(255).optional(),
  port: z.number().int().positive().optional(),
  database: z.string().min(1, '数据库名不能为空').max(100).optional(),
  username: z.string().min(1, '用户名不能为空').max(100).optional(),
  password: z.string().max(500).optional(),
  isEnabled: z.boolean().optional(),
  remark: z.string().optional(),
});

/**
 * GET /api/system/database/[id] - 获取数据库配置详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const configId = parseInt(id);

    if (isNaN(configId)) {
      return badRequestResponse('无效的配置ID');
    }

    const config = await prisma.databaseConfig.findUnique({
      where: { id: configId, isDelete: false },
    });

    if (!config) {
      return notFoundResponse('数据库配置不存在');
    }

    // 隐藏密码
    return successResponse({
      ...config,
      password: config.password ? '******' : '',
    });

  } catch (error: any) {
    console.error('获取数据库配置详情失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * PUT /api/system/database/[id] - 更新数据库配置
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const configId = parseInt(id);

    if (isNaN(configId)) {
      return badRequestResponse('无效的配置ID');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = updateDatabaseConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues?.[0]?.message || '参数验证失败');
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查配置是否存在
    const existing = await prisma.databaseConfig.findUnique({
      where: { id: configId, isDelete: false },
    });

    if (!existing) {
      return notFoundResponse('数据库配置不存在');
    }

    // 构建更新数据
    const updateData: any = {
      modifiedBy: authResult.userId,
    };

    if (data.moduleName !== undefined) updateData.moduleName = data.moduleName;
    if (data.host !== undefined) updateData.host = data.host;
    if (data.port !== undefined) updateData.port = data.port;
    if (data.database !== undefined) updateData.database = data.database;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.remark !== undefined) updateData.remark = data.remark || null;

    // 如果提供了新密码则更新
    if (data.password !== undefined && data.password !== '******') {
      updateData.password = data.password;
    }

    const updated = await prisma.databaseConfig.update({
      where: { id: configId },
      data: updateData,
    });

    // 记录日志
    await operationLog.logUpdate(
      '数据库配置',
      authResult.userId,
      authResult.username,
      { id: existing.id, moduleCode: existing.moduleCode },
      { id: updated.id, moduleCode: updated.moduleCode },
      clientIp
    );

    return successResponse({ ...updated, password: '******' }, '数据库配置更新成功');

  } catch (error: any) {
    console.error('更新数据库配置失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * DELETE /api/system/database/[id] - 删除数据库配置（软删除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const configId = parseInt(id);

    if (isNaN(configId)) {
      return badRequestResponse('无效的配置ID');
    }

    const clientIp = getClientIp(request);

    // 检查配置是否存在
    const existing = await prisma.databaseConfig.findUnique({
      where: { id: configId, isDelete: false },
    });

    if (!existing) {
      return notFoundResponse('数据库配置不存在');
    }

    // 软删除
    await prisma.databaseConfig.update({
      where: { id: configId },
      data: {
        isDelete: true,
        modifiedBy: authResult.userId,
      },
    });

    // 记录日志
    await operationLog.logDelete(
      '数据库配置',
      authResult.userId,
      authResult.username,
      { id: existing.id, moduleCode: existing.moduleCode },
      clientIp
    );

    return successResponse(null, '数据库配置删除成功');

  } catch (error: any) {
    console.error('删除数据库配置失败:', error);
    return serverErrorResponse(error.message);
  }
}
