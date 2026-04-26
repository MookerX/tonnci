// =============================================================================
// 腾曦生产管理系统 - 技术任务池API
// 描述: 技术任务流转、自动匹配、进度可视化
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

 * GET /api/tech-task - 获取技术任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const poolType = searchParams.get('poolType') || 'pending'; // pending, processing, completed
    const keyword = searchParams.get('keyword') || '';

    const where: any = { isDelete: false };
    if (poolType === 'pending') {
      where.taskStatus = 'pending';
    } else if (poolType === 'processing') {
      where.taskStatus = 'processing';
    } else {
      where.taskStatus = 'completed';
    }

    if (keyword) {
      where.OR = [
        { order: { orderNo: { contains: keyword } } },
        { material: { materialName: { contains: keyword } } },
      ];
    }

    const list = await prisma.techTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            customerOrderNo: true,
            deliveryDate: true,
            customer: { select: { id: true, customerName: true } },
          },
        },
        material: {
          select: { id: true, materialName: true, internalCode: true, drawingCode: true },
        },
        assignee: { select: { id: true, realName: true } },
      },
    });

    return successResponse(list);
  } catch (error: any) {
    console.error('获取技术任务列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

