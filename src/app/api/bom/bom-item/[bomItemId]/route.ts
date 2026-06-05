import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, serverErrorResponse, notFoundResponse } from '@/lib/response';

/** DELETE /api/bom/bom-item/[bomItemId] - 删除BOM关系（软删除） */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bomItemId: string }> }
) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult.user;

    const { bomItemId } = await params;

    // 检查BOM关系是否存在
    const bomItem = await prisma.bomItem.findFirst({
      where: { id: parseInt(bomItemId), isDelete: false },
    });
    if (!bomItem) {
      return notFoundResponse('BOM关系不存在');
    }

    // 软删除BOM关系
    await prisma.bomItem.update({
      where: { id: parseInt(bomItemId) },
      data: {
        isDelete: true,
        modifiedBy: user.id,
      },
    });

    return successResponse(null, 'BOM关系删除成功');
  } catch (error: any) {
    console.error('删除BOM关系失败:', error);
    return serverErrorResponse(error.message);
  }
}
