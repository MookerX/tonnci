// =============================================================================
// 腾曦生产管理系统 - 静态文件访问API
// 提供上传文件的访问服务
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext];
    if (!contentType) {
      return new NextResponse('Unsupported file type', { status: 400 });
    }

    // 搜索可能的存储路径
    const possiblePaths = [
      path.join('/workspace/projects/storage/images', filename),
      path.join('/workspace/projects/storage', filename),
    ];

    let filePath = '';
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      return new NextResponse('File not found', { status: 404 });
    }

    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse('File not found', { status: 404 });
  }
}
