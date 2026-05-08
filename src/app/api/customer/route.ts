import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { z } from 'zod';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';

// 前端发送的表单格式（兼容嵌套 invoiceInfo 和旧的 contactPerson/contactPhone 字段）
const customerSchema = z.object({
  customerName: z.string().min(1, '客户名称不能为空'),
  customerType: z.string().optional(),
  // 前端可能发送 invoiceInfo 嵌套对象
  invoiceInfo: z.object({
    companyName: z.string().optional(),
    taxId: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    bankName: z.string().optional(),
    bankAccount: z.string().optional(),
  }).optional(),
  // 也可能直接发送扁平字段
  invoiceName: z.string().optional(),
  taxNo: z.string().optional(),
  regAddress: z.string().optional(),
  regPhone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  // 旧字段（前端可能发送但 Prisma 模型不需要）
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  taxInfo: z.string().optional(),
  // 其他
  address: z.string().optional(),
  remark: z.string().optional(),
});

const CUSTOMER_TYPE_MAP: Record<string, string> = {
  '企业': 'enterprise',
  '个人': 'individual',
  'enterprise': 'enterprise',
  'individual': 'individual',
  'personal': 'individual',
};

const CUSTOMER_TYPE_REVERSE: Record<string, string> = {
  'enterprise': '企业',
  'individual': '个人',
};

/**
 * 将前端表单数据映射为 Prisma Customer 模型字段
 */
function mapFormData(body: any) {
  // 处理 invoiceInfo 嵌套对象到扁平字段
  const invoiceInfo = body.invoiceInfo || {};
  return {
    customerName: body.customerName,
    customerType: CUSTOMER_TYPE_MAP[body.customerType || 'enterprise'] || 'enterprise',
    // 开票信息：优先从 invoiceInfo 嵌套对象取，其次从扁平字段取
    invoiceName: invoiceInfo.companyName || body.invoiceName || null,
    taxNo: invoiceInfo.taxId || body.taxNo || null,
    regAddress: invoiceInfo.address || body.regAddress || null,
    regPhone: invoiceInfo.phone || body.regPhone || null,
    bankName: invoiceInfo.bankName || body.bankName || null,
    bankAccount: invoiceInfo.bankAccount || body.bankAccount || null,
    // 其他
    address: body.address || body.contactAddress || null,
    remark: body.remark || null,
  };
}

// GET - 获取客户列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const customerType = searchParams.get('customerType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = { isDelete: false };
    if (keyword) {
      where.OR = [
        { customerName: { contains: keyword } },
        { customerCode: { contains: keyword } },
      ];
    }
    if (customerType) {
      where.customerType = CUSTOMER_TYPE_MAP[customerType] || customerType;
    }

    const [list, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          contacts: {
            where: { isDelete: false },
            orderBy: { isPrimary: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    // 转换数据格式，兼容前端
    const listWithTypeName = list.map(c => ({
      ...c,
      customerTypeName: CUSTOMER_TYPE_REVERSE[c.customerType] || c.customerType,
      // 构造 invoiceInfo 嵌套对象供前端使用
      invoiceInfo: {
        companyName: c.invoiceName || '',
        taxId: c.taxNo || '',
        address: c.regAddress || '',
        phone: c.regPhone || '',
        bankName: c.bankName || '',
        bankAccount: c.bankAccount || '',
      },
      // 兼容旧字段
      contactPerson: c.contacts?.find((ct: any) => ct.isPrimary)?.contactName || '',
      contactPhone: c.contacts?.find((ct: any) => ct.isPrimary)?.phone || '',
    }));

    return successResponse({ list: listWithTypeName, total, page, pageSize });
  } catch (error: any) {
    console.error('获取客户列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

// POST - 创建客户
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const validation = customerSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse(validation.error.errors[0].message);
    }

    // 映射前端字段到 Prisma 模型字段
    const mappedData = mapFormData(body);

    // 生成客户编码
    const customerCode = await generateCustomerCode();

    const customer = await prisma.customer.create({
      data: {
        customerCode,
        customerName: mappedData.customerName,
        customerType: mappedData.customerType,
        // 开票信息
        invoiceName: mappedData.invoiceName,
        taxNo: mappedData.taxNo,
        regAddress: mappedData.regAddress,
        regPhone: mappedData.regPhone,
        bankName: mappedData.bankName,
        bankAccount: mappedData.bankAccount,
        // 其他
        address: mappedData.address,
        remark: mappedData.remark,
        status: 'active',
        createdBy: authResult.userId,
      },
      include: {
        contacts: {
          where: { isDelete: false },
        },
      },
    });

    // 记录操作日志
    await operationLog.logCreate(
      '客户管理',
      authResult.userId,
      authResult.username,
      { customerCode, customerName: mappedData.customerName, customerType: mappedData.customerType },
      getClientIp(request)
    );

    return successResponse(customer, '客户创建成功');
  } catch (error: any) {
    console.error('创建客户失败:', error);
    return serverErrorResponse(error.message);
  }
}

// 生成客户编码查找当前最大编号+1，避免软删除导致重复
async function generateCustomerCode(): Promise<string> {
  const result = await prisma.$queryRaw<[{maxCode: string | null}][]>`
    SELECT MAX(customer_code) as maxCode FROM customer
  `;
  const maxCode = result[0]?.maxCode;
  let nextNum = 1;
  if (maxCode) {
    // 提取 KH 后面的数字部分
    const numStr = maxCode.replace(/^KH/, '');
    nextNum = parseInt(numStr, 10) + 1;
  }

  return `KH${String(nextNum).padStart(6, '0')}`;
}
