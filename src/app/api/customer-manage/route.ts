// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-expect-error
// =============================================================================
// 腾曦生产管理系统 - 客户账号管理API
// 描述: 客户账号创建、权限配置
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/** GET /api/customer-manage - 获取客户账号列表
/**/
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const keyword = searchParams.get('keyword') || '';

    const where: any = { isDelete: false, userType: 'customer' };
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { realName: { contains: keyword } },
        { customer: { customerName: { contains: keyword } } },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, customerName: true, customerCode: true } },
          dept: { select: { id: true, deptName: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse({
      list,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    console.error('获取客户账号列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

