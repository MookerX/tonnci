// =============================================================================
// 腾曦生产管理系统 - 发货管理API
// 描述: 发货计划、出库管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/** 生成发货单号
/**/
async function generateDeliveryNo(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const count = await prisma.delivery.count({ where: { createdAt: { gte: new Date(year, 0, 1) } } });
  return `FH${year}${month}${String(count + 1).padStart(4, '0')}`;
}

/** POST /api/delivery - 创建发货计划
/**/
export async function POST(request: NextRequest) {
  try {
    const auth = await extractToken(request);
    if (!auth) return NextResponse.json({ code: 401, message: '未授权', data: null }, { status: 401 });

    const body = await request.json();
    const { customerId, deliveryDate, items, logisticsNo, logisticsCompany, remark } = body;

    if (!customerId || !items || items.length === 0) {
      return badRequestResponse('参数不完整');
    }

    const deliveryNo = await generateDeliveryNo();

    // 创建发货单
    const delivery = await prisma.delivery.create({
      data: {
        deliveryNo,
        customerId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        logisticsNo,
        logisticsCompany,
        deliveryStatus: 'pending',
        remark,
        createdBy: auth.userId,
        modifiedBy: auth.userId,
      },
    });

    // 创建发货明细
    let totalQty = 0;
    for (const item of items) {
      await prisma.deliveryItem.create({
        data: {
          deliveryId: delivery.id,
          orderId: item.orderId,
          materialId: item.materialId,
          deliveryQty: item.deliveryQty,
        },
      });
      totalQty += item.deliveryQty;

      // 更新订单已交数量
      const order = await prisma.order.findUnique({ where: { id: item.orderId } });
      if (order) {
        const newDeliveredQty = Number(order.deliveredQty || 0) + item.deliveryQty;
        await prisma.order.update({
          where: { id: item.orderId },
          data: {
            deliveredQty: newDeliveredQty,
            orderStatus: newDeliveredQty >= Number(order.quantity) ? 'completed' : 'processing',
          },
        });
      }
    }

    // 记录操作日志
    await operationLog({
      module: '发货管理',
      businessType: '创建发货计划',
      operatorId: auth.userId,
      operatorName: auth.username,
      operationDesc: `创建发货计划: ${deliveryNo}, 数量: ${totalQty}`,
      ipAddress: getClientIp(request),
      status: 'success',
    });

    return successResponse(delivery);
  } catch (error: any) {
    console.error('创建发货计划失败:', error);
    return serverErrorResponse(error.message);
  }
}
