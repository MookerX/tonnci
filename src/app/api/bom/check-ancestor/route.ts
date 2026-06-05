import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * 检查物料是否是目标物料的上级（祖先）
 * GET /api/bom/check-ancestor?materialId=xxx&targetMaterialId=xxx
 * 
 * 用于防止循环引用：在添加子物料时，检查选中的物料是否是父物料的上级
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未授权访问' }, { status: 401 });
    }
    
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ code: 401, message: 'Token无效或已过期' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const targetMaterialId = searchParams.get('targetMaterialId');

    if (!materialId || !targetMaterialId) {
      return NextResponse.json({ code: 400, message: '缺少必要参数' }, { status: 400 });
    }

    // 检查 materialId 是否是 targetMaterialId 的上级（祖先）
    // 通过遍历BOM树向上查找
    const isAncestor = await checkIfAncestor(parseInt(materialId), parseInt(targetMaterialId));

    return NextResponse.json({
      code: 200,
      message: '查询成功',
      data: { isAncestor }
    });
  } catch (error) {
    console.error('检查上级物料失败:', error);
    return NextResponse.json({ 
      code: 500, 
      message: '检查上级物料失败' 
    }, { status: 500 });
  }
}

/**
 * 递归检查 materialId 是否是 targetMaterialId 的上级（祖先）
 * 向上遍历BOM树，查找targetMaterialId的所有父级，看是否包含materialId
 */
async function checkIfAncestor(materialId: number, targetMaterialId: number): Promise<boolean> {
  // 如果两个ID相同，则不是上级关系（是同一个物料）
  if (materialId === targetMaterialId) {
    return false;
  }

  // 查找targetMaterialId的所有直接父级
  const parentBOMs = await prisma.bomItem.findMany({
    where: {
      childMaterialId: targetMaterialId,
      isDelete: false
    },
    select: {
      parentMaterialId: true
    }
  });

  // 如果没有父级，则materialId不可能是其上级
  if (parentBOMs.length === 0) {
    return false;
  }

  // 检查每个父级
  for (const parentBOM of parentBOMs) {
    const parentId = parentBOM.parentMaterialId;
    
    // 如果父级就是materialId，则是上级
    if (parentId === materialId) {
      return true;
    }
    
    // 递归检查父级的上级
    const isParentAncestor = await checkIfAncestor(materialId, parentId);
    if (isParentAncestor) {
      return true;
    }
  }

  return false;
}