// =============================================================================
// 腾曦生产管理系统 - 文件上传API
// 文件保存到 StorageConfig 中配置的存储路径
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return badRequestResponse('请选择文件');

    // 获取文件扩展名
    const ext = path.extname(file.name).toLowerCase();
    if (!ext) return badRequestResponse('文件无扩展名');

    // 查找匹配的存储配置
    const storageConfigs = await prisma.storageConfig.findMany({
      where: { isDelete: false, status: 'active' },
      orderBy: { isDefault: 'desc' },
    });

    let matchedStorage = storageConfigs.find(s =>
      s.fileTypes.split(',').some(t => t.trim().toLowerCase() === ext)
    );

    // 如果没有匹配的，使用默认存储
    if (!matchedStorage) {
      matchedStorage = storageConfigs.find(s => s.isDefault);
    }

    if (!matchedStorage) {
      return badRequestResponse('未找到匹配的存储配置');
    }

    // 生成文件名
    const filename = `${Date.now()}-${randomUUID()}${ext}`;

    // 根据存储类型保存
    let filePath = '';
    let accessUrl = '';

    if (matchedStorage.storageType === 'local') {
      const basePath = matchedStorage.basePath || '/workspace/projects/storage/images';
      // 确保目录存在
      if (!existsSync(basePath)) {
        await mkdir(basePath, { recursive: true });
      }
      filePath = path.join(basePath, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      // 构建访问URL - 通过 /api/upload/[filename] 访问
      accessUrl = `/api/upload/${filename}`;
    } else {
      return badRequestResponse('暂不支持该存储类型');
    }

    return successResponse({ url: accessUrl, filename, storageName: matchedStorage.storageName }, '上传成功');
  } catch (error: any) {
    console.error('文件上传失败:', error);
    return serverErrorResponse(error.message);
  }
}
