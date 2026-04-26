// =============================================================================
// 腾曦生产管理系统 - 客户进度查询API
// 描述: 客户专属账号查看订单进度
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';

/**
/** GET /api/customer-portal - 获取客户订单进度
/**/
export async function GET(request: NextRequest) {
  try {
    const auth = await extractToken(request);
    if (!auth) return NextResponse.json({ code: 401, message: '未授权', data: null }, { status: 401 });

    // 验证是否为客户账号
    if (auth.userType !== 'customer') {
      return NextResponse.json({ code: 403, message: '无权限访问', data: null }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (orderId) {
      // 获取订单详情及工序进度
      const order = await prisma.order.findFirst({
        where: {
          id: parseInt(orderId, 10),
          customerId: auth.customerId,
          isDelete: false,
        },
        include: {
          customer: { select: { id: true, customerName: true } },
          material: {
            select: { id: true, materialName: true, internalCode: true, spec: true },
          },
          deliveries: {
            where: { isDelete: false },
            orderBy: { createdAt: 'desc' },
          },
          productionTasks: {
            where: { isDelete: false },
            include: {
              material: { select: { id: true, materialName: true } },
              processSchedules: {
                where: { isDelete: false },
                orderBy: { processOrder: 'asc' },
                include: {
                  process: { select: { id: true, processName: true } },
                },
              },
            },
          },
        },
      });

      if (!order) return badRequestResponse('订单不存在或无权限访问');

      return successResponse({
        ...order,
        quantity: Number(order.quantity),
        deliveredQty: Number(order.deliveredQty),
      });
    }

    // 获取客户订单列表
    const { searchParams: SP } = new URL(request.url);
    const page = parseInt(SP.get('page') || '1', 10);
    const pageSize = parseInt(SP.get('pageSize') || '20', 10);

    const [list, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: auth.customerId, isDelete: false },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          material: { select: { id: true, materialName: true, internalCode: true } },
          _count: {
            select: {
              productionTasks: { where: { isDelete: false } },
            },
          },
        },
      }),
      prisma.order.count({ where: { customerId: auth.customerId, isDelete: false } }),
    ]);

    return successResponse({
      list: list.map(order => ({
        ...order,
        quantity: Number(order.quantity),
        deliveredQty: Number(order.deliveredQty),
        progress: Math.round((Number(order.deliveredQty) / Number(order.quantity)) * 100),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    console.error('获取客户订单进度失败:', error);
    return serverErrorResponse(error.message);
  }
}
