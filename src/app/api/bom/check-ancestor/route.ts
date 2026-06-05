import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * 检测物料是否是父物料的直系上级（防止循环引用）
 * GET /api/bom/check-ancestor?parentMaterialId=xxx&childMaterialId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ code: 401, message: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentMaterialId = searchParams.get('parentMaterialId');
    const childMaterialId = searchParams.get('childMaterialId');

    if (!parentMaterialId || !childMaterialId) {
      return NextResponse.json({ code: 400, message: '缺少必要参数' }, { status: 400 });
    }

    const parentId = parseInt(parentMaterialId);
    const childId = parseInt(childMaterialId);

    // 如果是同一个物料，返回是祖先（自身不能作为子件）
    if (parentId === childId) {
      return NextResponse.json({
        code: 200,
        data: { isAncestor: true, reason: '物料不能作为自身的子件' }
      });
    }

    // 使用广度优先搜索(BFS)向上遍历BOM链，找出parentMaterialId的所有上级物料
    const visitedIds = new Set<number>([parentId]);
    const queue: number[] = [parentId];
    let maxDepth = 50; // 防止无限循环（超过50层不太现实）

    while (queue.length > 0 && visitedIds.size < maxDepth) {
      const currentId = queue.shift()!;
      
      // 查找当前物料作为子件的BOM记录（即找出它的所有父物料）
      const bomRecords = await prisma.bomItem.findMany({
        where: {
          childMaterialId: currentId,
          isDelete: false,
        },
        select: {
          parentMaterialId: true,
        },
      });

      for (const bom of bomRecords) {
        const ancestorId = bom.parentMaterialId;
        if (ancestorId && !visitedIds.has(ancestorId)) {
          // 检查是否是我们要检测的childMaterialId
          if (ancestorId === childId) {
            return NextResponse.json({
              code: 200,
              data: { isAncestor: true, reason: '所选物料是父物料的直系上级，将形成循环引用' }
            });
          }
          
          visitedIds.add(ancestorId);
          queue.push(ancestorId);
        }
      }
    }

    // 没有找到循环引用
    return NextResponse.json({
      code: 200,
      data: { isAncestor: false }
    });

  } catch (error) {
    console.error('检测BOM上级失败:', error);
    return NextResponse.json({ 
      code: 500, 
      message: '检测失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}