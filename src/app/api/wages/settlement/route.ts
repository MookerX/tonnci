// =============================================================================
// 腾曦生产管理系统 - 工资结算详情API
// 描述: 工资核算、发放
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/** GET /api/wages/settlement - 获取工资结算详情
/**/
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const settlementId = searchParams.get('settlementId') || '';

    if (settlementId) {
      const settlement = await prisma.wageSettlement.findUnique({
        where: { id: parseInt(settlementId, 10) },
        include: {
          worker: { select: { id: true, realName: true, username: true, phone: true } },
          items: {
            include: {
              workReport: {
                include: {
                  task: { select: { id: true, taskNo: true } },
                  process: { select: { id: true, processName: true } },
                },
              },
            },
          },
        },
      });
      return successResponse(settlement);
    }

    return successResponse([]);
  } catch (error: any) {
    console.error('获取工资结算详情失败:', error);
    return serverErrorResponse(error.message);
  }
}

