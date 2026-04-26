// =============================================================================
// 腾曦生产管理系统 - 对账管理API
// 描述: 客户对账明细管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

 * GET /api/accounting/reconciliation - 获取对账明细
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reconciliationId = searchParams.get('reconciliationId') || '';

    if (reconciliationId) {
      const items = await prisma.accountReconciliationItem.findMany({
        where: { reconciliationId: parseInt(reconciliationId, 10) },
        include: {
          delivery: {
            include: {
              customer: { select: { customerName: true } },
            },
          },
          order: {
            select: {
              orderNo: true,
              customerOrderNo: true,
              material: { select: { materialName: true } },
            },
          },
        },
      });
      return successResponse(items);
    }

    return successResponse([]);
  } catch (error: any) {
    console.error('获取对账明细失败:', error);
    return serverErrorResponse(error.message);
  }
}

