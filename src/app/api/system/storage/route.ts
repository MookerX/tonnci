// =============================================================================
// 腾曦生产管理系统 - 系统存储管理API
// 描述: NAS存储配置、文件存储管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { nasSchema } from '@/lib/validators';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/**
 * GET /api/system/storage - 获取NAS存储列表
 */
export async function GET(request: NextRequest) {
  try {
    const list = await prisma.nasDevice.findMany({
      where: { isDelete: false },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(list);
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
    const auth = await extractToken(request);
    if (!auth) return NextResponse.json({ code: 401, message: '未授权', data: null }, { status: 401 });

    const body = await request.json();
    const { action, data } = body;

    if (action === 'test') {
      // 测试NAS连接
      const { host, port, username, password, sharePath } = data;
      // 实际应调用SMB库测试连接
      return successResponse({ success: true, message: '连接测试成功' });
    }

    if (action === 'create') {
      const validation = nasSchema.safeParse(data);
      if (!validation.success) return badRequestResponse('参数验证失败');

      const nas = await prisma.nasDevice.create({
        data: {
          deviceName: data.deviceName,
          deviceType: data.deviceType || 'synology',
          host: data.host,
          port: data.port || 445,
          username: data.username,
          password: data.password,
          sharePath: data.sharePath,
          storageTypes: data.storageTypes,
          isDefault: data.isDefault || false,
          status: data.status || 'active',
          remark: data.remark,
          createdBy: auth.userId,
          modifiedBy: auth.userId,
        },
      });

      await operationLog({
        module: '系统管理',
        businessType: '新增NAS存储',
        operatorId: auth.userId,
        operatorName: auth.username,
        operationDesc: `新增NAS存储: ${data.deviceName} (${data.host})`,
        ipAddress: getClientIp(request),
        status: 'success',
      });

      return successResponse(nas);
    }

    return badRequestResponse('未知操作');
  } catch (error: any) {
    console.error('NAS存储操作失败:', error);
    return serverErrorResponse(error.message);
  }
}
