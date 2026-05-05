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
  
  // 获取该类型物料的最大序号
  const result = await prisma.$queryRaw<[{cnt: bigint}][]>`
    SELECT COUNT(*) as cnt FROM material 
    WHERE material_type = ${materialType} AND is_delete = 0
  `;
  const count = Number(result[0]?.cnt || 0);
  
  return `${prefix}${String(count + 1).padStart(8, '0')}`;
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
    
    if (customerId) {
      where.customerId = parseInt(customerId);
    }
    
    if (status) {
      where.status = status;
    }

    const [total, list] = await Promise.all([
      prisma.material.count({ where }),
      prisma.material.findMany({
        where,
        include: {
          customer: {
            select: { id: true, customerName: true }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return successResponse({
      total,
      page,
      pageSize,
      list,
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
