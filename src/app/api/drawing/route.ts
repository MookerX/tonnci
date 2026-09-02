// =============================================================================
// 腾曦生产管理系统 - 图纸管理 API
// 描述: 图纸列表、上传、搜索
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

// =============================================================================
// GET /api/drawing - 获取图纸列表（支持搜索/筛选）
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedResponse('请先登录');

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const materialId = searchParams.get('materialId') ? parseInt(searchParams.get('materialId')!) : undefined;
    const drawingType = searchParams.get('drawingType') || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    const where: any = { isDelete: false };

    if (materialId) where.materialId = materialId;
    if (drawingType) where.drawingType = drawingType;
    if (status) where.status = status;

    if (keyword) {
      where.OR = [
        { fileName: { contains: keyword } },
        { filePath: { contains: keyword } },
      ];
    }

    const [total, drawings] = await Promise.all([
      prisma.materialDrawing.count({ where }),
      prisma.materialDrawing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // 补充物料和创建者信息
    const materialIds = [...new Set(drawings.filter(d => d.materialId).map(d => d.materialId))];
    const creatorIds = [...new Set(drawings.filter(d => d.createdBy).map(d => d.createdBy!))];

    const [materials, creators] = await Promise.all([
      materialIds.length > 0
        ? prisma.material.findMany({ where: { id: { in: materialIds } }, select: { id: true, materialName: true, internalCode: true, drawingCode: true } })
        : Promise.resolve([]),
      creatorIds.length > 0
        ? prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, realName: true, username: true } })
        : Promise.resolve([]),
    ]);

    const materialMap = new Map(materials.map(m => [m.id, m]));
    const creatorMap = new Map(creators.map(c => [c.id, c]));

    const list = drawings.map(d => ({
      ...d,
      material: d.materialId ? materialMap.get(d.materialId) || null : null,
      creator: d.createdBy ? creatorMap.get(d.createdBy) || null : null,
    }));

    return NextResponse.json(successResponse({
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }));
  } catch (error: any) {
    return NextResponse.json(serverErrorResponse(error.message));
  }
}

// =============================================================================
// POST /api/drawing - 上传图纸
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorizedResponse('请先登录');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const materialId = formData.get('materialId') ? parseInt(formData.get('materialId') as string) : null;
    const drawingType = (formData.get('drawingType') as string) || 'production';

    if (!file) {
      return NextResponse.json(badRequestResponse('请选择文件'));
    }

    // 支持的文件类型
    const ext = path.extname(file.name).toLowerCase();
    const allowedExts = ['.pdf', '.dwg', '.dxf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.zip', '.rar'];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json(badRequestResponse('不支持的文件格式，仅支持 PDF/DWG/DXF/图片/压缩包'));
    }

    // 计算MD5
    const buffer = Buffer.from(await file.arrayBuffer());
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');

    // MD5去重检查
    const existing = await prisma.materialDrawing.findFirst({
      where: { md5, isDelete: false, status: 'active' },
    });

    if (existing) {
      return NextResponse.json(successResponse({
        id: existing.id,
        duplicate: true,
        message: '文件已存在（MD5匹配）',
        file: existing,
      }));
    }

    // 创建存储目录
    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const storageDir = path.join(STORAGE_BASE, DRAWING_DIR, dateDir);
    if (!existsSync(storageDir)) {
      await mkdir(storageDir, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const uniqueName = `${timestamp}_${md5.slice(0, 8)}${ext}`;
    const filePath = path.join(storageDir, uniqueName);
    const relativePath = path.join(DRAWING_DIR, dateDir, uniqueName);

    // 写入文件
    await writeFile(filePath, buffer);

    // 获取最新版本号
    const lastVersion = await prisma.materialDrawing.findFirst({
      where: { materialId: materialId || undefined, isDelete: false },
      orderBy: { createdAt: 'desc' },
      select: { version: true },
    });
    const lastVerNum = parseInt(lastVersion?.version?.replace('V', '') || '0');
    const newVersion = `V${lastVerNum + 1}`;

    // 如果之前有最新版本，取消isLatest标记
    if (materialId) {
      await prisma.materialDrawing.updateMany({
        where: { materialId, isLatest: true, isDelete: false },
        data: { isLatest: false },
      });
    }

    // 创建图纸记录
    const drawing = await prisma.materialDrawing.create({
      data: {
        materialId,
        drawingType,
        version: newVersion,
        fileName: file.name,
        filePath: relativePath,
        fileSize: file.size,
        md5,
        isLatest: true,
        status: 'active',
        createdBy: auth.userId,
      },
    });

    return NextResponse.json(successResponse({
      id: drawing.id,
      duplicate: false,
      file: drawing,
    }));
  } catch (error: any) {
    return NextResponse.json(serverErrorResponse(error.message));
  }
}