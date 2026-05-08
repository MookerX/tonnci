import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/jwt';
import { z } from 'zod';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';

const contactSchema = z.object({
  contactName: z.string().min(1, '联系人姓名不能为空'),
  postType: z.enum(['boss', 'finance', 'tech', 'quality', 'business', 'delivery', 'production']),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  isPrimary: z.boolean().optional().default(false),
  remark: z.string().optional(),
});

const postTypeNames: Record<string, string> = {
  boss: '老板',
  finance: '财务',
  tech: '技术',
  quality: '质量',
  business: '商务',
  delivery: '交付',
  production: '生产',
};

// GET /api/customer/[id]/contact - 获取客户联系人列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);

    const contacts = await prisma.customerContact.findMany({
      where: { customerId, isDelete: false },
      orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
    });

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: contacts.map(c => ({
        ...c,
        postTypeName: postTypeNames[c.postType] || c.postType,
      })),
    });
  } catch (error) {
    console.error('获取联系人失败:', error);
    return NextResponse.json({ code: 500, message: '获取失败' }, { status: 500 });
  }
}

// POST /api/customer/[id]/contact - 新增联系人
export async function POST(
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
    const customerId = parseInt(id);
    const body = await request.json();

    // 验证数据
    const validationResult = contactSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        code: 400,
        message: validationResult.error.errors[0].message,
      }, { status: 400 });
    }

    const data = validationResult.data;

    // 如果设置为主要联系人，先取消其他主要联系人
    if (data.isPrimary) {
      await prisma.customerContact.updateMany({
        where: { customerId, isPrimary: true, isDelete: false },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.customerContact.create({
      data: {
        customerId,
        contactName: data.contactName,
        postType: data.postType,
        phone: data.phone || null,
        email: data.email || null,
        isPrimary: data.isPrimary,
        remark: data.remark || null,
      },
    });

    // 记录操作日志
    await operationLog.logSuccess(
      '客户管理',
      'create',
      user.id,
      user.username,
      `新增联系人：${data.contactName}（${postTypeNames[data.postType]}）`,
      { customerId },
      getClientIp(request)
    );

    return NextResponse.json({
      code: 200,
      message: '添加成功',
      data: { ...contact, postTypeName: postTypeNames[contact.postType] },
    });
  } catch (error) {
    console.error('添加联系人失败:', error);
    return NextResponse.json({ code: 500, message: '添加失败' }, { status: 500 });
  }
}

// PUT /api/customer/[id]/contact - 批量更新联系人
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
    const customerId = parseInt(id);
    const body = await request.json();
    const { contacts } = body;

    if (!Array.isArray(contacts)) {
      return NextResponse.json({ code: 400, message: '参数格式错误' }, { status: 400 });
    }

    // 开启事务处理
    await prisma.$transaction(async (tx) => {
      // 获取现有联系人ID
      const existingContacts = await tx.customerContact.findMany({
        where: { customerId, isDelete: false },
        select: { id: true },
      });
      const existingIds = new Set(existingContacts.map(c => c.id));

      // 处理每个联系人
      for (const contact of contacts) {
        if (contact.id) {
          // 更新现有联系人
          if (existingIds.has(contact.id)) {
            await tx.customerContact.update({
              where: { id: contact.id },
              data: {
                contactName: contact.contactName,
                postType: contact.postType,
                phone: contact.phone || null,
                email: contact.email || null,
                isPrimary: contact.isPrimary || false,
                remark: contact.remark || null,
              },
            });
            existingIds.delete(contact.id);
          }
        } else {
          // 新增联系人
          const postType = contact.postType || 'business';
          await tx.customerContact.create({
            data: {
              customerId,
              contactName: contact.contactName,
              postType,
              phone: contact.phone || null,
              email: contact.email || null,
              isPrimary: contact.isPrimary || false,
              remark: contact.remark || null,
            },
          });
        }
      }

      // 删除被移除的联系人
      if (existingIds.size > 0) {
        await tx.customerContact.updateMany({
          where: { id: { in: Array.from(existingIds) } },
          data: { isDelete: true },
        });
      }
    });

    // 记录操作日志
    await operationLog.logSuccess(
      '客户管理',
      'update',
      user.id,
      user.username,
      `更新联系人，共${contacts.length}个`,
      { customerId },
      getClientIp(request)
    );

    return NextResponse.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新联系人失败:', error);
    return NextResponse.json({ code: 500, message: '更新失败' }, { status: 500 });
  }
}
