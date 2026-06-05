import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, serverErrorResponse, notFoundResponse } from '@/lib/response';

/** GET /api/bom/[materialId]/bom-tree - 获取物料的完整BOM子树 */
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

    // 递归获取BOM子树
    async function buildBomTree(parentId: number, level: number = 0): Promise<any[]> {
      if (level > 20) return []; // 防止无限递归

      const bomItems = await prisma.bomItem.findMany({
        where: {
          parentMaterialId: parentId,
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

      const result: any[] = [];
      for (const item of bomItems) {
        const child = item.childMaterial;
        if (!child || child.isDelete) continue;

        const children = await buildBomTree(child.id, level + 1);

        result.push({
          id: child.id,
          bomItemId: item.id,
          materialName: child.materialName,
          internalCode: child.internalCode,
          drawingCode: child.drawingCode,
          drawingNo: child.drawingNo,
          materialType: child.materialType,
          quantity: item.quantity,
          unit: child.unit,
          spec: child.spec,
          bomRemark: item.remark,
          levelCode: item.levelCode,
          customerGroupName: child.customer?.customerName || '-',
          hasChildren: children.length > 0,
          children: children,
        });
      }
      return result;
    }

    const bomTree = await buildBomTree(parseInt(materialId));

    return successResponse({
      materialId: material.id,
      materialName: material.materialName,
      internalCode: material.internalCode,
      bomTree,
    });
  } catch (error: any) {
    console.error('获取BOM树失败:', error);
    return serverErrorResponse(error.message);
  }
}
