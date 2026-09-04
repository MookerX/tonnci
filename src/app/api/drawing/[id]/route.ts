// =============================================================================
// 腾曦生产管理系统 - 图纸详情 / 更新 / 删除
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/middleware';
import { successResponse, badRequestResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/response';
import { unlink } from 'fs/promises';
import path from 'path';

const STORAGE_BASE = process.env.LOCAL_STORAGE_PATH || '/workspace/projects/storage';

// GET /api/drawing/[id] - 获取图纸详情
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedResponse('请先登录');

    const { id } = await params;
    const drawingId = parseInt(id);
    if (isNaN(drawingId)) return badRequestResponse('参数错误');

    const drawing = await prisma.materialDrawing.findFirst({
      where: { id: drawingId },
    });

    if (!drawing) {
      return badRequestResponse('图纸不存在');
    }

    // 补充物料和创建者信息
    let material = null;
    let creator = null;
    if (drawing.materialId) {
      material = await prisma.material.findUnique({ where: { id: drawing.materialId }, select: { id: true, materialName: true, internalCode: true, drawingCode: true } });
    }
    if (drawing.createdBy) {
      creator = await prisma.user.findUnique({ where: { id: drawing.createdBy }, select: { id: true, realName: true, username: true } });
    }

    return successResponse({ ...drawing, material, creator });
  } catch (error: any) {
    return serverErrorResponse(error.message);
  }
}

// PUT /api/drawing/[id] - 更新图纸信息
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedResponse('请先登录');

    const { id } = await params;
    const drawingId = parseInt(id);
    if (isNaN(drawingId)) return badRequestResponse('参数错误');

    const body = await request.json();
    const { materialId, drawingType, status, action } = body;

    const drawing = await prisma.materialDrawing.findFirst({
      where: { id: drawingId },
    });
    if (!drawing) return badRequestResponse('图纸不存在');

    // 处理禁用/启用操作
    if (action === 'disable') {
      await prisma.materialDrawing.update({
        where: { id: drawingId },
        data: { status: 'deleted', isDelete: true },
      });
      return successResponse(null, '已禁用');
    }

    if (action === 'enable') {
      await prisma.materialDrawing.update({
        where: { id: drawingId },
        data: { status: 'active', isDelete: false },
      });
      return successResponse(null, '已启用');
    }

    const updateData: any = {};
    if (materialId !== undefined) updateData.materialId = materialId;
    if (drawingType !== undefined) updateData.drawingType = drawingType;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.materialDrawing.update({
      where: { id: drawingId },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error: any) {
    return serverErrorResponse(error.message);
  }
}

// DELETE /api/drawing/[id] - 删除图纸（删除文件 + 软删除记录）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedResponse('请先登录');

    const { id } = await params;
    const drawingId = parseInt(id);
    if (isNaN(drawingId)) return badRequestResponse('参数错误');

    const drawing = await prisma.materialDrawing.findFirst({
      where: { id: drawingId },
    });
    if (!drawing) return badRequestResponse('图纸不存在');

    // 删除物理文件
    if (drawing.filePath) {
      try {
        const absolutePath = drawing.filePath.startsWith('/')
          ? drawing.filePath
          : path.join(STORAGE_BASE, drawing.filePath);
        await unlink(absolutePath);
      } catch (fileErr: any) {
        console.warn('文件删除失败（可能已不存在）:', drawing.filePath, fileErr.message);
      }
    }

    // 永久删除数据库记录
    await prisma.materialDrawing.delete({
      where: { id: drawingId },
    });

    return successResponse(null, '删除成功');
  } catch (error: any) {
    return serverErrorResponse(error.message);
  }
}