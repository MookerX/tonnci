// =============================================================================
// 腾曦生产管理系统 - 库存管理API
// 描述: 库存查询与调整
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';

/**
 * GET /api/inventory/stock - 获取库存列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const keyword = searchParams.get('keyword') || '';
    const materialType = searchParams.get('materialType') || '';
    const stockStatus = searchParams.get('stockStatus') || ''; // available, locked, all

    // 构建查询条件
    const where: any = {};
    if (keyword) {
      where.OR = [
        { material: { materialName: { contains: keyword } } },
        { material: { internalCode: { contains: keyword } } },
        { material: { drawingCode: { contains: keyword } } },
      ];
    }
    if (materialType) where.material = { materialType };
    if (stockStatus === 'available') {
      where.availableQty = { gt: 0 };
    } else if (stockStatus === 'locked') {
      where.lockedQty = { gt: 0 };
    }

    const [list, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          material: {
            select: {
              id: true,
              materialName: true,
              internalCode: true,
              drawingCode: true,
              materialType: true,
              unit: true,
              spec: true,
            },
          },
        },
      }),
      prisma.inventory.count({ where }),
    ]);

    return successResponse({
      list: list.map(item => ({
        ...item,
        totalQty: Number(item.totalQty),
        availableQty: Number(item.availableQty),
        lockedQty: Number(item.lockedQty),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('获取库存列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

