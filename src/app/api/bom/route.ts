import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { z } from 'zod';

/** GET /api/bom - 获取BOM树形结构 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const rootMaterialId = searchParams.get('rootMaterialId');
    const groupId = searchParams.get('groupId');
    const keyword = searchParams.get('keyword');

    // 构建客户筛选条件（按群组）
    let customerIdFilter: { in: number[] } | null = null;
    if (groupId) {
      const groupCustomers = await prisma.customer.findMany({
        where: { groupId: parseInt(groupId), isDelete: false },
        select: { id: true },
      });
      const customerIds = groupCustomers.map((c: { id: number }) => c.id);
      if (customerIds.length > 0) {
        customerIdFilter = { in: customerIds };
      } else {
        return successResponse([]);
      }
    }

    // 获取所有相关物料
    const materialWhere: any = { isDelete: false };
    if (customerIdFilter) {
      materialWhere.customerId = customerIdFilter;
    }
    if (keyword) {
      materialWhere.OR = [
        { materialName: { contains: keyword } },
        { internalCode: { contains: keyword } },
        { drawingCode: { contains: keyword } },
      ];
    }

    const allMaterials = await prisma.material.findMany({
      where: materialWhere,
      select: {
        id: true,
        materialName: true,
        internalCode: true,
        drawingCode: true,
        drawingNo: true,
        materialType: true,
        unit: true,
        spec: true,
        customerId: true,
        groupId: true,
        remark: true,
      },
    });

    // 获取客户群组名称映射
    const groupIds = [...new Set(allMaterials.filter(m => m.groupId !== null).map(m => m.groupId as number))];
    let groupNameMap = new Map<number, string>();
    if (groupIds.length > 0) {
      // 直接用 Prisma ORM 查询
      const groups = await prisma.customerGroup.findMany({
        where: { id: { in: groupIds }, isDelete: false },
        select: { id: true, groupName: true },
      });
      groupNameMap = new Map(groups.map(g => [g.id, g.groupName]));
    }

    const materialMap = new Map(allMaterials.map(m => {
      const groupName = m.groupId ? groupNameMap.get(m.groupId) || null : null;
      return [m.id, { ...m, customerGroupName: groupName, children: [] as any[] }];
    }));
    const materialIds = allMaterials.map(m => m.id);

    // 获取所有BOM关系（仅针对相关物料）
    const bomItemWhere: any = {
      isDelete: false,
    };
    console.log('[DEBUG] rootMaterialId:', rootMaterialId);
    // 如果指定了rootMaterialId，只获取该BOM树的根物料及其所有层级子物料
    if (rootMaterialId) {
      console.log('[DEBUG] in rootMaterialId block, value:', rootMaterialId);
      const rootId = parseInt(rootMaterialId);
      console.log('[DEBUG] parsed rootId:', rootId);
      // 递归获取所有层级的物料ID
      const getAllDescendantIds = async (parentId: number): Promise<number[]> => {
        const children = await prisma.bomItem.findMany({
          where: { parentMaterialId: parentId, isDelete: false },
          select: { childMaterialId: true },
        });
        console.log(`[DEBUG] getAllDescendantIds(${parentId}) returned:`, children.map(c => c.childMaterialId));
        let allIds: number[] = [];
        for (const child of children) {
          allIds.push(child.childMaterialId);
          const grandChildren = await getAllDescendantIds(child.childMaterialId);
          allIds = allIds.concat(grandChildren);
        }
        return allIds;
      };
      const descendantIds = await getAllDescendantIds(rootId);
      console.log('[DEBUG] descendantIds:', descendantIds);
      const allRelatedIds = [rootId, ...descendantIds];
      console.log('[DEBUG] allRelatedIds:', allRelatedIds);
      bomItemWhere.OR = [
        { parentMaterialId: { in: allRelatedIds } },
        { childMaterialId: { in: allRelatedIds } },
      ];
      // 临时添加调试信息到响应
      (request as any)._debug = { descendantIds, allRelatedIds };
    } else {
      // 不指定rootMaterialId时，只获取相关物料的BOM关系
      if (materialIds.length > 0) {
        bomItemWhere.OR = [
          { parentMaterialId: { in: materialIds } },
          { childMaterialId: { in: materialIds } },
        ];
      }
    }

    const bomItems = await prisma.bomItem.findMany({
      where: bomItemWhere,
      select: {
        id: true,
        parentMaterialId: true,
        childMaterialId: true,
        quantity: true,
      },
    });

    // 构建树：BOM的parentMaterialId指向父物料
    const childrenMap = new Map<number, any[]>();
    for (const item of bomItems) {
      if (item.parentMaterialId !== null) {
        if (!childrenMap.has(item.parentMaterialId)) {
          childrenMap.set(item.parentMaterialId, []);
        }
        childrenMap.get(item.parentMaterialId)!.push({
          childMaterialId: item.childMaterialId,
          bomItemId: item.id,
          quantity: item.quantity,
        });
      }
    }

    // 获取子物料的详细信息
    let childIds = [...new Set(bomItems.map(item => item.childMaterialId))];
    const childMaterials = await prisma.material.findMany({
      where: { id: { in: childIds }, isDelete: false },
      select: {
        id: true,
        materialName: true,
        internalCode: true,
        drawingCode: true,
        drawingNo: true,
        materialType: true,
        unit: true,
        spec: true,
        customerId: true,
        groupId: true,
      },
    });
    const childMap = new Map(childMaterials.map(m => [m.id, {
      ...m,
      customerGroupName: m.groupId ? groupNameMap.get(m.groupId) || null : null,
    }]));

    // 填充树节点
    for (const [parentId, children] of childrenMap) {
      const parent = materialMap.get(parentId);
      if (parent) {
        parent.children = children.map(child => {
          const detail = childMap.get(child.childMaterialId) || {};
          return {
            id: child.childMaterialId,
            bomItemId: child.bomItemId,
            materialName: detail.materialName || '',
            internalCode: detail.internalCode || '',
            drawingCode: detail.drawingCode || '',
            drawingNo: detail.drawingNo || '',
            materialType: detail.materialType || '',
            unit: detail.unit || '',
            spec: detail.spec || '',
            groupId: detail.groupId || null,
            customerGroupName: detail.customerGroupName || null,
            quantity: child.quantity,
            children: [],
          };
        });
      }
    }

    // 填充多层级子物料的children
    const fillChildrenRecursively = (node: any) => {
      const directChildren = childrenMap.get(node.id) || [];
      node.children = directChildren.map((child: any) => {
        const detail = childMap.get(child.childMaterialId) || {};
        const childNode = {
          id: child.childMaterialId,
          bomItemId: child.bomItemId,
          materialName: detail.materialName || '',
          internalCode: detail.internalCode || '',
          drawingCode: detail.drawingCode || '',
          drawingNo: detail.drawingNo || '',
          materialType: detail.materialType || '',
          unit: detail.unit || '',
          spec: detail.spec || '',
          groupId: detail.groupId || null,
          customerGroupName: detail.customerGroupName || null,
          quantity: child.quantity,
          children: [],
        };
        fillChildrenRecursively(childNode);
        return childNode;
      });
    };

    // 如果指定了rootMaterialId，只返回该物料的BOM树
    if (rootMaterialId) {
      const root = materialMap.get(parseInt(rootMaterialId));
      if (root) {
        fillChildrenRecursively(root);
        return successResponse([root]);
      }
      return successResponse([]);
    }

    // 获取所有子物料ID（用于确定真正的顶层物料）
    const childIdSet = new Set(bomItems.map(b => b.childMaterialId));
    // 真正的顶层物料：作为子物料出现的物料不再作为顶层显示
    const topMaterials = allMaterials.filter(m => !childIdSet.has(m.id));

    // 返回顶层物料（包含完整树形结构，递归填充所有层级）
    const bomTree = topMaterials.map(m => {
      const node = materialMap.get(m.id);
      if (node) {
        fillChildrenRecursively(node);
      }
      return node || { ...m, children: [] };
    });
    return successResponse(bomTree);
  } catch (error: any) {
    console.error('获取BOM列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

/** POST /api/bom - 创建BOM关系 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const userId = authResult?.id || 1; // 如果未认证，使用默认值1

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
    const exists = await prisma.bomItem.findFirst({
      where: {
        parentMaterialId,
        childMaterialId,
        isDelete: false,
      },
    });
    if (exists) {
      return badRequestResponse('该BOM关系已存在');
    }

    // 获取根节点物料ID（顶层物料的ID）
    const rootMaterialId = parentMaterialId;

    // 创建BOM关系
    const bomItem = await prisma.bomItem.create({
      data: {
        parentMaterialId,
        childMaterialId,
        rootMaterialId,
        quantity: quantity || 1,
        bomRemark: remark,
        levelIndex: Date.now().toString(36),
        createdBy: userId,
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
    const exists = await prisma.bomItem.findFirst({
      where: { id: parseInt(id), isDelete: false },
    });
    if (!exists) {
      return badRequestResponse('BOM关系不存在');
    }

    // 软删除
    await prisma.bomItem.update({
      where: { id: parseInt(id) },
      data: { isDelete: true, modifiedBy: user.id },
    });

    return successResponse(null, 'BOM关系删除成功');
  } catch (error: any) {
    console.error('删除BOM关系失败:', error);
    return serverErrorResponse(error.message);
  }
}
