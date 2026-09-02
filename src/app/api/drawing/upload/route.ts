import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const STORAGE_DIR = process.env.LOCAL_STORAGE_PATH || '/workspace/projects/storage/drawings';

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
      return NextResponse.json(badRequestResponse('请选择文件'), { status: 400 });
    }

    // 提取文件名（不含扩展名）用于物料匹配
    const fileName = file.name;
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '').trim();

    // 写入本地存储
    const buffer = Buffer.from(await file.arrayBuffer());
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');

    // MD5去重检查
    const existing = await prisma.materialDrawing.findFirst({
      where: { md5, isDelete: false },
    });
    if (existing) {
      return NextResponse.json({
        code: 400,
        message: `文件 "${fileName}" 已存在（MD5重复），所属图纸：${existing.fileName}`,
        data: { md5, existing: true },
      }, { status: 400 });
    }

    // 如果传入了materialId，直接关联
    if (materialId) {
      // 验证物料是否存在
      const material = await prisma.material.findFirst({
        where: { id: materialId, isDelete: false },
      });
      if (!material) {
        return NextResponse.json(badRequestResponse('关联的物料不存在'), { status: 400 });
      }
    }

    // 如果没有传入materialId，尝试通过文件名匹配
    let matchedMaterials: any[] = [];
    if (!materialId) {
      // 查找物料：内部编码、图纸编码、图号与文件名匹配
      matchedMaterials = await prisma.material.findMany({
        where: {
          isDelete: false,
          OR: [
            { internalCode: fileNameWithoutExt },
            { drawingCode: fileNameWithoutExt },
            { drawingNo: fileNameWithoutExt },
          ],
        },
        select: { id: true, materialName: true, internalCode: true, drawingCode: true, drawingNo: true },
      });

      // 如果匹配到0个，返回可搜索提示
      if (matchedMaterials.length === 0) {
        // 保存文件但不关联物料
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const dir = path.join(STORAGE_DIR, dateStr);
        if (!existsSync(dir)) await mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${Date.now()}_${fileName}`);
        await writeFile(filePath, buffer);

        const drawing = await prisma.materialDrawing.create({
          data: {
            materialId: null,
            fileName,
            filePath,
            fileSize: buffer.length,
            md5,
            version: 1,
            isLatest: true,
            isDelete: false,
            createdBy: user.id,
          },
        });

        return NextResponse.json(successResponse({
          drawing,
          materialMatch: null,
          message: '未匹配到物料，已保存为未关联图纸。可在编辑中关联物料',
        }));
      }

      // 如果匹配到1个，自动关联
      if (matchedMaterials.length === 1) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const dir = path.join(STORAGE_DIR, dateStr);
        if (!existsSync(dir)) await mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${Date.now()}_${fileName}`);
        await writeFile(filePath, buffer);

        const drawing = await prisma.materialDrawing.create({
          data: {
            materialId: matchedMaterials[0].id,
            fileName,
            filePath,
            fileSize: buffer.length,
            md5,
            version: 1,
            isLatest: true,
            isDelete: false,
            createdBy: user.id,
          },
        });

        return NextResponse.json(successResponse({
          drawing,
          materialMatch: {
            matched: true,
            material: matchedMaterials[0],
            message: `已自动关联物料「${matchedMaterials[0].materialName}」`,
          },
        }));
      }

      // 如果匹配到多个，返回列表让用户选择
      return NextResponse.json(successResponse({
        materialMatch: {
          matched: false,
          multiple: true,
          materials: matchedMaterials,
          fileName,
          message: `找到 ${matchedMaterials.length} 个匹配的物料，请选择要关联的物料`,
        },
      }));
    }

    // 有materialId，直接保存
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const dir = path.join(STORAGE_DIR, dateStr);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${Date.now()}_${fileName}`);
    await writeFile(filePath, buffer);

    const drawing = await prisma.materialDrawing.create({
      data: {
        materialId,
        fileName,
        filePath,
        fileSize: buffer.length,
        md5,
        version: 1,
        isLatest: true,
        isDelete: false,
        createdBy: user.id,
      },
    });

    return NextResponse.json(successResponse({ drawing, materialMatch: { matched: true, material: null } }));
  } catch (err: any) {
    console.error('上传图纸失败:', err);
    return NextResponse.json(serverErrorResponse('上传失败: ' + err.message), { status: 500 });
  }
}