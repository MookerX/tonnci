import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '未登录', data: null });
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';

    if (!keyword.trim()) {
      return NextResponse.json({ code: 400, message: '请输入搜索关键词', data: null });
    }

    const materials = await prisma.material.findMany({
      where: {
        isDelete: false,
        OR: [
          { internalCode: { contains: keyword } },
          { drawingCode: { contains: keyword } },
          { drawingNo: { contains: keyword } },
          { materialName: { contains: keyword } },
        ],
      },
      select: {
        id: true,
        materialName: true,
        internalCode: true,
        drawingCode: true,
        drawingNo: true,
      },
      take: 20,
    });

    return NextResponse.json({ code: 200, message: 'ok', data: materials });
  } catch (error) {
    console.error('搜索物料失败:', error);
    return NextResponse.json({ code: 500, message: '搜索物料失败', data: null });
  }
}