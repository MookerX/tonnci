// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 订单管理API
// 描述: 订单信息CRUD操作
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { orderSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/**
 * GET /api/order/production - 获取订单列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const where: any = { isDelete: false };
    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword } },
        { customerOrderNo: { contains: keyword } },
      ];
    }
    if (status) where.orderStatus = status;

    const [orders, total] = await Promise.all([
      prisma.productionOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, customerName: true } },
          material: { select: { id: true, materialName: true, internalCode: true } },
        },
      }),
      prisma.productionOrder.count({ where }),
    ]);

    return successResponse({
      list: orders,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    console.error('获取订单列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * POST /api/order/production - 创建订单
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const auth = authResult;

    const body = await request.json();
    const validation = orderSchema.safeParse(body);
    if (!validation.success) return badRequestResponse('参数验证失败');

    const data = validation.data;

    // 生成订单号
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const today = new Date(year, date.getMonth(), day);
    const count = await prisma.productionOrder.count({
      where: { createdAt: { gte: today }, isDelete: false },
    });
    const sequence = String(count + 1).padStart(4, '0');
    const orderNo = `DD${year}${month}${day}${sequence}`;

    // 创建订单
    const order = await prisma.productionOrder.create({
      data: {
        uuid: crypto.randomUUID(),
        orderNo,
        customerId: data.customerId,
        materialId: data.materialId,
        customerOrderNo: data.customerOrderNo,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        nestingPlanDate: data.nestingPlanDate ? new Date(data.nestingPlanDate) : null,
        materialPlanDate: data.materialPlanDate ? new Date(data.materialPlanDate) : null,
        purchasePlanDate: data.purchasePlanDate ? new Date(data.purchasePlanDate) : null,
        productionPlanDate: data.productionPlanDate ? new Date(data.productionPlanDate) : null,
        deliveryAddress: data.deliveryAddress,
        freightBear: data.freightBear,
        projectName: data.projectName,
        projectCode: data.projectCode,
        equipmentNo: data.equipmentNo,
        equipmentName: data.equipmentName,
        surfaceTreatment: data.surfaceTreatment,
        orderStatus: data.orderStatus || 'pending',
        remark: data.remark,
        createdBy: auth.userId,
        modifiedBy: auth.userId,
      },
    });

    // 记录操作日志
    await operationLog.log({
      moduleName: '订单管理',
      businessType: '新增订单',
      operatorId: auth.userId,
      operatorName: auth.username,
      operationDesc: `新增订单: ${order.orderNo} (客户:${data.customerId}, 物料:${data.materialId}, 数量:${data.quantity})`,
      ipAddress: getClientIp(request),
      status: 'success',
    });

    return successResponse(order);
  } catch (error: any) {
    console.error('创建订单失败:', error);
    return serverErrorResponse(error.message);
  }
}
