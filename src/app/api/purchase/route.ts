// =============================================================================
// 腾曦生产管理系统 - 采购管理API
// 描述: 供应商、采购需求、采购订单管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { supplierSchema, purchaseRequirementSchema, purchaseOrderSchema } from '@/lib/validators';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

 * 生成供应商编码
 */
async function generateSupplierCode(): Promise<string> {
  const count = await prisma.supplier.count({ where: { isDelete: false } });
  return `GYS${String(count + 1).padStart(6, '0')}`;
}

 * GET /api/purchase - 获取采购相关数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'supplier';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const keyword = searchParams.get('keyword') || '';

    const where: any = { isDelete: false };
    if (keyword) {
      if (type === 'supplier') {
        where.OR = [
          { supplierCode: { contains: keyword } },
          { supplierName: { contains: keyword } },
        ];
      } else if (type === 'order') {
        where.OR = [
          { orderNo: { contains: keyword } },
          { supplier: { supplierName: { contains: keyword } } },
        ];
      } else {
        where.OR = [
          { material: { materialName: { contains: keyword } } },
          { material: { internalCode: { contains: keyword } } },
        ];
      }
    }

    let result: any;
    if (type === 'supplier') {
      [result] = await Promise.all([
        prisma.supplier.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.supplier.count({ where }),
      ]);
    } else if (type === 'requirement') {
      [result] = await Promise.all([
        prisma.purchaseRequirement.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            material: { select: { id: true, materialName: true, internalCode: true } },
          },
        }),
        prisma.purchaseRequirement.count({ where }),
      ]);
    } else {
      [result] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            supplier: { select: { id: true, supplierName: true } },
          },
        }),
        prisma.purchaseOrder.count({ where }),
      ]);
    }

    return successResponse(result);
  } catch (error: any) {
    console.error('获取采购数据失败:', error);
    return serverErrorResponse(error.message);
  }
}

