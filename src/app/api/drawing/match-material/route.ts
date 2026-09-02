import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, serverErrorResponse, badRequestResponse } from '@/lib/response';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { fileName } = body;
    if (!fileName) {
      return NextResponse.json(badRequestResponse('缺少文件名'));
    }

    // 提取文件名（不含扩展名）
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '').trim();
    if (!nameWithoutExt) {
      return NextResponse.json(successResponse([]));
    }

    // 查找物料：内部编码、图纸编码、图号与文件名匹配
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

    return NextResponse.json(successResponse(materials));
  } catch (error: any) {
    console.error('物料匹配失败:', error);
    return NextResponse.json(serverErrorResponse('物料匹配失败: ' + error.message));
  }
}