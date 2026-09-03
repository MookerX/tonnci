// =============================================================================
// 腾曦生产管理系统 - 图纸版本管理
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/middleware';
import { successResponse, badRequestResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/response';

// GET /api/drawing/[id]/version - 获取图纸版本历史
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedResponse('请先登录');

    const { id } = await params;
    const drawingId = parseInt(id);
    if (isNaN(drawingId)) return badRequestResponse('参数错误');

    const drawing = await prisma.materialDrawing.findFirst({
      where: { id: drawingId, isDelete: false },
    });
    if (!drawing) return badRequestResponse('图纸不存在');

    // 查找同一物料的所有版本
    const versions = await prisma.materialDrawing.findMany({
      where: { materialId: drawing.materialId, isDelete: false },
      orderBy: { createdAt: 'desc' },
    });

    // 补充创建者信息
    const creatorIds = [...new Set(versions.filter(v => v.createdBy).map(v => v.createdBy!))];
    const creators = creatorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, realName: true, username: true } })
      : [];
    const creatorMap = new Map(creators.map(c => [c.id, c]));

    const list = versions.map(v => ({
      ...v,
      creator: v.createdBy ? creatorMap.get(v.createdBy) || null : null,
    }));

    return successResponse(list);
  } catch (error: any) {
    return serverErrorResponse(error.message);
  }
}