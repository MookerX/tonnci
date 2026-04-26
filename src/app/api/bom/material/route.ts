// =============================================================================
// 腾曦生产管理系统 - 物料管理API
// 描述: 物料信息CRUD操作
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { materialSchema } from '@/lib/validators';
import { operationLog } from '@/lib/services/operation-log';
import { extractToken } from '@/lib/auth/jwt';
import { generateMaterialCode, getClientIp } from '@/lib/utils';

 * GET /api/bom/material - 获取物料列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const keyword = searchParams.get('keyword') || '';
    const materialType = searchParams.get('materialType') || '';
    const customerId = searchParams.get('customerId');
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // 构建查询条件
    const where: any = { isDelete: false };
    if (keyword) {
      where.OR = [
        { materialName: { contains: keyword } },
        { internalCode: { contains: keyword } },
        { drawingCode: { contains: keyword } },
        { drawingNo: { contains: keyword } },
      ];
    }
    if (materialType) where.materialType = materialType;
    if (customerId) where.customerId = parseInt(customerId, 10);

    // 查询数据
    const [list, total] = await Promise.all([
      prisma.material.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortField]: sortOrder },
        include: {
          customer: { select: { id: true, customerName: true } },
        },
      }),
      prisma.material.count({ where }),
    ]);

    return successResponse({
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('获取物料列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

