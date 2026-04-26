// =============================================================================
// 腾曦生产管理系统 - 质检管理API
// 描述: 扫码质检、合格流转、不合格处理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { qcRecordSchema } from '@/lib/validators';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

 * GET /api/quality/qc - 获取质检记录列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const taskId = searchParams.get('taskId') || '';
    const qcResult = searchParams.get('qcResult') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const where: any = {};
    if (taskId) where.taskId = parseInt(taskId, 10);
    if (qcResult) where.qcResult = qcResult;
    if (startDate || endDate) {
      where.inspectionDate = {};
      if (startDate) where.inspectionDate.gte = new Date(startDate);
      if (endDate) where.inspectionDate.lte = new Date(endDate + 'T23:59:59');
    }

    const [list, total] = await Promise.all([
      prisma.qcRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          task: { select: { id: true, taskNo: true } },
          process: { select: { id: true, processName: true } },
          inspector: { select: { id: true, realName: true } },
        },
      }),
      prisma.qcRecord.count({ where }),
    ]);

    return successResponse({
      list: list.map(record => ({
        ...record,
        inspectedQty: Number(record.inspectedQty),
        qualifiedQty: Number(record.qualifiedQty),
        unqualifiedQty: Number(record.unqualifiedQty),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    console.error('获取质检记录失败:', error);
    return serverErrorResponse(error.message);
  }
}

