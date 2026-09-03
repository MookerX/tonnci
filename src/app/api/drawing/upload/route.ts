import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * 获取图纸存储配置
 * 优先查找名为"图纸存储"的配置，其次按文件扩展名匹配，最后使用默认配置
 */
async function getDrawingStorageConfig(fileExt: string) {
  const storageConfigs = await prisma.storageConfig.findMany({
    where: { isDelete: false, status: 'active' },
    orderBy: { isDefault: 'desc' },
  });

  // 1. 优先查找名为"图纸存储"的配置
  let matched = storageConfigs.find(s => s.storageName === '图纸存储');

  // 2. 没有"图纸存储"，按文件扩展名匹配
  if (!matched) {
    matched = storageConfigs.find(s => {
      const types = s.fileTypes.split(',').map(t => t.trim().toLowerCase().replace(/^\./, ''));
      return types.includes(fileExt.replace(/^\./, ''));
    });
  }

  // 3. 没有匹配的，使用默认存储
  if (!matched) {
    matched = storageConfigs.find(s => s.isDefault);
  }

  return matched;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const materialId = formData.get('materialId') ? Number(formData.get('materialId')) : null;

    if (!file) {
      return badRequestResponse('请选择文件');
    }

    const fileName = file.name;
    const ext = path.extname(fileName).toLowerCase();
    if (!ext) {
      return badRequestResponse('文件无扩展名');
    }

    // 从存储管理配置中获取存储路径和允许的文件类型
    const storageConfig = await getDrawingStorageConfig(ext);
    if (!storageConfig) {
      return badRequestResponse('未找到可用的存储配置，请先在存储管理中配置存储设备');
    }

    // 校验文件类型是否在允许范围内
    const allowedTypes = storageConfig.fileTypes
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/^\./, ''));
    const extClean = ext.replace(/^\./, '');
    if (!allowedTypes.includes(extClean)) {
      return badRequestResponse(
        `不支持的文件类型 "${ext}"，当前存储 "${storageConfig.storageName}" 允许的类型：${allowedTypes.map(t => '.' + t).join(', ')}`
      );
    }

    // 校验文件大小
    if (storageConfig.maxFileSize && file.size > storageConfig.maxFileSize) {
      const maxMB = (storageConfig.maxFileSize / 1024 / 1024).toFixed(1);
      return badRequestResponse(`文件大小超出限制，最大允许 ${maxMB} MB`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');

    // MD5去重检查
    const existing = await prisma.materialDrawing.findFirst({
      where: { md5, isDelete: false },
    });
    if (existing) {
      // 查询关联的物料信息
      let materialInfo = null;
      if (existing.materialId) {
        const mat = await prisma.material.findUnique({
          where: { id: existing.materialId },
        });
        if (mat) {
          materialInfo = {
            id: mat.id,
            materialName: mat.materialName,
            drawingCode: mat.drawingCode,
            internalCode: mat.internalCode,
            drawingNo: mat.drawingNo,
            materialType: mat.materialType,
            unit: mat.unit,
            spec: mat.spec,
            weight: mat.weight,
            remark: mat.remark,
          };
        }
      }
      return NextResponse.json({
        code: 409,
        message: `文件已存在：${existing.fileName}`,
        data: {
          md5,
          existing: true,
          existingFile: {
            id: existing.id,
            fileName: existing.fileName,
            fileSize: existing.fileSize,
            version: existing.version,
            createdAt: existing.createdAt,
          },
          material: materialInfo,
        },
      }, { status: 409 });
    }

    // 保存文件到存储配置的路径下
    const basePath = storageConfig.basePath || '/workspace/projects/storage';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const dir = path.join(basePath, dateStr);

    // 验证物料是否存在（如果提供）
    if (materialId) {
      const material = await prisma.material.findFirst({
        where: { id: materialId, isDelete: false },
      });
      if (!material) {
        return badRequestResponse('关联的物料不存在');
      }
    }
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${Date.now()}_${fileName}`);
    await writeFile(filePath, buffer);

    // 检查该物料是否已有图纸记录（仅当有materialId时）
    if (materialId) {
      await prisma.materialDrawing.updateMany({
        where: { materialId, isLatest: true, isDelete: false },
        data: { isLatest: false },
      });
    }

    // 创建新图纸记录
    const createData: any = {
      drawingType: '设计图',
      fileName,
      filePath,
      fileSize: buffer.length,
      md5,
      version: 'V1',
      isLatest: true,
      isDelete: false,
      createdBy: user.id,
    };
    if (materialId) {
      createData.materialId = materialId;
    }
    // 使用 $executeRawUnsafe 插入记录，绕过 Prisma 客户端缓存
    await prisma.$executeRawUnsafe(
      `INSERT INTO material_drawing (file_name, file_path, file_size, md5, material_id, drawing_type, version, is_latest, status, isDelete, created_at, updated_at, created_by) 
       VALUES (?, ?, ?, ?, ${materialId ? materialId : 'NULL'}, '设计图', 'V1', 1, 'active', 0, NOW(), NOW(), ?)`,
      fileName,
      filePath,
      buffer.length,
      md5,
      user.id
    );
    const idResult = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(`SELECT LAST_INSERT_ID() as id`);
    const newId = Number((idResult as any[])[0]?.id || 0);
    const drawing = { id: newId, fileName, filePath, fileSize: buffer.length, md5, version: 'V1', isLatest: true, status: 'active' };

    // 获取物料名称（如果有关联）
    let materialName = '';
    if (materialId) {
      const material = await prisma.material.findUnique({ where: { id: materialId }, select: { materialName: true } });
      materialName = material?.materialName || '';
    }

    return successResponse({
      id: drawing.id,
      drawing,
      materialName,
    });
  } catch (err: any) {
    console.error('上传图纸失败:', err);
    return serverErrorResponse('上传失败: ' + err.message);
  }
}
