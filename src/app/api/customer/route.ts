import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/response';
import { z } from 'zod';

// 客户类型映射
const CUSTOMER_TYPE_MAP: Record<string, string> = {
  '企业': 'enterprise',
  '个人': 'individual',
};

const customerSchema = z.object({
  customerName: z.string().min(1, '客户名称不能为空'),
  customerType: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  taxInfo: z.string().optional(),
  remark: z.string().optional(),
});

/** GET /api/customer - 获取客户列表 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = { isDelete: false };
    if (keyword) {
      where.OR = [
        { customerName: { contains: keyword } },
        { customerCode: { contains: keyword } },
        { contactPerson: { contains: keyword } },
        { contactPhone: { contains: keyword } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return successResponse({
      list: customers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error('获取客户列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

/** POST /api/customer - 创建客户 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserFromToken(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const body = await request.json();
    const validation = customerSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse(validation.error.errors[0].message);
    }

    const data = validation.data;

    // 生成客户编码
    const customerCode = await generateCustomerCode();

    const customer = await prisma.customer.create({
      data: {
        customerCode,
        customerName: data.customerName,
        customerType: CUSTOMER_TYPE_MAP[data.customerType || '企业'] || 'enterprise',
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        contactAddress: data.contactAddress,
        taxInfo: data.taxInfo,
        remark: data.remark,
        status: 'active',
        createdBy: user.id,
      },
    });

    return successResponse(customer, '客户创建成功');
  } catch (error: any) {
    console.error('创建客户失败:', error);
    return serverErrorResponse(error.message);
  }
}

// 生成客户编码
async function generateCustomerCode(): Promise<string> {
  const result = await prisma.$queryRaw<[{cnt: bigint}][]>`
    SELECT COUNT(*) as cnt FROM customer WHERE is_delete = 0
  `;
  const count = Number(result[0]?.cnt || 0);

  return `KH${String(count + 1).padStart(6, '0')}`;
}
