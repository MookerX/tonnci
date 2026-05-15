import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';

/**
 * 检查物料编码唯一性
 * GET /api/bom/material/check-unique?drawingCode=xxx&internalCode=xxx&groupId=xxx&excludeId=xxx
 * 
 * 唯一性规则：
 * - 内部编码：全局唯一（不受客户限制）
 * - 图纸编码：在客户群组内唯一（同一客户群组内不能有相同图纸编码）
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return errorResponse(401, '请先登录');
    }

    const { searchParams } = new URL(request.url);
    const drawingCode = searchParams.get('drawingCode');
    const internalCode = searchParams.get('internalCode');
    const groupId = searchParams.get('groupId'); // 客户群组ID
    const excludeId = searchParams.get('excludeId'); // 编辑时排除当前物料

    const result: {
      drawingCodeExists?: boolean;
      drawingCodeMessage?: string;
      internalCodeExists?: boolean;
      internalCodeMessage?: string;
    } = {};

    // 检查内部编码唯一性（全局）
    if (internalCode) {
      const internalCodeWhere: any = {
        isDelete: false,
        internalCode: internalCode,
      };
      if (excludeId) {
        internalCodeWhere.id = { not: parseInt(excludeId) };
      }

      const existingByInternalCode = await prisma.material.findFirst({
        where: internalCodeWhere,
        select: { id: true, materialName: true, internalCode: true },
      });

      if (existingByInternalCode) {
        result.internalCodeExists = true;
        result.internalCodeMessage = `内部编码 "${internalCode}" 已被物料 "${existingByInternalCode.materialName}" 使用`;
      } else {
        result.internalCodeExists = false;
      }
    }

    // 检查图纸编码唯一性（在选定客户群组范围内）
    if (drawingCode) {
      const drawingCodeWhere: any = {
        isDelete: false,
        drawingCode: drawingCode,
      };
      
      // 如果有选定客户群组，则在客户群组范围内检查
      if (groupId) {
        drawingCodeWhere.groupId = parseInt(groupId);
      }
      
      if (excludeId) {
        drawingCodeWhere.id = { not: parseInt(excludeId) };
      }

      const existingByDrawingCode = await prisma.material.findFirst({
        where: drawingCodeWhere,
        select: { 
          id: true, 
          materialName: true, 
          drawingCode: true,
          groupId: true
        },
      });

      if (existingByDrawingCode) {
        // 查询客户群组名称
        let groupName = '未知客户群组';
        if (existingByDrawingCode.groupId) {
          const group = await prisma.customerGroup.findUnique({
            where: { id: existingByDrawingCode.groupId, isDelete: false },
            select: { groupName: true }
          });
          if (group) {
            groupName = group.groupName;
          }
        }
        
        result.drawingCodeExists = true;
        result.drawingCodeMessage = `图纸编码 "${drawingCode}" 在客户群组 "${groupName}" 下已被物料 "${existingByDrawingCode.materialName}" 使用`;
      } else {
        result.drawingCodeExists = false;
      }
    }

    return successResponse(result);
  } catch (err) {
    console.error('检查编码唯一性失败:', err);
    return errorResponse(500, '检查失败');
  }
}
