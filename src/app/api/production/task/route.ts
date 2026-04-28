// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 生产任务API
// 描述: 生产任务下发与管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/** GET /api/production/task - 获取生产任务列表
/**/
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const taskStatus = searchParams.get('taskStatus') || '';
    const keyword = searchParams.get('keyword') || '';

    // 构建查询条件
    const where: any = { isDelete: false };
    if (taskStatus) where.taskStatus = taskStatus;
    if (keyword) {
      where.OR = [
        { taskNo: { contains: keyword } },
        { order: { orderNo: { contains: keyword } } },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.productionTask.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              customerOrderNo: true,
              customer: { select: { id: true, customerName: true } },
            },
          },
          material: {
            select: { id: true, materialName: true, internalCode: true },
          },
        },
      }),
      prisma.productionTask.count({ where }),
    ]);

    return successResponse({
      list: list.map(task => ({
        ...task,
        taskQuantity: Number(task.taskQuantity),
        completedQty: Number(task.completedQty),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    console.error('获取生产任务列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

/** 锁定库存
/**/
async function lockInventoryForTask(
  taskId: number,
  materialId: number,
  quantity: number,
  orderId: number,
  auth: { userId: number; username: string }
) {
  await prisma.$transaction(async (tx) => {
    // 查询库存
    let inventory = await tx.inventory.findUnique({ where: { materialId } });
    if (!inventory) {
      inventory = await tx.inventory.create({
        data: { materialId, totalQty: 0, availableQty: 0, lockedQty: 0 },
      });
    }

    const availableQty = Number(inventory.availableQty);
    const lockQty = Math.min(availableQty, quantity);
    const remainQty = quantity - lockQty;

    // 锁定可用库存
    if (lockQty > 0) {
      await tx.inventory.update({
        where: { materialId },
        data: {
          availableQty: { decrement: lockQty },
          lockedQty: { increment: lockQty },
        },
      });

      await tx.inventoryFlow.create({
        data: {
          materialId,
          changeQty: lockQty,
          changeType: 'lock',
          orderId,
          taskId,
          beforeAvailableQty: availableQty,
          beforeLockedQty: Number(inventory.lockedQty),
          afterAvailableQty: availableQty - lockQty,
          afterLockedQty: Number(inventory.lockedQty) + lockQty,
          operatorId: auth.userId,
          operatorName: auth.username,
          remark: `生产任务锁定`,
        },
      });
    }

    // 如果库存不足，生成采购需求
    if (remainQty > 0) {
      await tx.purchaseRequirement.create({
        data: {
          requirementNo: `PUR-${Date.now()}-${taskId}`,
          materialId,
          requirementQty: remainQty,
          sourceType: 'auto',
          priority: 'high',
          sourceOrderId: orderId,
          status: 'pending',
        } as any,
      });
    }
  });
}
