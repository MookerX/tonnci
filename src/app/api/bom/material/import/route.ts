import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import * as xlsx from 'xlsx';

// 物料类型映射（支持中文和英文）
const MATERIAL_TYPE_MAP: Record<string, string> = {
  '零件': 'part',
  '组件': 'component',
  '原材料': 'material',
  '外购件': 'purchased',
  '标准件': 'standard',
  '辅材': 'auxiliary',
  // 英文值直接映射
  'part': 'part',
  'component': 'component',
  'material': 'material',
  'purchased': 'purchased',
  'standard': 'standard',
  'auxiliary': 'auxiliary',
};

/** POST /api/bom/material/import - 导入物料预览 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    // 处理FormData文件上传
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const groupId = formData.get('groupId') as string;

    if (!file) {
      return badRequestResponse('请上传文件');
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 解析Excel/CSV文件
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!jsonData || jsonData.length === 0) {
      return badRequestResponse('文件内容为空');
    }

    // 列名映射（中文 -> 英文字段名）
    const columnMap: Record<string, string> = {
      '层级编码': 'levelCode',
      '物料名称': 'materialName',
      '图纸编码': 'drawingCode',
      '内部编码': 'internalCode',
      '图号': 'drawingNo',
      '单层用量': 'quantity',
      '物料类型': 'materialType',
      '重量': 'weight',
      '单位': 'unit',
      '规格': 'spec',
      '物料备注': 'remark',
      'BOM备注': 'bomRemark',
    };

    // 转换列名并处理数据
    const data = jsonData.map((row: any) => {
      const newRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        const mappedKey = columnMap[key] || key;
        newRow[mappedKey] = value;
      }
      // 处理物料类型（中文转英文）
      if (newRow.materialType && MATERIAL_TYPE_MAP[newRow.materialType]) {
        newRow.materialType = MATERIAL_TYPE_MAP[newRow.materialType];
      }
      // 处理数字字段
      if (newRow.quantity) {
        newRow.quantity = parseFloat(newRow.quantity) || 1;
      }
      if (newRow.weight) {
        newRow.weight = parseFloat(newRow.weight) || null;
      }
      // 解析层级编码，计算层级深度
      if (newRow.levelCode) {
        const levelStr = String(newRow.levelCode);
        // 层级编码格式：1, 1.1, 1.2.1 等
        const levelDepth = levelStr.split('.').length;
        newRow.level = levelDepth;
        newRow.levelCode = levelStr;
      } else {
        newRow.level = 1; // 默认为顶层
        newRow.levelCode = '';
      }
      return newRow;
    });

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

      // 查询是否已存在（数值类型转字符串）
      // 使用OR关系：只要有一个字段匹配就认为是已存在
      let material = null;
      const orConditions: any[] = [];
      if (row.drawingCode) orConditions.push({ drawingCode: String(row.drawingCode), isDelete: false });
      if (row.internalCode) orConditions.push({ internalCode: String(row.internalCode), isDelete: false });
      if (row.drawingNo) orConditions.push({ drawingNo: String(row.drawingNo), isDelete: false });

      if (orConditions.length > 0) {
        material = await prisma.material.findFirst({
          where: { OR: orConditions },
        });
      }

      const materialType = MATERIAL_TYPE_MAP[row.materialType] || 'part';
      // 导入预览时不生成内部编码，保存时由导入确认API自动生成
      const internalCode = row.internalCode || null;

      results.push({
        row: rowNum,
        materialName: String(row.materialName || ''),
        drawingCode: row.drawingCode ? String(row.drawingCode) : null,
        internalCode: internalCode ? String(internalCode) : null, // 空值表示保存时自动生成
        drawingNo: row.drawingNo ? String(row.drawingNo) : null,
        materialType,
        weight: row.weight ? parseFloat(row.weight) : null,
        unit: row.unit ? String(row.unit) : null,
        spec: row.spec ? String(row.spec) : null,
        remark: row.remark ? String(row.remark) : null,
        bomRemark: row.bomRemark ? String(row.bomRemark) : null,
        quantity: row.quantity ? parseFloat(row.quantity) : 1,
        customerId: row.customerId,
        level: row.level || 1,
        levelCode: row.levelCode || '',
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