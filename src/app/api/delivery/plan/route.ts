// =============================================================================
// 腾曦生产管理系统 - 发货计划API
// 描述: 发货计划管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

 * 生成发货计划号
 */
async function generateDeliveryPlanNo(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const count = await prisma.deliveryPlan.count({
    where: { createdAt: { gte: new Date(year, 0, 1) } },
  });
  return `JHD${year}${month}${String(count + 1).padStart(4, '0')}`;
}

 * POST /api/delivery/plan - 创建发货计划
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await extractToken(request);
    if (!auth) return NextResponse.json({ code: 401, message: '未授权', data: null }, { status: 401 });

    const body = await request.json();
    const { customerId, planDate, items, remark } = body;

    if (!customerId || !items || items.length === 0) {
      return badRequestResponse('参数不完整');
    }

    const planNo = await generateDeliveryPlanNo();

    const plan = await prisma.deliveryPlan.create({
      data: {
        planNo,
        customerId,
        planDate: planDate ? new Date(planDate) : new Date(),
        planStatus: 'pending',
        remark,
        createdBy: auth.userId,
        modifiedBy: auth.userId,
      },
    });

    // 创建计划明细
    for (const item of items) {
      await prisma.deliveryPlanItem.create({
        data: {
          planId: plan.id,
          orderId: item.orderId,
          planQty: item.planQty,
        },
      });
    }

    await operationLog({
      module: '发货管理',
      businessType: '创建发货计划',
      operatorId: auth.userId,
      operatorName: auth.username,
      operationDesc: `创建发货计划: ${planNo}`,
      ipAddress: getClientIp(request),
      status: 'success',
    });

    return successResponse(plan);
  } catch (error: any) {
    console.error('创建发货计划失败:', error);
    return serverErrorResponse(error.message);
  }
}
