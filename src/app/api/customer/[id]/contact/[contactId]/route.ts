import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';

// DELETE /api/customer/[id]/contact/[contactId] - 删除联系人
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;

    const { id, contactId } = await params;
    const contactIdNum = parseInt(contactId);

    // 查找联系人
    const contact = await prisma.customerContact.findFirst({
      where: { id: contactIdNum, isDelete: false },
    });

    if (!contact) {
      return NextResponse.json({ code: 404, message: '联系人不存在' }, { status: 404 });
    }

    // 软删除
    await prisma.customerContact.update({
      where: { id: contactIdNum },
      data: { isDelete: true },
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        moduleName: '客户管理',
        businessType: 'delete',
        businessId: parseInt(id),
        operUserId: user.id,
        operUserName: user.username,
        operIp: getClientIp(request),
        operResult: 'success',
        operDesc: `删除联系人：${contact.contactName}`,
        isDelete: false,
      },
    });

    return NextResponse.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除联系人失败:', error);
    return NextResponse.json({ code: 500, message: '删除失败' }, { status: 500 });
  }
}
