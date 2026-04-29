// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 菜单排序API
// 描述: 批量更新菜单排序
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

const sortSchema = z.object({
  orders: z.array(z.object({
    id: z.number().int().positive(),
    sortOrder: z.number().int(),
  })),
});

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = sortSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues?.[0]?.message || '参数验证失败');
    }

    const { orders } = validationResult.data;

    // 批量更新排序
    await prisma.$transaction(
      orders.map(({ id, sortOrder }) =>
        prisma.menu.update({
          where: { id, isDelete: false },
          data: { sortOrder, modifiedBy: authResult.userId },
        })
      )
    );

    return successResponse({ updated: orders.length });
  } catch (error: any) {
    console.error('Sort menu error:', error);
    return serverErrorResponse(error.message);
  }
}
