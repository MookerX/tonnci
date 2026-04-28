// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 客户管理API
// 描述: 客户信息CRUD操作
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { customerSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/** 生成客户编码
/**/
async function generateCustomerCode(): Promise<string> {
  const count = await prisma.customer.count({ where: { isDelete: false } });
  return `KH${String(count + 1).padStart(6, '0')}`;
}

/** POST /api/customer - 创建客户
/**/
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const auth = authResult;

    const body = await request.json();
    const validation = customerSchema.safeParse(body);
    if (!validation.success) return badRequestResponse('参数验证失败');

    const data = validation.data;

    // 生成客户编码
    const customerCode = await generateCustomerCode();

    const customer = await prisma.customer.create({
      data: {
        customerCode,
        customerName: data.customerName,
        customerType: data.customerType || 'enterprise',
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        taxNo: data.taxNo,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        address: data.address,
        creditLevel: data.creditLevel,
        status: data.status || 'active',
        remark: data.remark,
        createdBy: auth.userId,
        modifiedBy: auth.userId,
      },
    });

    // 记录操作日志
    await operationLog.log({
      moduleName: '客户管理',
      businessType: '新增客户',
      operatorId: auth.userId,
      operatorName: auth.username,
      operationDesc: `新增客户: ${customer.customerName} (${customer.customerCode})`,
      ipAddress: getClientIp(request),
      status: 'success',
    });

    return successResponse(customer);
  } catch (error: any) {
    console.error('创建客户失败:', error);
    return serverErrorResponse(error.message);
  }
}
