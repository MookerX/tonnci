// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-expect-error
// =============================================================================
// 腾曦生产管理系统 - 工资结算详情API
// 描述: 工资核算、发放
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';

/** GET /api/wages/settlement - 获取工资结算详情
/**/
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const auth = authResult;

    const { searchParams } = new URL(request.url);
    const settlementId = searchParams.get('settlementId') || '';

    if (settlementId) {
      const settlement = await prisma.wageSettlement.findUnique({
        where: { id: parseInt(settlementId, 10) },
        include: {
          worker: { select: { id: true, realName: true, username: true, phone: true, deptId: true } },
          items: {
            include: {
              workReport: {
                select: {
                  id: true,
                  taskId: true,
                  processId: true,
                  quantity: true,
                  reportDate: true,
                  pieceAmount: true,
                  timeAmount: true,
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
