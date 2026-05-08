import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { z } from 'zod';

/** GET /api/bom - 获取BOM列表（树形结构） */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const rootMaterialId = searchParams.get('rootMaterialId');
    const customerId = searchParams.get('customerId');
    const groupId = searchParams.get('groupId');
    const keyword = searchParams.get('keyword');

    // 获取顶层物料（BOM根节点）
    const where: any = {
      isDelete: false,
      parentMaterials: { some: { isDelete: false } },
    };

    if (groupId) {
      // 按客户群组查询：群组内所有客户共用技术资料
      const groupCustomers = await prisma.customer.findMany({
        where: { groupId: parseInt(groupId), isDelete: false },
        select: { id: true },
      });
      const customerIds = groupCustomers.map((c: { id: number }) => c.id);
      where.customerId = { in: customerIds };
    } else if (customerId) {
      where.customerId = parseInt(customerId);
    }

    if (keyword) {
      where.OR = [
        { materialName: { contains: keyword } },
        { internalCode: { contains: keyword } },
        { drawingCode: { contains: keyword } },
      ];
    }

    // 获取顶层物料（没有被任何物料作为子件引用的物料）
    const topMaterials = await prisma.material.findMany({
      where,
      include: {
        customer: {
          select: { id: true, customerName: true }
        },
        bomItems: {
          where: { isDelete: false },
          include: {
            childMaterial: {
              include: {
                customer: { select: { id: true, customerName: true } },
              },
            },
          },
        },
      },
      orderBy: { materialName: 'asc' },
    });

    // 如果指定了根节点物料，只返回该物料的BOM树
    if (rootMaterialId) {
      const root = await prisma.material.findFirst({
        where: { id: parseInt(rootMaterialId), isDelete: false },
        include: {
          customer: { select: { id: true, customerName: true } },
          bomItems: {
            where: { isDelete: false },
            include: {
              childMaterial: {
                include: {
                  customer: { select: { id: true, customerName: true } },
                },
              },
            },
          },
        },
      });
      return successResponse(root ? [buildBomTree(root)] : []);
    }

    // 构建BOM树形结构
    const bomTree = topMaterials.map(m => buildBomTree(m));

    return successResponse(bomTree);
  } catch (error: any) {
    console.error('获取BOM列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

/** POST /api/bom - 创建BOM关系或顶层物料 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const body = await request.json();
    const { parentMaterialId, childMaterialId, quantity, remark } = body;

    if (!parentMaterialId || !childMaterialId) {
      return badRequestResponse('父物料和子物料不能为空');
    }

    if (parentMaterialId === childMaterialId) {
      return badRequestResponse('不能将物料作为自身的子件');
    }

    // 检查父物料是否存在
    const parent = await prisma.material.findFirst({
      where: { id: parentMaterialId, isDelete: false },
    });
    if (!parent) {
      return badRequestResponse('父物料不存在');
    }

    // 检查子物料是否存在
    const child = await prisma.material.findFirst({
      where: { id: childMaterialId, isDelete: false },
    });
    if (!child) {
      return badRequestResponse('子物料不存在');
    }

    // 检查是否已存在该BOM关系
    const exists = await prisma.bOMItem.findFirst({
      where: {
        parentMaterialId,
        childMaterialId,
        isDelete: false,
      },
    });
    if (exists) {
      return badRequestResponse('该BOM关系已存在');
    }

    // 创建BOM关系
    const bomItem = await prisma.bOMItem.create({
      data: {
        parentMaterialId,
        childMaterialId,
        quantity: quantity || 1,
        remark,
        createdBy: user.id,
      },
      include: {
        parentMaterial: { select: { id: true, materialName: true } },
        childMaterial: { select: { id: true, materialName: true } },
      },
    });

    return successResponse(bomItem, 'BOM关系创建成功');
  } catch (error: any) {
    console.error('创建BOM关系失败:', error);
    return serverErrorResponse(error.message);
  }
}

/** DELETE /api/bom - 删除BOM关系 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return badRequestResponse('请指定要删除的BOM关系ID');
    }

    // 检查BOM关系是否存在
    const exists = await prisma.bOMItem.findFirst({
      where: { id: parseInt(id), isDelete: false },
    });
    if (!exists) {
      return badRequestResponse('BOM关系不存在');
    }

    // 软删除
    await prisma.bOMItem.update({
      where: { id: parseInt(id) },
      data: { isDelete: true, modifiedBy: user.id },
    });

    return successResponse(null, 'BOM关系删除成功');
  } catch (error: any) {
    console.error('删除BOM关系失败:', error);
    return serverErrorResponse(error.message);
  }
}

// 构建BOM树形结构
function buildBomTree(material: any): any {
  const children = material.bomItems
    ?.filter((item: any) => item.isDelete === false)
    .map((item: any) => ({
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
      children: [], // 延迟加载
    })) || [];

  return {
    id: material.id,
    materialName: material.materialName,
    internalCode: material.internalCode,
    drawingCode: material.drawingCode,
    drawingNo: material.drawingNo,
    materialType: material.materialType,
    unit: material.unit,
    spec: material.spec,
    customer: material.customer,
    children,
  };
}
