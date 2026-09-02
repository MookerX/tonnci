import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { writeFile, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';
import { existsSync } from 'fs';

const STORAGE_BASE = process.env.LOCAL_STORAGE_PATH || join(process.cwd(), 'storage');
const DRAWING_DIR = join(STORAGE_BASE, 'drawings');

// 获取文件MD5
async function getFileMd5(buffer: Buffer): Promise<string> {
  return createHash('md5').update(buffer).digest('hex');
}

// 确保目录存在
async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// 获取文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 获取下一个版本号
async function getNextVersion(drawingId: number): Promise<number> {
  const lastVersion = await prisma.materialDrawing.findFirst({
    where: { id: drawingId },
    select: { version: true },
    orderBy: { version: 'desc' },
  });
  return (lastVersion?.version || 0) + 1;
}

// 根据文件名匹配物料
async function matchMaterialByFilename(filename: string): Promise<{ matched: boolean; materials: any[] }> {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  if (!nameWithoutExt) return { matched: false, materials: [] };

  const materials = await prisma.material.findMany({
    where: {
      isDelete: false,
      OR: [
        { internalCode: nameWithoutExt },
        { drawingCode: nameWithoutExt },
        { drawingNo: nameWithoutExt },
      ],
    },
    select: {
      id: true,
      materialName: true,
      internalCode: true,
      drawingCode: true,
      drawingNo: true,
    },
  });

  return {
    matched: materials.length > 0,
    materials,
  };
}

// GET /api/drawing - 列表查询
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ code: 401, message: '未登录', data: null });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const fileName = searchParams.get('fileName') || '';
    const drawingType = searchParams.get('drawingType') || '';
    const version = searchParams.get('version') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const where: any = { isDelete: false };

    if (fileName) where.fileName = { contains: fileName };
    if (drawingType) where.drawingType = drawingType;
    if (version) where.version = parseInt(version);
    if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...(where.createdAt || {}), lte: new Date(endDate + 'T23:59:59') };

    const [list, total] = await Promise.all([
      prisma.materialDrawing.findMany({
        where,
        select: {
          id: true,
          materialId: true,
          drawingType: true,
          version: true,
          fileName: true,
          filePath: true,
          fileSize: true,
          md5: true,
          isLatest: true,
          status: true,
          createdAt: true,
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.materialDrawing.count({ where }),
    ]);

    // 获取关联物料信息
    const materialIds = list.map(d => d.materialId).filter(Boolean) as number[];
    const materials = materialIds.length > 0
      ? await prisma.material.findMany({
          where: { id: { in: materialIds }, isDelete: false },
          select: { id: true, materialName: true, internalCode: true, drawingCode: true },
        })
      : [];
    const materialMap = new Map(materials.map(m => [m.id, m]));

    const listWithMaterial = list.map(d => ({
      ...d,
      fileSize: d.fileSize ? formatFileSize(Number(d.fileSize)) : '-',
      materialName: d.materialId ? materialMap.get(d.materialId)?.materialName || '-' : '-',
      materialInfo: d.materialId ? materialMap.get(d.materialId) || null : null,
    }));

    return NextResponse.json({ code: 200, message: 'ok', data: { list: listWithMaterial, total } });
  } catch (error) {
    console.error('查询图纸列表失败:', error);
    return NextResponse.json({ code: 500, message: '查询失败', data: null });
  }
}

// POST /api/drawing - 单文件上传（含物料关联）
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ code: 401, message: '未登录', data: null });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const materialIdStr = formData.get('materialId') as string | null;

    if (!file) return NextResponse.json({ code: 400, message: '请选择文件', data: null });

    await ensureDir(DRAWING_DIR);

    const buffer = Buffer.from(await file.arrayBuffer());
    const md5 = await getFileMd5(buffer);
    const fileName = file.name;
    const fileSize = file.size;

    // MD5去重检查
    const existing = await prisma.materialDrawing.findFirst({
      where: { md5, isDelete: false },
      select: { id: true, fileName: true, version: true },
    });
    if (existing) {
      return NextResponse.json({
        code: 400,
        message: `文件已存在（MD5: ${md5}），已上传为：${existing.fileName}（版本 ${existing.version}）`,
        data: { md5, existingFile: existing.fileName },
      });
    }

    // 物料关联
    let materialId: number | null = null;
    let matchResult: { matched: boolean; materials: any[] } = { matched: false, materials: [] };

    if (materialIdStr) {
      // 用户手动指定了物料
      materialId = parseInt(materialIdStr);
    } else {
      // 根据文件名自动匹配
      matchResult = await matchMaterialByFilename(fileName);
      if (matchResult.matched && matchResult.materials.length === 1) {
        materialId = matchResult.materials[0].id;
      }
    }

    // 如果物料已匹配且该物料已有最新版本图纸，则创建新版本，否则创建新记录
    let drawingRecord;
    const existingDrawing = materialId
      ? await prisma.materialDrawing.findFirst({
          where: { materialId, isLatest: true, isDelete: false },
          select: { id: true, version: true },
        })
      : null;

    // 保存文件
    const timestamp = Date.now();
    const safeFileName = `${timestamp}_${fileName}`;
    const filePath = join(DRAWING_DIR, safeFileName);
    await writeFile(filePath, buffer);

    if (existingDrawing) {
      // 创建新版本，旧版本标记为非最新
      await prisma.materialDrawing.updateMany({
        where: { materialId: materialId!, isLatest: true, isDelete: false },
        data: { isLatest: false },
      });

      drawingRecord = await prisma.materialDrawing.create({
        data: {
          materialId,
          drawingType: fileName.split('.').pop()?.toLowerCase() || 'unknown',
          version: existingDrawing.version + 1,
          fileName,
          filePath: safeFileName,
          fileSize,
          md5,
          isLatest: true,
          status: 'active',
          createdBy: user.id,
        },
      });
    } else {
      drawingRecord = await prisma.materialDrawing.create({
        data: {
          materialId,
          drawingType: fileName.split('.').pop()?.toLowerCase() || 'unknown',
          version: 1,
          fileName,
          filePath: safeFileName,
          fileSize,
          md5,
          isLatest: true,
          status: 'active',
          createdBy: user.id,
        },
      });
    }

    return NextResponse.json({
      code: 200,
      message: matchResult.matched && matchResult.materials.length > 1
        ? '多个物料匹配，请选择关联'
        : '上传成功',
      data: {
        drawing: {
          id: drawingRecord.id,
          fileName: drawingRecord.fileName,
          fileSize: formatFileSize(fileSize),
          version: drawingRecord.version,
          md5,
          isLatest: true,
          materialId,
        },
        matchResult: matchResult.matched && matchResult.materials.length > 1 ? matchResult.materials : undefined,
        autoMatched: matchResult.matched && matchResult.materials.length === 1,
      },
    });
  } catch (error) {
    console.error('上传图纸失败:', error);
    return NextResponse.json({ code: 500, message: '上传失败', data: null });
  }
}