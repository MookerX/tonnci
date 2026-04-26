// =============================================================================
// 腾曦生产管理系统 - 订单管理API
// 描述: 订单信息CRUD操作
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { orderSchema } from '@/lib/validators';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp, generateOrderNo } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

 * 生成订单号
 */
async function generateOrderNo(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // 获取当天订单数量+1
  const today = new Date(year, month, day);
  const count = await prisma.order.count({
    where: {
      createdAt: { gte: today },
      isDelete: false,
    },
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `DD${year}${month}${day}${sequence}`;
}

 * POST /api/order/production - 创建订单
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await extractToken(request);
    if (!auth) return NextResponse.json({ code: 401, message: '未授权', data: null }, { status: 401 });

    const body = await request.json();
    const validation = orderSchema.safeParse(body);
    if (!validation.success) return badRequestResponse('参数验证失败');

    const data = validation.data;

    // 生成订单号
    const orderNo = await generateOrderNo();

    // 创建订单
    const order = await prisma.order.create({
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
    await operationLog({
      module: '订单管理',
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
