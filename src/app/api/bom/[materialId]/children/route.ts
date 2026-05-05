import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, serverErrorResponse, notFoundResponse } from '@/lib/response';

/** GET /api/bom/[materialId]/children - 获取物料的子件列表 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;

    const { materialId } = await params;

    // 检查物料是否存在
    const material = await prisma.material.findFirst({
      where: { id: parseInt(materialId), isDelete: false },
    });
    if (!material) {
      return notFoundResponse('物料不存在');
    }

    // 获取子件
    const bomItems = await prisma.bOMItem.findMany({
      where: {
        parentMaterialId: parseInt(materialId),
        isDelete: false,
      },
      include: {
        childMaterial: {
          include: {
            customer: { select: { id: true, customerName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const children = bomItems.map(item => ({
      id: item.childMaterial.id,
      bomItemId: item.id,
      materialName: item.childMaterial.materialName,
      internalCode: item.childMaterial.internalCode,
      drawingCode: item.childMaterial.drawingCode,
      drawingNo: item.childMaterial.drawingNo,
      materialType: item.childMaterial.materialType,
      quantity: item.quantity,
      unit: item.childMaterial.unit,
      spec: item.childMaterial.spec,
      customer: item.childMaterial.customer,
      hasChildren: item.childMaterial.bomItems?.length > 0 || false,
    }));

    return successResponse(children);
  } catch (error: any) {
    console.error('获取子件列表失败:', error);
    return serverErrorResponse(error.message);
  }
}
