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
  weight: z.number().nullable().optional(),
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

    // 判断物料数据是否真正改变（与原始数据比较）
    const materialFields = ['materialName', 'internalCode', 'drawingCode', 'drawingNo', 'materialType', 'unit', 'spec', 'weight', 'groupId', 'remark'] as const;
    const materialChanges: Record<string, any> = {};
    
    for (const key of materialFields) {
      if (data[key] !== undefined) {
        const oldValue = exists[key];
        const newValue = data[key];
        // 比较值是否改变（注意 null 和空字符串的处理）
        const oldNormalized = oldValue ?? '';
        const newNormalized = newValue ?? '';
        if (oldNormalized !== newNormalized) {
          materialChanges[key] = newValue;
        }
      }
    }
    
    const hasMaterialChanges = Object.keys(materialChanges).length > 0;

    // 如果传入了 bomItemId，检查 BOM 数据是否真正改变
    if (body.bomItemId !== undefined) {
      // 获取原始 BOM 数据
      const existingBom = await prisma.bomItem.findUnique({
        where: { id: body.bomItemId },
      });
      
      if (existingBom) {
        const bomChanges: Record<string, any> = {};
        
        // 比较 quantity
        if (body.quantity !== undefined) {
          const oldQty = existingBom.quantity?.toString() || '';
          const newQty = body.quantity?.toString() || '';
          if (oldQty !== newQty) {
            bomChanges.quantity = body.quantity;
          }
        }
        
        // 比较 bomRemark
        if (body.bomRemark !== undefined) {
          const oldRemark = existingBom.bomRemark || '';
          const newRemark = body.bomRemark || '';
          if (oldRemark !== newRemark) {
            bomChanges.bomRemark = body.bomRemark;
          }
        }
        
        // 只有 BOM 数据真正改变时才更新
        if (Object.keys(bomChanges).length > 0) {
          bomChanges.modifiedBy = user.id;
          await prisma.bomItem.update({
            where: { id: body.bomItemId },
            data: bomChanges,
          });
        }
      }
    }

    // 只有物料数据真正改变时才更新物料表和修改者
    let material = exists;
    if (hasMaterialChanges) {
      material = await prisma.material.update({
        where: { id: parseInt(id) },
        data: {
          ...materialChanges,
          modifiedBy: user.id,
        },
      });
    }

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
