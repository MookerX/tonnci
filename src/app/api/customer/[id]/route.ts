import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, badRequestResponse, serverErrorResponse, notFoundResponse } from '@/lib/response';
import { z } from 'zod';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';

const customerTypeMap: Record<string, string> = {
  '企业': 'enterprise',
  '个人': 'individual',
  'enterprise': 'enterprise',
  'individual': 'individual',
  'personal': 'individual',
};

const updateSchema = z.object({
  customerName: z.string().min(1, '客户名称不能为空').optional(),
  customerType: z.string().optional(),
  groupId: z.number().nullable().optional(),
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
  // 旧字段兼容
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  taxInfo: z.string().optional(),
  // 其他
  address: z.string().optional(),
  remark: z.string().optional(),
  status: z.string().optional(),
});

/** GET /api/customer/[id] - 获取客户详情 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id: parseInt(id), isDelete: false },
      include: {
        contacts: { where: { isDelete: false }, orderBy: { isPrimary: 'desc' } },
        group: { select: { id: true, groupCode: true, groupName: true } },
      },
    });

    if (!customer) {
      return notFoundResponse('客户不存在');
    }

    // 构造前端兼容的数据格式
    const result = {
      ...customer,
      groupName: customer.group?.groupName || '',
      groupCode: customer.group?.groupCode || '',
      invoiceInfo: {
        companyName: customer.invoiceName || '',
        taxId: customer.taxNo || '',
        address: customer.regAddress || '',
        phone: customer.regPhone || '',
        bankName: customer.bankName || '',
        bankAccount: customer.bankAccount || '',
      },
      contactPerson: customer.contacts?.find((ct: any) => ct.isPrimary)?.contactName || '',
      contactPhone: customer.contacts?.find((ct: any) => ct.isPrimary)?.phone || '',
    };

    return successResponse(result);
  } catch (error: any) {
    console.error('获取客户详情失败:', error);
    return serverErrorResponse(error.message);
  }
}

/** PUT /api/customer/[id] - 更新客户 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.customer.findFirst({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!existing) {
      return notFoundResponse('客户不存在');
    }

    // 处理 invoiceInfo 嵌套对象到扁平字段
    const invoiceInfo = body.invoiceInfo || {};

    const updateData: any = { modifiedBy: authResult.userId };
    if (body.customerName) updateData.customerName = body.customerName;
    if (body.customerType) updateData.customerType = customerTypeMap[body.customerType] || body.customerType;
    if (body.groupId !== undefined) {
      // 校验：如果要分配到群组，检查该客户是否已属于其他群组
      const newGroupId = body.groupId || null;
      if (newGroupId && existing.groupId && existing.groupId !== newGroupId) {
        return badRequestResponse('该客户已属于其他群组，一个客户只能属于一个群组');
      }
      updateData.groupId = newGroupId;
    }
    // 开票信息：优先从 invoiceInfo 嵌套对象取
    if (invoiceInfo.companyName !== undefined) updateData.invoiceName = invoiceInfo.companyName || null;
    else if (body.invoiceName !== undefined) updateData.invoiceName = body.invoiceName || null;
    if (invoiceInfo.taxId !== undefined) updateData.taxNo = invoiceInfo.taxId || null;
    else if (body.taxNo !== undefined) updateData.taxNo = body.taxNo || null;
    if (invoiceInfo.address !== undefined) updateData.regAddress = invoiceInfo.address || null;
    else if (body.regAddress !== undefined) updateData.regAddress = body.regAddress || null;
    if (invoiceInfo.phone !== undefined) updateData.regPhone = invoiceInfo.phone || null;
    else if (body.regPhone !== undefined) updateData.regPhone = body.regPhone || null;
    if (invoiceInfo.bankName !== undefined) updateData.bankName = invoiceInfo.bankName || null;
    else if (body.bankName !== undefined) updateData.bankName = body.bankName || null;
    if (invoiceInfo.bankAccount !== undefined) updateData.bankAccount = invoiceInfo.bankAccount || null;
    else if (body.bankAccount !== undefined) updateData.bankAccount = body.bankAccount || null;
    // 其他
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.remark !== undefined) updateData.remark = body.remark || null;
    if (body.status) updateData.status = body.status;

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // 记录操作日志
    await operationLog.logUpdate(
      '客户管理',
      authResult.userId,
      authResult.username,
      { customerCode: existing.customerCode, customerName: existing.customerName, ...existing },
      { customerCode: existing.customerCode, customerName: customer.customerName, ...customer },
      getClientIp(request)
    );

    return successResponse(customer, '客户更新成功');
  } catch (error: any) {
    console.error('更新客户失败:', error);
    return serverErrorResponse(error.message);
  }
}

/** DELETE /api/customer/[id] - 删除客户 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;

    const existing = await prisma.customer.findFirst({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!existing) {
      return notFoundResponse('客户不存在');
    }

    // 检查是否有物料关联
    const materialCount = await prisma.material.count({
      where: { customerId: parseInt(id), isDelete: false },
    });

    if (materialCount > 0) {
      return badRequestResponse(`该客户下有${materialCount}个物料，无法删除`);
    }

    await prisma.customer.update({
      where: { id: parseInt(id) },
      data: { isDelete: true, modifiedBy: authResult.userId },
    });

    // 记录操作日志
    await operationLog.logDelete(
      '客户管理',
      authResult.userId,
      authResult.username,
      { customerCode: existing.customerCode, customerName: existing.customerName },
      getClientIp(request)
    );

    return successResponse(null, '客户删除成功');
  } catch (error: any) {
    console.error('删除客户失败:', error);
    return serverErrorResponse(error.message);
  }
}
