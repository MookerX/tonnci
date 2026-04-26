// =============================================================================
// 腾曦生产管理系统 - 报工记录API
// 描述: 生产报工记录管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { workReportSchema } from '@/lib/validators';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

 * GET /api/production/report - 获取报工记录列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const taskId = searchParams.get('taskId') || '';
    const workerId = searchParams.get('workerId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    // 构建查询条件
    const where: any = {};
    if (taskId) where.taskId = parseInt(taskId, 10);
    if (workerId) where.workerId = parseInt(workerId, 10);
    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) where.reportDate.gte = new Date(startDate);
      if (endDate) where.reportDate.lte = new Date(endDate + 'T23:59:59');
    }

    const [list, total] = await Promise.all([
      prisma.workReport.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          task: { select: { id: true, taskNo: true } },
          process: { select: { id: true, processName: true } },
          worker: { select: { id: true, realName: true, username: true } },
        },
      }),
      prisma.workReport.count({ where }),
    ]);

    return successResponse({
      list: list.map(report => ({
        ...report,
        quantity: Number(report.quantity),
        actualHours: report.actualHours ? Number(report.actualHours) : null,
        overtimeHours: report.overtimeHours ? Number(report.overtimeHours) : null,
        piecePrice: report.piecePrice ? Number(report.piecePrice) : null,
        allowance: report.allowance ? Number(report.allowance) : null,
        deduction: report.deduction ? Number(report.deduction) : null,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    console.error('获取报工记录列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

