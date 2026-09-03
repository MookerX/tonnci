// =============================================================================
// 腾曦生产管理系统 - 图纸打包下载
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/middleware';
import { successResponse, badRequestResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/response';
import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';

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

    // 创建临时目录用于打包
    const tmpDir = path.join('/tmp', 'download_' + Date.now());
    await mkdir(tmpDir, { recursive: true });

    // 复制文件到临时目录
    for (const drawing of drawings) {
      const srcPath = path.join(STORAGE_BASE, drawing.filePath);
      if (existsSync(srcPath)) {
        const destPath = path.join(tmpDir, drawing.fileName);
        const buffer = await readFile(srcPath);
        await require('fs/promises').writeFile(destPath, buffer);
      }
    }

    // 打包成zip
    // 使用系统zip命令
    const zipPath = path.join('/tmp', `drawings_${Date.now()}.zip`);
    const { execSync } = require('child_process');
    execSync(`cd /tmp && zip -j "${zipPath}" "${tmpDir}"/*`, { stdio: 'ignore' });

    // 读取zip文件
    const zipBuffer = await readFile(zipPath);

    // 清理临时文件
    execSync(`rm -rf "${tmpDir}" "${zipPath}"`, { stdio: 'ignore' });

    // 返回zip文件
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