import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { z } from 'zod';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';

// Schema验证
const processSchema = z.object({
  processCode: z.string().min(1, '工序编码不能为空'),
  processName: z.string().min(1, '工序名称不能为空'),
  processType: z.string().optional(), // 工序类型：cutting切割, welding焊接, assembly装配, etc.
  description: z.string().optional(), // 工序描述
  prepareHours: z.number().optional().default(0), // 准备工时（小时）
  workHours: z.number().optional().default(0), // 作业工时（小时）
  needDrawing: z.boolean().optional().default(false), // 是否需要工艺附图
  drawingTypes: z.array(z.string()).optional(), // 需要的图纸类型，如['laser激光','plasma等离子']
  status: z.string().optional(),
  remark: z.string().optional(),
});

// GET 获取工序列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const processType = searchParams.get('processType');
    const status = searchParams.get('status');

    const where: any = { isDelete: false };
    
    if (keyword) {
      where.OR = [
        { processCode: { contains: keyword } },
        { processName: { contains: keyword } },
      ];
    }
    
    if (processType) {
      where.processType = processType;
    }

    if (status) {
      where.status = status;
    }

    const processes = await prisma.processDefinition.findMany({
      where,
      orderBy: [{ processCode: 'asc' }],
    });

    return NextResponse.json({ code: 200, message: 'success', data: processes });
  } catch (error) {
    console.error('获取工序列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取工序列表失败' }, { status: 500 });
  }
}

// POST 创建工序
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = processSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        code: 400, 
        message: validationResult.error.errors[0].message 
      }, { status: 400 });
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查工序编码是否已存在
    const existing = await prisma.processDefinition.findFirst({
      where: { processCode: data.processCode, isDelete: false },
    });

    if (existing) {
      return NextResponse.json({ code: 400, message: '工序编码已存在' }, { status: 400 });
    }

    const process = await prisma.processDefinition.create({
      data: {
        processCode: data.processCode,
        processName: data.processName,
        processType: data.processType || 'general',
        description: data.description,
        prepareHours: data.prepareHours,
        workHours: data.workHours,
        needDrawing: data.needDrawing,
        drawingTypes: data.drawingTypes ? JSON.stringify(data.drawingTypes) : null,
        status: data.status || 'active',
        remark: data.remark,
        createdBy: user.id,
      },
    });

    await operationLog.logSuccess(
      '工序管理',
      'create',
      user.id,
      user.username,
      `创建工序: ${data.processName}`,
      JSON.stringify(data),
      clientIp
    );

    return NextResponse.json({ code: 200, message: '创建成功', data: process });
  } catch (error) {
    console.error('创建工序失败:', error);
    return NextResponse.json({ code: 500, message: '创建工序失败' }, { status: 500 });
  }
}
