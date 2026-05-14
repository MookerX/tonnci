import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/response';

// GET: 搜索物料（根据物料编码或物料名称）
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return errorResponse(401, '请先登录');
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');

    if (!keyword || keyword.length < 4) {
      return successResponse([]);
    }

    // 搜索物料编码或物料名称包含关键字的物料
    const materials = await prisma.material.findMany({
      where: {
        isDelete: false,
        OR: [
          { internalCode: { contains: keyword } },
          { materialName: { contains: keyword } },
        ],
      },
      select: {
        id: true,
        uuid: true,
        materialName: true,
        internalCode: true,
        drawingCode: true,
        drawingNo: true,
        materialType: true,
        unit: true,
        spec: true,
        remark: true,
        groupId: true,
        customerId: true,
      },
      take: 50, // 限制返回50条
      orderBy: {
        internalCode: 'asc',
      },
    });

    return successResponse(materials);
  } catch (error) {
    console.error('搜索物料失败:', error);
    return serverErrorResponse('搜索物料失败');
  }
}
