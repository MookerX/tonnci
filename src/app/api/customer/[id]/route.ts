import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/jwt';
import { successResponse, badRequestResponse, serverErrorResponse, notFoundResponse } from '@/lib/response';
import { z } from 'zod';

const customerTypeMap: Record<string, string> = {
  '企业': 'enterprise',
  '个人': 'individual',
};

const updateSchema = z.object({
  customerName: z.string().min(1, '客户名称不能为空').optional(),
  customerType: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  taxInfo: z.string().optional(),
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
      include: { contacts: { where: { isDelete: false }, orderBy: { isPrimary: 'desc' } } },
    });

    if (!customer) {
      return notFoundResponse('客户不存在');
    }

    return successResponse(customer);
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
    const user = authResult;

    const { id } = await params;
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return badRequestResponse(validation.error.errors[0].message);
    }

    const data = validation.data;

    const existing = await prisma.customer.findFirst({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!existing) {
      return notFoundResponse('客户不存在');
    }

    const updateData: any = { modifiedBy: user.id };
    if (data.customerName) updateData.customerName = data.customerName;
    if (data.customerType) updateData.customerType = customerTypeMap[data.customerType] || data.customerType;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.contactAddress !== undefined) updateData.contactAddress = data.contactAddress;
    if (data.taxInfo !== undefined) updateData.taxInfo = data.taxInfo;
    if (data.remark !== undefined) updateData.remark = data.remark;
    if (data.status) updateData.status = data.status;

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

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
    const user = authResult;

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
      data: { isDelete: true, modifiedBy: user.id },
    });

    return successResponse(null, '客户删除成功');
  } catch (error: any) {
    console.error('删除客户失败:', error);
    return serverErrorResponse(error.message);
  }
}
