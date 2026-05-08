import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, badRequestResponse, serverErrorResponse, notFoundResponse } from '@/lib/response';
import { operationLog } from '@/lib/services/operation-log';

// 获取群组详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await prisma.customerGroup.findFirst({
      where: { id: parseInt(id), isDelete: false },
      include: {
        customers: {
          where: { isDelete: false },
          select: { id: true, customerCode: true, customerName: true, customerType: true },
        },
      },
    });
    if (!group) return notFoundResponse('群组不存在');
    return successResponse(group);
  } catch (error: any) {
    console.error('获取群组详情失败:', error);
    return serverErrorResponse(error.message);
  }
}

// 更新群组
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const body = await request.json();
    const { groupName, description, status, customerIds } = body;

    const group = await prisma.customerGroup.findFirst({
      where: { id: parseInt(id), isDelete: false },
    });
    if (!group) return notFoundResponse('群组不存在');

    // 检查名称重复
    if (groupName && groupName !== group.groupName) {
      const exists = await prisma.customerGroup.findFirst({
        where: { groupName, isDelete: false, id: { not: parseInt(id) } },
      });
      if (exists) return badRequestResponse('群组名称已存在');
    }

    const oldData = { ...group };
    const updated = await prisma.customerGroup.update({
      where: { id: parseInt(id) },
      data: {
        ...(groupName !== undefined && { groupName }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        modifiedBy: authResult.userId,
      },
    });

    // 更新群组中的客户
    if (Array.isArray(customerIds)) {
      // 先将当前群组下所有客户的 groupId 置空
      await prisma.customer.updateMany({
        where: { groupId: parseInt(id), isDelete: false },
        data: { groupId: null },
      });
      // 再将选中的客户加入群组
      if (customerIds.length > 0) {
        await prisma.customer.updateMany({
          where: { id: { in: customerIds }, isDelete: false },
          data: { groupId: parseInt(id) },
        });
      }
    }

    await operationLog.logUpdate('客户群组', authResult.userId, authResult.username, oldData, updated, request);

    return successResponse(updated);
  } catch (error: any) {
    console.error('更新群组失败:', error);
    return serverErrorResponse(error.message);
  }
}

// 删除群组（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const group = await prisma.customerGroup.findFirst({
      where: { id: parseInt(id), isDelete: false },
      include: { _count: { select: { customers: { where: { isDelete: false } } } } },
    });
    if (!group) return notFoundResponse('群组不存在');

    if (group._count.customers > 0) {
      return badRequestResponse('该群组下还有客户，无法删除');
    }

    await prisma.customerGroup.update({
      where: { id: parseInt(id) },
      data: { isDelete: true, modifiedBy: authResult.userId },
    });

    await operationLog.logDelete('客户群组', authResult.userId, authResult.username, { groupCode: group.groupCode, groupName: group.groupName }, request);

    return successResponse(null, '删除成功');
  } catch (error: any) {
    console.error('删除群组失败:', error);
    return serverErrorResponse(error.message);
  }
}
