import { NextRequest } from 'next/server';
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

    // 递归获取BOM子树（分步查询，因为BomItem没有定义Prisma关联关系）
    async function buildBomTree(parentId: number, level: number = 0): Promise<any[]> {
      if (level > 20) return []; // 防止无限递归

      // 第1步：查询所有子件BOM关系
      const bomItems = await prisma.bomItem.findMany({
        where: {
          parentMaterialId: parentId,
          isDelete: false,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (bomItems.length === 0) return [];

      // 第2步：批量查询所有子物料
      const childIds = bomItems.map(item => item.childMaterialId);
      const children = await prisma.material.findMany({
        where: {
          id: { in: childIds },
          isDelete: false,
        },
      });

      // 建立子物料id到数据的映射
      const childMap = new Map(children.map(c => [c.id, c]));

      // 第3步：逐个构建子树
      const result: any[] = [];
      for (const item of bomItems) {
        const child = childMap.get(item.childMaterialId);
        if (!child) continue;

        const subChildren = await buildBomTree(child.id, level + 1);

        result.push({
          id: child.id,
          bomItemId: item.id,
          materialName: child.materialName,
          internalCode: child.internalCode,
          drawingCode: child.drawingCode,
          drawingNo: child.drawingNo,
          materialType: child.materialType,
          quantity: Number(item.quantity),
          unit: child.unit,
          spec: child.spec,
          bomRemark: item.bomRemark,
          levelCode: item.levelCode,
          remark: child.remark,
          hasChildren: subChildren.length > 0,
          children: subChildren,
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
