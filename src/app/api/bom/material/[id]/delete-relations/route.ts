import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, serverErrorResponse, notFoundResponse } from '@/lib/response';

/** DELETE /api/bom/material/[id]/delete-relations - 删除物料的所有父子关系（不删除物料） */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult.user;

    const { id } = await params;
    const materialId = parseInt(id);

    // 检查物料是否存在
    const material = await prisma.material.findFirst({
      where: { id: materialId, isDelete: false },
    });
    if (!material) {
      return notFoundResponse('物料不存在');
    }

    await prisma.$transaction(async (tx) => {
      // 1. 软删除所有作为父物料的BOM关系（此物料的子件关系）
      await tx.bomItem.updateMany({
        where: { parentMaterialId: materialId, isDelete: false },
        data: {
          isDelete: true,
          modifiedBy: user.id,
        },
      });

      // 2. 软删除所有作为子物料的BOM关系（此物料的父件关系）
      await tx.bomItem.updateMany({
        where: { childMaterialId: materialId, isDelete: false },
        data: {
          isDelete: true,
          modifiedBy: user.id,
        },
      });
    });

    return successResponse(null, '物料父子关系删除成功');
  } catch (error: any) {
    console.error('删除物料父子关系失败:', error);
    return serverErrorResponse(error.message);
  }
}
