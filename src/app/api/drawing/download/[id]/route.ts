// =============================================================================
// 腾曦生产管理系统 - 图纸单文件直接下载（不打包 ZIP）
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/middleware';
import { unauthorizedResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import mime from 'mime';

const STORAGE_BASE = process.env.LOCAL_STORAGE_PATH || '/workspace/projects/storage';

// GET /api/drawing/download/[id] - 直接下载单个图纸文件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedResponse('请先登录');

    const { id } = await params;
    const drawingId = parseInt(id);
    if (isNaN(drawingId)) return badRequestResponse('无效的图纸ID');

    const drawing = await prisma.materialDrawing.findFirst({
      where: { id: drawingId, isDelete: false, status: 'active' },
    });
    if (!drawing) return badRequestResponse('图纸不存在或已删除');

    const srcPath = drawing.filePath.startsWith('/')
      ? drawing.filePath
      : path.join(STORAGE_BASE, drawing.filePath);

    if (!existsSync(srcPath)) return badRequestResponse('文件不存在');

    const buffer = await readFile(srcPath);
    const safeName = drawing.fileName || `${drawing.id}_${Date.now()}`;
    const mimeType = mime.getType(drawing.fileName || '') || 'application/octet-stream';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: any) {
    return serverErrorResponse('下载失败: ' + err.message);
  }
}