// =============================================================================
// 腾曦生产管理系统 - 图纸批量导入
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/middleware';
import { successResponse, badRequestResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/response';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const STORAGE_BASE = process.env.LOCAL_STORAGE_PATH || '/workspace/projects/storage';
const DRAWING_DIR = 'drawings';

// POST /api/drawing/batch - 批量导入图纸
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedResponse('请先登录');

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const materialId = formData.get('materialId') ? parseInt(formData.get('materialId') as string) : null;
    const drawingType = (formData.get('drawingType') as string) || 'production';

    if (!files || files.length === 0) {
      return badRequestResponse('请选择文件');
    }

    const allowedExts = ['.pdf', '.dwg', '.dxf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.zip', '.rar'];

    // 获取最新版本号
    const lastVersion = await prisma.materialDrawing.findFirst({
      where: { materialId: materialId || undefined, isDelete: false },
      orderBy: { createdAt: 'desc' },
      select: { version: true },
    });
    const lastVerNum = parseInt(lastVersion?.version?.replace('V', '') || '0');

    // 如果之前有最新版本，取消isLatest标记
    if (materialId) {
      await prisma.materialDrawing.updateMany({
        where: { materialId, isLatest: true, isDelete: false },
        data: { isLatest: false },
      });
    }

    const results: Array<{ fileName: string; success: boolean; message: string; id?: number }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = path.extname(file.name).toLowerCase();

      if (!allowedExts.includes(ext)) {
        results.push({ fileName: file.name, success: false, message: '不支持的文件格式' });
        continue;
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const md5 = crypto.createHash('md5').update(buffer).digest('hex');

        // MD5去重检查
        const existing = await prisma.materialDrawing.findFirst({
          where: { md5 },
        });

        if (existing) {
          results.push({ fileName: file.name, success: true, message: '文件已存在（MD5去重跳过）', id: existing.id });
          continue;
        }

        // 存储文件
        const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        const storageDir = path.join(STORAGE_BASE, DRAWING_DIR, dateDir);
        if (!existsSync(storageDir)) {
          await mkdir(storageDir, { recursive: true });
        }

        const timestamp = Date.now() + i;
        const uniqueName = `${timestamp}_${md5.slice(0, 8)}${ext}`;
        const filePath = path.join(storageDir, uniqueName);
        const relativePath = path.join(DRAWING_DIR, dateDir, uniqueName);

        await writeFile(filePath, buffer);

        const newVersion = `V${lastVerNum + 1 + i}`;

        const drawing = await prisma.materialDrawing.create({
          data: {
            materialId,
            drawingType,
            version: newVersion,
            fileName: file.name,
            filePath: relativePath,
            fileSize: file.size,
            md5,
            isLatest: i === 0,
            status: 'active',
            createdBy: auth.userId,
          },
        });

        results.push({ fileName: file.name, success: true, message: '导入成功', id: drawing.id });
      } catch (err: any) {
        results.push({ fileName: file.name, success: false, message: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return successResponse({
      results,
      total: files.length,
      successCount,
      failCount: files.length - successCount,
    });
  } catch (error: any) {
    return serverErrorResponse(error.message);
  }
}