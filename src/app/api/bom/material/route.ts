import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// 物料类型映射
const MATERIAL_TYPE_PREFIX: Record<string, string> = {
  part: 'PT',        // 零件
  component: 'CP',   // 组件
  material: 'MT',    // 原材料
  purchased: 'PU',   // 外购件
  standard: 'SD',    // 标准件
  auxiliary: 'AX',  // 辅材
};

// 物料校验模式
const materialSchema = z.object({
  materialName: z.string().min(1, '物料名称不能为空'),
  internalCode: z.string().optional(),
  drawingCode: z.string().optional(),
  drawingNo: z.string().optional(),
  materialType: z.enum(['part', 'component', 'material', 'purchased', 'standard', 'auxiliary']).default('part'),
  unit: z.string().optional(),
  spec: z.string().optional(),
  weight: z.number().optional(),
  customerId: z.number().optional(),
  remark: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

// 生成内部编码
async function generateInternalCode(materialType: string): Promise<string> {
  const prefix = MATERIAL_TYPE_PREFIX[materialType] || 'XX';
  
  // 获取该类型物料的最大编码序号（不过滤软删除，避免重复）
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

/** GET /api/bom/material - 获取物料列表 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const materialType = searchParams.get('type');
    const customerId = searchParams.get('customerId');
    const groupId = searchParams.get('groupId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const where: any = { isDelete: false };
    
    if (keyword) {
      where.OR = [
        { materialName: { contains: keyword } },
        { internalCode: { contains: keyword } },
        { drawingCode: { contains: keyword } },
        { drawingNo: { contains: keyword } },
      ];
    }
    
    if (materialType) {
      where.materialType = materialType;
    }
    
    if (groupId) {
      // 按客户群组查询
      const groupCustomers = await prisma.customer.findMany({
        where: { groupId: parseInt(groupId), isDelete: false },
        select: { id: true },
      });
      const customerIds = groupCustomers.map((c: { id: number }) => c.id);
      where.customerId = { in: customerIds };
    } else if (customerId) {
      where.customerId = parseInt(customerId);
    }
    
    if (status) {
      where.status = status;
    }

    const [total, list] = await Promise.all([
      prisma.material.count({ where }),
      prisma.material.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // LEFT JOIN: 客户群组名
    const groupNameMap: Record<number, string> = {};
    if (list.length > 0) {
      const groupIds = [...new Set(list.map((m: any) => m.groupId).filter(Boolean))];
      if (groupIds.length > 0) {
        const groups = await prisma.$queryRawUnsafe<any[]>(
          'SELECT id, group_name FROM customer_group WHERE id IN (?) AND is_delete = 0',
          [groupIds]
        );
        groups.forEach((g: any) => { groupNameMap[g.id] = g.group_name; });
      }
    }

    const enrichedList = list.map((m: any) => ({
      ...m,
      customerGroupName: m.groupId ? (groupNameMap[m.groupId] || `群组${m.groupId}`) : null,
    }));

    return successResponse({
      total,
      page,
      pageSize,
      list: enrichedList,
    });
  } catch (error: any) {
    console.error('获取物料列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

/** POST /api/bom/material - 创建物料 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const body = await request.json();
    const validation = materialSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse(validation.error.errors[0].message);
    }

    const data = validation.data;

    // 生成内部编码
    let internalCode = data.internalCode;
    if (!internalCode) {
      internalCode = await generateInternalCode(data.materialType);
    }

    // 检查内部编码是否已存在
    if (internalCode) {
      const exists = await prisma.material.findFirst({
        where: { internalCode, isDelete: false },
      });
      if (exists) {
        return badRequestResponse('内部编码已存在');
      }
    }

    // 创建物料
    const material = await prisma.material.create({
      data: {
        uuid: uuidv4(),
        materialName: data.materialName,
        internalCode,
        drawingCode: data.drawingCode,
        drawingNo: data.drawingNo,
        materialType: data.materialType,
        unit: data.unit,
        spec: data.spec,
        weight: data.weight,
        customerId: data.customerId,
        remark: data.remark,
        status: data.status,
        createdBy: user.id,
      },
    });

    return successResponse(material, '物料创建成功');
  } catch (error: any) {
    console.error('创建物料失败:', error);
    return serverErrorResponse(error.message);
  }
}
