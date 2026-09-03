// =============================================================================
// 腾曦生产管理系统 - 图纸打包下载
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/middleware';
import { badRequestResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/response';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import JSZip from 'jszip';

const STORAGE_BASE = process.env.LOCAL_STORAGE_PATH || '/workspace/projects/storage';

// POST /api/drawing/download - 打包下载图纸
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedResponse('请先登录');

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return badRequestResponse('请选择要下载的图纸');
    }

    // 获取图纸列表
    const drawings = await prisma.materialDrawing.findMany({
      where: { id: { in: ids }, isDelete: false, status: 'active' },
    });

    if (drawings.length === 0) {
      return badRequestResponse('未找到图纸');
    }

    // 使用 JSZip 打包
    const zip = new JSZip();
    let fileCount = 0;

    for (const drawing of drawings) {
      const srcPath = path.join(STORAGE_BASE, drawing.filePath);
      if (existsSync(srcPath)) {
        const buffer = await readFile(srcPath);
        // 使用文件名避免重名，加序号
        const fileName = fileCount > 0 ? `${fileCount + 1}_${drawing.fileName}` : drawing.fileName;
        zip.file(fileName, buffer);
        fileCount++;
      }
    }

    if (fileCount === 0) {
      return badRequestResponse('文件不存在或无法访问');
    }

    // 生成 zip 文件
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 返回 zip 文件
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="drawings_${Date.now()}.zip"`,
      },
    });
  } catch (error: any) {
    return serverErrorResponse(error.message);
  }
}
