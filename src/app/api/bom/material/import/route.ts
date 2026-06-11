import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import * as xlsx from 'xlsx';

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
      // 导入预览时不生成内部编码，保存时由导入确认API自动生成
      const internalCode = row.internalCode || null;

      results.push({
        row: rowNum,
        materialName: row.materialName,
        drawingCode: row.drawingCode,
        internalCode: internalCode, // 空值表示保存时自动生成
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