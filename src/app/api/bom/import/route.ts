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
        weight: row.weight ? parseFloat(row.weight) : null,
        unit: row.unit,
        spec: row.spec,
        unitUsage: row.unitUsage || row.quantity || 1,
        materialRemark: row.materialRemark || row.remark,
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
    const { data, groupId } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return badRequestResponse('导入数据不能为空');
    }

    const createdMaterials: any[] = [];
    const createdBomRelations: any[] = [];
    const sequenceToMaterialId: Record<string, number> = {};

    // 按层级编码排序，确保父级物料先被创建
    // 排序规则：1, 1.1, 1.2, 1.2.1, 2, 2.1 等
    const sortedData = [...data].sort((a, b) => {
      const aCode = a.levelCode || '';
      const bCode = b.levelCode || '';
      if (!aCode && !bCode) return 0;
      if (!aCode) return 1;
      if (!bCode) return -1;
      
      const aParts = aCode.split('.').map(Number);
      const bParts = bCode.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });

    for (let i = 0; i < sortedData.length; i++) {
      const row = sortedData[i];
      let materialId: number;

      // 为没有内部编码的物料生成编码
      let internalCode = row.internalCode;
      if (!internalCode) {
        internalCode = await generateInternalCode(row.materialType || 'part');
      }

      if (row.existingMaterial) {
        // 已存在物料，更新物料信息
        const targetGroupId = groupId || row.groupId;
        let customerId: number | null = null;
        if (targetGroupId) {
          const firstCustomer = await prisma.customer.findFirst({
            where: { groupId: targetGroupId, isDelete: false },
            select: { id: true },
          });
          customerId = firstCustomer?.id || null;
        }
        
        await prisma.material.update({
          where: { id: row.existingMaterial.id },
          data: {
            materialName: row.materialName,
            drawingCode: row.drawingCode || null,
            drawingNo: row.drawingNo || null,
            materialType: row.materialType || 'part',
            weight: row.weight ? parseFloat(row.weight) : null,
            unit: row.unit || null,
            spec: row.spec || null,
            customerId: customerId,
            groupId: targetGroupId || null,
            remark: row.remark || row.materialRemark || null,
            modifiedBy: user?.id || null,
          },
        });
        materialId = row.existingMaterial.id;
      } else {
        // 如果提供了groupId，查询该群组下的第一个客户
        let customerId: number | null = null;
        const targetGroupId = groupId || row.groupId;
        if (targetGroupId) {
          const firstCustomer = await prisma.customer.findFirst({
            where: { groupId: targetGroupId, isDelete: false },
            select: { id: true },
          });
          customerId = firstCustomer?.id || null;
        }
        
        // 创建新物料
        const material = await prisma.material.create({
          data: {
            uuid: uuidv4(),
            materialName: row.materialName,
            internalCode: internalCode,
            drawingCode: row.drawingCode || null,
            drawingNo: row.drawingNo || null,
            materialType: row.materialType || 'part',
            weight: row.weight ? parseFloat(row.weight) : null,
            unit: row.unit || null,
            spec: row.spec || null,
            customerId: customerId,
            groupId: targetGroupId || null,
            remark: row.remark || row.materialRemark || null,
            status: 'active',
            createdBy: user?.id || null,
          },
        });
        materialId = material.id;
        createdMaterials.push({ id: material.id, materialName: row.materialName, internalCode: material.internalCode });
      }

      // 记录层级编码对应的物料ID（用于处理层级关系）
      const levelCode = row.levelCode || '';
      if (levelCode) {
        sequenceToMaterialId[levelCode] = materialId;
      }

      // 根据层级编码建立父子关系
      // 层级编码格式：1, 1.1, 1.2, 1.2.1 等
      // 父级编码：去掉最后一级，如 1.2 -> 1, 1.2.1 -> 1.2
      if (levelCode && levelCode.includes('.')) {
        const parts = levelCode.split('.');
        const parentLevelCode = parts.slice(0, -1).join('.');
        const parentId = sequenceToMaterialId[parentLevelCode];
        
        if (parentId) {
          // 检查是否已存在BOM关系
          const exists = await prisma.bomItem.findFirst({
            where: {
              parentMaterialId: parentId,
              childMaterialId: materialId,
              isDelete: false,
            },
          });

          if (!exists) {
            // 计算 levelIndex：取层级编码的最后一部分
            const levelParts = levelCode.split('.');
            const levelIndex = levelParts[levelParts.length - 1] || '1';
            
            const bomItem = await prisma.bomItem.create({
              data: {
                parentMaterialId: parentId,
                childMaterialId: materialId,
                rootMaterialId: parentId,
                quantity: row.quantity || row.unitUsage || 1,
                bomRemark: row.bomRemark || null,
                createdBy: user?.id || null,
                levelIndex: levelIndex,
              },
            });
            createdBomRelations.push({
              parentId,
              childId: materialId,
              quantity: row.quantity || row.unitUsage || 1,
            });
          }
        }
      }
    }

    return successResponse({
      createdMaterials: createdMaterials.length,
      createdBomRelations: createdBomRelations.length,
      materials: createdMaterials,
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

// 物料类型前缀映射（与BOM管理页面新增顶层物料一致）
const MATERIAL_TYPE_PREFIX: Record<string, string> = {
  part: 'LJ',        // 零件
  component: 'ZJ',    // 组件
  material: 'CL',     // 原材料
  purchased: 'WG',    // 外购件
  standard: 'BZ',     // 标准件
  auxiliary: 'FC',    // 辅材
};

// 生成内部编码（与BOM管理页面新增顶层物料一致）
async function generateInternalCode(materialType: string): Promise<string> {
  const prefix = MATERIAL_TYPE_PREFIX[materialType] || 'XX';

  // 获取该类型物料的最大编码序号（与新增顶层物料逻辑一致）
  const result = await prisma.$queryRawUnsafe<[{max_code: string | null}][]>(
    `SELECT MAX(internal_code) as max_code FROM material WHERE material_type = ? AND internal_code LIKE ?`,
    materialType,
    prefix + '%'
  );
  const maxCode = result[0]?.max_code;
  let nextNum = 1;
  if (maxCode) {
    const numStr = maxCode.replace(prefix, '');
    nextNum = parseInt(numStr) + 1;
  }

  return `${prefix}${String(nextNum).padStart(8, '0')}`;
}
