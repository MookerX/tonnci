// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-expect-error
// =============================================================================
// 腾曦生产管理系统 - 工资结算API
// 描述: 报工数据归集、工资核算、发放
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';

/** 生成工资单号
/**/
function generateWageNo(settleMonth: string): string {
  return `GZ${settleMonth.replace('-', '')}${String(Date.now()).slice(-6)}`;
}

/** POST /api/wages - 创建工资结算
/**/
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const auth = authResult;

    const body = await request.json();
    const { settleMonth, workerId, records, remark } = body;

    if (!settleMonth || !records || records.length === 0) {
      return badRequestResponse('参数不完整');
    }

    const wageNo = generateWageNo(settleMonth);

    // 计算工资
    let totalPieceWage = 0;
    let totalTimeWage = 0;
    let totalAllowance = 0;
    let totalDeduction = 0;

    const settlementRecords: any[] = [];

    for (const record of records) {
      const pieceWage = (record.pieceWage || 0);
      const timeWage = (record.timeWage || 0);
      const allowance = (record.allowance || 0);
      const deduction = (record.deduction || 0);

      totalPieceWage += pieceWage;
      totalTimeWage += timeWage;
      totalAllowance += allowance;
      totalDeduction += deduction;

      settlementRecords.push({
        workReportId: record.workReportId,
        pieceWage,
        timeWage,
        allowance,
        deduction,
      });
    }

    const totalWage = totalPieceWage + totalTimeWage + totalAllowance - totalDeduction;

    // 创建工资结算 (WageSettlement doesn't have wageNo field)
    const settlement = await prisma.wageSettlement.create({
      data: {
        settleMonth,
        workerId,
        pieceWage: totalPieceWage,
        timeWage: totalTimeWage,
        allowance: totalAllowance,
        deduction: totalDeduction,
        totalWage,
        settlementStatus: 'pending',
        remark,
        createdBy: auth.userId,
        modifiedBy: auth.userId,
      } as any,
    });

    // 创建结算明细
    await prisma.wageSettlementItem.createMany({
      data: settlementRecords.map((r: any) => ({
        settlementId: settlement.id,
        workReportId: r.workReportId,
        pieceWage: r.pieceWage,
        timeWage: r.timeWage,
        allowance: r.allowance,
        deduction: r.deduction,
      })),
    });

    // 记录操作日志
    await operationLog.log({
      moduleName: '工资结算',
      businessType: '创建工资结算',
      operatorId: auth.userId,
      operatorName: auth.username,
      operationDesc: `创建工资结算: ${wageNo}, 结算月份: ${settleMonth}, 总工资: ${totalWage}`,
      ipAddress: getClientIp(request),
      status: 'success',
    });

    return successResponse(settlement);
  } catch (error: any) {
    console.error('创建工资结算失败:', error);
    return serverErrorResponse(error.message);
  }
}
