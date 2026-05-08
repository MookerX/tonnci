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

/** POST /api/bom/import - 导入BOM（预览） */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const body = await request.json();
    const { customerId, data, mode } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return badRequestResponse('导入数据不能为空');
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel行号从2开始（1是表头）

      // 校验：物料名称、图纸编码、内部编码、图号至少一项不为空
      if (!row.materialName && !row.drawingCode && !row.internalCode && !row.drawingNo) {
        errors.push({
          row: rowNum,
          data: row,
          error: '物料名称、图纸编码、内部编码、图号至少一项不能为空',
        });
        continue;
      }

      // 解析序号，确定层级关系
      const levelInfo = parseLevel(row.sequence);
      if (!levelInfo.valid) {
        errors.push({
          row: rowNum,
          data: row,
          error: `序号格式不正确，应为1、1.1、1-1等格式`,
        });
        continue;
      }

      // 查询是否已存在该物料
      const materialWhere: any = {};
      if (row.drawingCode) materialWhere.drawingCode = row.drawingCode;
      if (row.internalCode) materialWhere.internalCode = row.internalCode;
      if (row.drawingNo) materialWhere.drawingNo = row.drawingNo;

      let material = null;
      if (Object.keys(materialWhere).length > 0) {
        material = await prisma.material.findFirst({
          where: { ...materialWhere, isDelete: false },
        });
      }

      // 确定物料类型
      const materialType = MATERIAL_TYPE_MAP[row.materialType] || 'part';

      // 生成内部编码（如果需要新创建且没有指定）
      let internalCode = row.internalCode;
      if (!material && !internalCode) {
        internalCode = await generateInternalCode(materialType);
      }

      // 构建结果
      results.push({
        row: rowNum,
        sequence: row.sequence,
        level: levelInfo.level,
        parentSequence: levelInfo.parentSequence,
        materialName: row.materialName,
        drawingCode: row.drawingCode,
        internalCode: internalCode,
        drawingNo: row.drawingNo,
        materialType,
        unitUsage: row.unitUsage,
        materialRemark: row.materialRemark,
        bomRemark: row.bomRemark,
        customerId: customerId,
        existingMaterial: material ? {
          id: material.id,
          materialName: material.materialName,
          internalCode: material.internalCode,
        } : null,
        status: material ? 'linked' : 'new',
      });
    }

    return successResponse({
      success: results,
      errors,
      summary: {
        total: data.length,
        newCount: results.filter(r => r.status === 'new').length,
        linkedCount: results.filter(r => r.status === 'linked').length,
        errorCount: errors.length,
      },
    });
  } catch (error: any) {
    console.error('BOM导入预览失败:', error);
    return serverErrorResponse(error.message);
  }
}

/** PUT /api/bom/import - 确认导入 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const body = await request.json();
    const { data } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return badRequestResponse('导入数据不能为空');
    }

    const createdMaterials: any[] = [];
    const createdBomRelations: any[] = [];
    const sequenceToMaterialId: Record<string, number> = {};

    // 按层级排序（先处理父级，再处理子级）
    const sortedData = [...data].sort((a, b) => a.level - b.level);

    for (const row of sortedData) {
      let materialId: number;

      if (row.existingMaterial) {
        // 已存在物料，直接使用
        materialId = row.existingMaterial.id;
      } else {
        // 创建新物料
        const material = await prisma.material.create({
          data: {
            uuid: uuidv4(),
            materialName: row.materialName,
            internalCode: row.internalCode,
            drawingCode: row.drawingCode,
            drawingNo: row.drawingNo,
            materialType: row.materialType,
            unit: row.unit,
            customerId: row.customerId,
            remark: row.materialRemark,
            status: 'active',
            createdBy: user.id,
          },
        });
        materialId = material.id;
        createdMaterials.push({ id: material.id, materialName: row.materialName });
      }

      sequenceToMaterialId[row.sequence] = materialId;

      // 如果有父级，创建BOM关系
      if (row.parentSequence && sequenceToMaterialId[row.parentSequence]) {
        const parentId = sequenceToMaterialId[row.parentSequence];
        
        // 检查是否已存在BOM关系
        const exists = await prisma.bOMItem.findFirst({
          where: {
            parentMaterialId: parentId,
            childMaterialId: materialId,
            isDelete: false,
          },
        });

        if (!exists) {
          const bomItem = await prisma.bOMItem.create({
            data: {
              parentMaterialId: parentId,
              childMaterialId: materialId,
              quantity: row.unitUsage || 1,
              remark: row.bomRemark,
              createdBy: user.id,
            },
          });
          createdBomRelations.push({
            parentId,
            childId: materialId,
            quantity: row.unitUsage,
          });
        }
      }
    }

    return successResponse({
      createdMaterials: createdMaterials.length,
      createdBomRelations: createdBomRelations.length,
    }, `导入成功：创建${createdMaterials.length}个物料，${createdBomRelations.length}个BOM关系`);
  } catch (error: any) {
    console.error('BOM导入确认失败:', error);
    return serverErrorResponse(error.message);
  }
}

// 解析层级序号
function parseLevel(sequence: string): { valid: boolean; level: number; parentSequence: string | null } {
  if (!sequence) {
    return { valid: false, level: 0, parentSequence: null };
  }

  // 部件层级：1、1.1、1.2
  if (/^\d+(\.\d+)*$/.test(sequence)) {
    const parts = sequence.split('.');
    const level = parts.length;
    const parentSequence = level > 1 ? parts.slice(0, -1).join('.') : null;
    return { valid: true, level, parentSequence };
  }

  // 零件层级：1-1、1.1-1
  if (/^\d+(\.\d+)?-\d+$/.test(sequence)) {
    const dashIndex = sequence.lastIndexOf('-');
    const parts = sequence.substring(0, dashIndex).split('.');
    const level = parts.length + 1;
    const parentSequence = parts.length > 0 ? parts.join('.') : null;
    return { valid: true, level, parentSequence };
  }

  return { valid: false, level: 0, parentSequence: null };
}

// 生成内部编码
async function generateInternalCode(materialType: string): Promise<string> {
  const prefix = materialType === 'part' ? 'PT' :
                 materialType === 'component' ? 'CP' :
                 materialType === 'material' ? 'MT' :
                 materialType === 'purchased' ? 'PU' :
                 materialType === 'standard' ? 'SD' : 'AX';

  const result = await prisma.$queryRawUnsafe<[{cnt: bigint}][]>(
    `SELECT COUNT(*) as cnt FROM material WHERE material_type = ? AND is_delete = 0`,
    materialType
  );
  const count = Number(result[0]?.cnt || 0);

  return `${prefix}${String(count + 1).padStart(8, '0')}`;
}
