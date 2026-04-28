// =============================================================================
// 腾曦生产管理系统 - 操作日志API
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';

// 获取操作日志列表
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const moduleFilter = searchParams.get('module');
    const operator = searchParams.get('operator');
    
    const where: any = { isDelete: false };
    if (moduleFilter) where.module = moduleFilter;
    if (operator) where.operatorName = { contains: operator };
    
    const [list, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.operationLog.count({ where }),
    ]);
    
    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: { list, total, page, pageSize },
    });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    return NextResponse.json({ code: 500, message: '服务器错误', data: null }, { status: 500 });
  }
}
