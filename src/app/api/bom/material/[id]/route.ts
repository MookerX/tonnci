import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse, notFoundResponse } from '@/lib/response';
import { z } from 'zod';

// 物料校验模式
const materialSchema = z.object({
  materialName: z.string().min(1, '物料名称不能为空').optional(),
  internalCode: z.string().optional(),
  drawingCode: z.string().optional(),
  drawingNo: z.string().optional(),
  materialType: z.enum(['part', 'component', 'material', 'purchased', 'standard', 'auxiliary']).optional(),
  unit: z.string().optional(),
  spec: z.string().optional(),
  weight: z.number().optional(),
  customerId: z.number().optional().nullable(),
  remark: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

/** GET /api/bom/material/[id] - 获取物料详情 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const material = await prisma.material.findFirst({
      where: { id: parseInt(id), isDelete: false },
      include: {
        customer: {
          select: { id: true, customerName: true }
        },
        drawings: {
          where: { isDelete: false, isLatest: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!material) {
      return notFoundResponse('物料不存在');
    }

    return successResponse(material);
  } catch (error: any) {
    console.error('获取物料详情失败:', error);
    return serverErrorResponse(error.message || '获取物料详情失败');
  }
}

/** PUT /api/bom/material/[id] - 更新物料 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const { id } = await params;
    const body = await request.json();
    const validation = materialSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse(validation.error.message);
    }

    const data = validation.data;

    // 检查物料是否存在
    const exists = await prisma.material.findFirst({
      where: { id: parseInt(id), isDelete: false },
    });
    if (!exists) {
      return notFoundResponse('物料不存在');
    }

    // 检查内部编码是否被其他物料使用
    if (data.internalCode && data.internalCode !== exists.internalCode) {
      const codeExists = await prisma.material.findFirst({
        where: { internalCode: data.internalCode, isDelete: false, id: { not: parseInt(id) } },
      });
      if (codeExists) {
        return badRequestResponse('内部编码已被其他物料使用');
      }
    }

    // 更新物料基本信息
    const updateData: any = {
      modifiedBy: user.id,
      ...data,
    };

    // 如果传入了 bomItemId，更新 BOM 关系（quantity 和 bomRemark）
    if (body.bomItemId !== undefined) {
      const bomUpdateData: any = {};
      if (body.quantity !== undefined) bomUpdateData.quantity = body.quantity;
      if (body.bomRemark !== undefined) bomUpdateData.bomRemark = body.bomRemark;
      
      if (Object.keys(bomUpdateData).length > 0) {
        await prisma.bomItem.update({
          where: { id: body.bomItemId },
          data: bomUpdateData,
        });
      }
    }

    const material = await prisma.material.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return successResponse(material, '物料更新成功');
  } catch (error: any) {
    console.error('更新物料失败:', error);
    return serverErrorResponse(error.message || '更新物料失败');
  }
}

/** DELETE /api/bom/material/[id] - 删除物料 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const { id } = await params;

    // 检查物料是否存在
    const exists = await prisma.material.findFirst({
      where: { id: parseInt(id), isDelete: false },
    });
    if (!exists) {
      return notFoundResponse('物料不存在');
    }

    // 检查是否被BOM引用
    const bomCount = await prisma.bomItem.count({
      where: {
        isDelete: false,
        OR: [
          { parentMaterialId: parseInt(id) },
          { childMaterialId: parseInt(id) },
        ],
      },
    });

    if (bomCount > 0) {
      return badRequestResponse('该物料已被BOM引用，无法删除');
    }

    // 软删除
    await prisma.material.update({
      where: { id: parseInt(id) },
      data: { isDelete: true, modifiedBy: user.id },
    });

    return successResponse(null, '物料删除成功');
  } catch (error: any) {
    console.error('删除物料失败:', error);
    return serverErrorResponse(error.message || '删除物料失败');
  }
}
