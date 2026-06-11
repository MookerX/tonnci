import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { v4 as uuidv4 } from 'uuid';

// 物料类型映射
const MATERIAL_TYPE_MAP: Record<string, string> = {
  '零件': 'part',
  '组件': 'component',
  '原材料': 'material',
  '外购件': 'purchased',
  '标准件': 'standard',
  '辅材': 'auxiliary',
};

/** POST /api/bom/material/import - 导入物料预览 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const body = await request.json();
    const { data } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return badRequestResponse('导入数据不能为空');
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      // 校验：物料名称、图纸编码、内部编码、图号至少一项不为空
      if (!row.materialName && !row.drawingCode && !row.internalCode && !row.drawingNo) {
        errors.push({
          row: rowNum,
          data: row,
          error: '物料名称、图纸编码、内部编码、图号至少一项不能为空',
        });
        continue;
      }

      // 查询是否已存在
      const where: any = { isDelete: false };
      if (row.drawingCode) where.drawingCode = row.drawingCode;
      if (row.internalCode) where.internalCode = row.internalCode;
      if (row.drawingNo) where.drawingNo = row.drawingNo;

      let material = null;
      if (Object.keys(where).length > 1 || (where.drawingCode || where.internalCode || where.drawingNo)) {
        material = await prisma.material.findFirst({ where });
      }

      const materialType = MATERIAL_TYPE_MAP[row.materialType] || 'part';
      let internalCode = row.internalCode;

      if (!material && !internalCode) {
        internalCode = await generateInternalCode(materialType);
      }

      results.push({
        row: rowNum,
        materialName: row.materialName,
        drawingCode: row.drawingCode,
        internalCode: internalCode,
        drawingNo: row.drawingNo,
        materialType,
        weight: row.weight ? parseFloat(row.weight) : null,
        unit: row.unit,
        spec: row.spec,
        remark: row.remark,
        bomRemark: row.bomRemark,
        quantity: row.quantity ? parseFloat(row.quantity) : 1,
        customerId: row.customerId,
        existingMaterial: material ? {
          id: material.id,
          materialName: material.materialName,
          internalCode: material.internalCode,
        } : null,
        status: material ? 'duplicate' : 'new',
      });
    }

    return successResponse({
      success: results,
      errors,
      summary: {
        total: data.length,
        newCount: results.filter(r => r.status === 'new').length,
        duplicateCount: results.filter(r => r.status === 'duplicate').length,
        errorCount: errors.length,
      },
    });
  } catch (error: any) {
    console.error('物料导入预览失败:', error);
    return serverErrorResponse(error.message);
  }
}

// 生成内部编码
async function generateInternalCode(materialType: string): Promise<string> {
  const prefix = materialType === 'part' ? 'PT' :
                 materialType === 'component' ? 'CP' :
                 materialType === 'material' ? 'MT' :
                 materialType === 'purchased' ? 'PU' :
                 materialType === 'standard' ? 'SD' : 'AX';

  const result = await prisma.$queryRaw<[{cnt: bigint}][]>`
    SELECT COUNT(*) as cnt FROM material WHERE material_type = ${materialType} AND is_delete = 0
  `;
  const count = Number(result[0]?.cnt || 0);

  return `${prefix}${String(count + 1).padStart(8, '0')}`;
}
