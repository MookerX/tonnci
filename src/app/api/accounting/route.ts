// =============================================================================
// 腾曦生产管理系统 - 对账开票API
// 描述: 客户对账、开票、回款管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/** 生成对账单号
/**/
async function generateReconciliationNo(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const count = await prisma.accountReconciliation.count({
    where: { createdAt: { gte: new Date(year, 0, 1) } },
  });
  return `DZ${year}${month}${String(count + 1).padStart(4, '0')}`;
}

/** GET /api/accounting - 获取对账开票数据
/**/
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'reconciliation';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const customerId = searchParams.get('customerId') || '';

    const where: any = { isDelete: false };
    if (customerId) where.customerId = parseInt(customerId, 10);

    let result: any;
    if (type === 'reconciliation') {
      [result] = await Promise.all([
        prisma.accountReconciliation.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, customerName: true } },
          },
        }),
        prisma.accountReconciliation.count({ where }),
      ]);
    } else if (type === 'invoice') {
      [result] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, customerName: true } },
          },
        }),
        prisma.invoice.count({ where }),
      ]);
    } else {
      [result] = await Promise.all([
        prisma.accountPayment.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, customerName: true } },
          },
        }),
        prisma.accountPayment.count({ where }),
      ]);
    }

    return successResponse(result);
  } catch (error: any) {
    console.error('获取对账开票数据失败:', error);
    return serverErrorResponse(error.message);
  }
}

