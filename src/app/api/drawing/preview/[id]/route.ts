// =============================================================================
// 腾曦生产管理系统 - 图纸在线预览
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/middleware';
import { unauthorizedResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const STORAGE_BASE = process.env.LOCAL_STORAGE_PATH || '/workspace/projects/storage';

// GET /api/drawing/preview/[id] - 在线预览图纸
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedResponse('请先登录');

    const { id } = await params;
    const drawingId = parseInt(id);
    if (isNaN(drawingId)) return NextResponse.json(badRequestResponse('参数错误'));

    const drawing = await prisma.materialDrawing.findFirst({
      where: { id: drawingId, isDelete: false, status: 'active' },
    });
    if (!drawing) return NextResponse.json(badRequestResponse('图纸不存在'));

    const filePath = path.join(STORAGE_BASE, drawing.filePath);
    if (!existsSync(filePath)) return NextResponse.json(badRequestResponse('文件不存在'));

    const buffer = await readFile(filePath);
    const ext = path.extname(drawing.fileName).toLowerCase();

    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
    };

    const mime = mimeMap[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `inline; filename="${drawing.fileName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json(serverErrorResponse(error.message));
  }
}