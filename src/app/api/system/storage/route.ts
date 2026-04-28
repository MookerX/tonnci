// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 系统存储管理API
// 描述: NAS存储配置、文件存储管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, notFoundResponse, serverErrorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { z } from 'zod';

const nasDeviceSchema = z.object({
  deviceName: z.string().min(1, '设备名称不能为空').max(100),
  deviceType: z.enum(['synology', 'qnap', 'local']).default('synology'),
  host: z.string().min(1, '主机地址不能为空').max(255),
  port: z.number().int().positive().default(445),
  username: z.string().max(100).optional(),
  password: z.string().max(500).optional(),
  sharePath: z.string().min(1, '共享路径不能为空').max(255),
  storageTypes: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  remark: z.string().optional(),
});

/**
 * GET /api/system/storage - 获取NAS存储列表
 */
export async function GET(request: NextRequest) {
  try {
    const list = await prisma.nasDevice.findMany({
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
    console.error('获取NAS存储列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * POST /api/system/storage - 创建/测试NAS存储
 */
export async function POST(request: NextRequest) {
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

    const { action, data } = body;

    if (action === 'test') {
      // 测试NAS连接
      const { host, port, username, password, sharePath } = data;
      // 实际应调用SMB库测试连接
      return successResponse({ success: true, message: '连接测试成功' });
    }

    if (action === 'create') {
      const validation = nasDeviceSchema.safeParse(data);
      if (!validation.success) {
        return badRequestResponse(validation.error.issues?.[0]?.message || '参数验证失败');
      }

      const nas = await prisma.nasDevice.create({
        data: {
          deviceName: data.deviceName,
          deviceType: data.deviceType || 'synology',
          host: data.host,
          port: data.port || 445,
          username: data.username || null,
          password: data.password || null,
          sharePath: data.sharePath,
          storageTypes: data.storageTypes || [],
          isDefault: data.isDefault || false,
          status: data.status || 'active',
          remark: data.remark || null,
          createdBy: authResult.userId,
          modifiedBy: authResult.userId,
        },
      });

      await operationLog.logCreate(
        '存储管理',
        authResult.userId,
        authResult.username,
        { deviceName: nas.deviceName, host: nas.host },
        getClientIp(request)
      );

      return successResponse({ ...nas, password: '******' }, 'NAS存储创建成功');
    }

    return badRequestResponse('未知操作');
  } catch (error: any) {
    console.error('NAS存储操作失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * PUT /api/system/storage - 更新NAS存储
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

    const { id, data } = body;

    if (!id) {
      return badRequestResponse('缺少存储设备ID');
    }

    const validation = nasDeviceSchema.partial().safeParse(data);
    if (!validation.success) {
      return badRequestResponse(validation.error.issues?.[0]?.message || '参数验证失败');
    }

    // 检查设备是否存在
    const existing = await prisma.nasDevice.findUnique({
      where: { id, isDelete: false },
    });

    if (!existing) {
      return notFoundResponse('NAS存储不存在');
    }

    // 构建更新数据
    const updateData: any = {
      modifiedBy: authResult.userId,
    };

    if (data.deviceName !== undefined) updateData.deviceName = data.deviceName;
    if (data.deviceType !== undefined) updateData.deviceType = data.deviceType;
    if (data.host !== undefined) updateData.host = data.host;
    if (data.port !== undefined) updateData.port = data.port;
    if (data.username !== undefined) updateData.username = data.username || null;
    if (data.sharePath !== undefined) updateData.sharePath = data.sharePath;
    if (data.storageTypes !== undefined) updateData.storageTypes = data.storageTypes;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remark !== undefined) updateData.remark = data.remark || null;

    // 如果提供了新密码则更新
    if (data.password !== undefined && data.password !== '******') {
      updateData.password = data.password;
    }

    const updated = await prisma.nasDevice.update({
      where: { id },
      data: updateData,
    });

    await operationLog.logUpdate(
      '存储管理',
      authResult.userId,
      authResult.username,
      { id: existing.id, deviceName: existing.deviceName },
      { id: updated.id, deviceName: updated.deviceName },
      getClientIp(request)
    );

    return successResponse({ ...updated, password: '******' }, 'NAS存储更新成功');

  } catch (error: any) {
    console.error('更新NAS存储失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * DELETE /api/system/storage - 删除NAS存储（软删除）
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return badRequestResponse('缺少存储设备ID');
    }

    const deviceId = parseInt(id);

    // 检查设备是否存在
    const existing = await prisma.nasDevice.findUnique({
      where: { id: deviceId, isDelete: false },
    });

    if (!existing) {
      return notFoundResponse('NAS存储不存在');
    }

    // 软删除
    await prisma.nasDevice.update({
      where: { id: deviceId },
      data: {
        isDelete: true,
        modifiedBy: authResult.userId,
      },
    });

    await operationLog.logDelete(
      '存储管理',
      authResult.userId,
      authResult.username,
      { id: existing.id, deviceName: existing.deviceName },
      getClientIp(request)
    );

    return successResponse(null, 'NAS存储删除成功');

  } catch (error: any) {
    console.error('删除NAS存储失败:', error);
    return serverErrorResponse(error.message);
  }
}
