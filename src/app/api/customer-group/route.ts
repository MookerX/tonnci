import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { operationLog } from '@/lib/services/operation-log';

// 获取群组列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = { isDelete: false };
    if (keyword) {
      where.OR = [
        { groupCode: { contains: keyword } },
        { groupName: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [list, total] = await Promise.all([
      prisma.customerGroup.findMany({
        where,
        include: {
          _count: { select: { customers: { where: { isDelete: false } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customerGroup.count({ where }),
    ]);

    // 转换 _count 为 customerCount
    const result = list.map(({ _count, ...rest }) => ({
      ...rest,
      customerCount: _count.customers,
    }));

    return successResponse({ list: result, total, page, pageSize });
  } catch (error: any) {
    console.error('获取群组列表失败:', error);
    return serverErrorResponse(error.message);
  }
}

// 创建群组
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { groupName, description, status, customerIds } = body;

    if (!groupName) {
      return badRequestResponse('群组名称不能为空');
    }

    // 检查名称是否重复
    const exists = await prisma.customerGroup.findFirst({
      where: { groupName, isDelete: false },
    });
    if (exists) {
      return badRequestResponse('群组名称已存在');
    }

    // 生成群组编码 QZ+6位自增编号
    const lastGroup = await prisma.customerGroup.findFirst({
      where: { isDelete: false },
      orderBy: { groupCode: 'desc' },
      select: { groupCode: true },
    });
    let nextNum = 1;
    if (lastGroup?.groupCode) {
      const numStr = lastGroup.groupCode.replace('QZ', '');
      nextNum = parseInt(numStr) + 1;
    }
    const groupCode = `QZ${String(nextNum).padStart(6, '0')}`;

    const group = await prisma.customerGroup.create({
      data: {
        groupCode,
        groupName,
        description,
        status: status || 'active',
        createdBy: authResult.userId,
      },
    });

    // 将选中的客户加入群组
    if (Array.isArray(customerIds) && customerIds.length > 0) {
      // 检查客户是否已属于其他群组
      const alreadyGrouped = await prisma.customer.findMany({
        where: { id: { in: customerIds }, isDelete: false, groupId: { not: null } },
        select: { id: true, customerName: true, groupId: true },
      });
      if (alreadyGrouped.length > 0) {
        // 删除刚创建的群组
        await prisma.customerGroup.delete({ where: { id: group.id } });
        const names = alreadyGrouped.map(c => c.customerName).join('、');
        return badRequestResponse(`客户 ${names} 已属于其他群组，一个客户只能属于一个群组`);
      }
      await prisma.customer.updateMany({
        where: { id: { in: customerIds }, isDelete: false },
        data: { groupId: group.id },
      });
    }

    await operationLog.logCreate('客户群组', authResult.userId, authResult.username, group, request);

    return successResponse(group);
  } catch (error: any) {
    console.error('创建群组失败:', error);
    return serverErrorResponse(error.message);
  }
}
