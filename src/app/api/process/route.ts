// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-expect-error
// =============================================================================
// 腾曦生产管理系统 - 工艺与工时管理API
// 描述: 工艺路线、工序、工时等基础数据管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { extractToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/**
 * GET /api/process - 获取工艺相关数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'route'; // route, process, team, equipment
    const keyword = searchParams.get('keyword') || '';

    let where: any = { isDelete: false };
    if (keyword) {
      if (type === 'team') where.teamName = { contains: keyword };
      else if (type === 'equipment') where.equipmentName = { contains: keyword };
      else if (type === 'process') where.processName = { contains: keyword };
      else where.routeName = { contains: keyword };
    }

    let list: any[] = [];
    switch (type) {
      case 'team':
        list = await prisma.team.findMany({ where, orderBy: { createdAt: 'asc' } });
        break;
      case 'equipment':
        list = await prisma.team.findMany({
          where: { ...where, teamType: 'equipment' },
          orderBy: { createdAt: 'desc' },
          include: { leader: { select: { id: true, realName: true } } },
        });
        break;
      case 'process':
        list = await prisma.process.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          include: { team: { select: { id: true, teamName: true } } },
        });
        break;
      case 'route':
      default:
        list = await prisma.processRoute.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            material: { select: { id: true, materialName: true, internalCode: true } },
          },
        });
        break;
    }

    return successResponse(list);
  } catch (error: any) {
    console.error('获取工艺数据失败:', error);
    return serverErrorResponse(error.message);
  }
}

