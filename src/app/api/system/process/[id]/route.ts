import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { z } from 'zod';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';

const processSchema = z.object({
  processCode: z.string().min(1, '工序编码不能为空'),
  processName: z.string().min(1, '工序名称不能为空'),
  processType: z.string().optional(),
  description: z.string().optional(),
  prepareHours: z.number().optional(),
  workHours: z.number().optional(),
  needDrawing: z.boolean().optional(),
  drawingTypes: z.array(z.string()).optional(),
  status: z.string().optional(),
  remark: z.string().optional(),
});

// GET 获取单个工序详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const process = await prisma.processDefinition.findUnique({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!process) {
      return NextResponse.json({ code: 404, message: '工序不存在' }, { status: 404 });
    }

    return NextResponse.json({ code: 200, message: 'success', data: process });
  } catch (error) {
    console.error('获取工序详情失败:', error);
    return NextResponse.json({ code: 500, message: '获取工序详情失败' }, { status: 500 });
  }
}

// PUT 更新工序
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validationResult = processSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        code: 400, 
        message: validation.error.message 
      }, { status: 400 });
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查工序是否存在
    const existing = await prisma.processDefinition.findUnique({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!existing) {
      return NextResponse.json({ code: 404, message: '工序不存在' }, { status: 404 });
    }

    // 检查工序编码是否被其他工序使用
    if (data.processCode !== existing.processCode) {
      const codeExists = await prisma.processDefinition.findFirst({
        where: { processCode: data.processCode, isDelete: false, id: { not: parseInt(id) } },
      });

      if (codeExists) {
        return NextResponse.json({ code: 400, message: '工序编码已存在' }, { status: 400 });
      }
    }

    const oldData = {
      processCode: existing.processCode,
      processName: existing.processName,
      prepareHours: existing.prepareHours,
      workHours: existing.workHours,
    };

    const process = await prisma.processDefinition.update({
      where: { id: parseInt(id) },
      data: {
        processCode: data.processCode,
        processName: data.processName,
        processType: data.processType,
        description: data.description,
        prepareHours: data.prepareHours,
        workHours: data.workHours,
        needDrawing: data.needDrawing,
        drawingTypes: data.drawingTypes ? JSON.stringify(data.drawingTypes) : undefined,
        status: data.status,
        remark: data.remark,
        modifiedBy: user.id,
      },
    });

    await operationLog.logSuccess(
      '工序管理',
      'update',
      user.id,
      user.username,
      `更新工序: ${data.processName}`,
      JSON.stringify({ oldData, newData: data }),
      clientIp
    );

    return NextResponse.json({ code: 200, message: '更新成功', data: process });
  } catch (error) {
    console.error('更新工序失败:', error);
    return NextResponse.json({ code: 500, message: '更新工序失败' }, { status: 500 });
  }
}

// DELETE 删除工序
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const clientIp = getClientIp(request);

    // 检查工序是否存在
    const existing = await prisma.processDefinition.findUnique({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!existing) {
      return NextResponse.json({ code: 404, message: '工序不存在' }, { status: 404 });
    }

    await prisma.processDefinition.update({
      where: { id: parseInt(id) },
      data: { isDelete: true, modifiedBy: user.id },
    });

    await operationLog.logSuccess(
      '工序管理',
      'delete',
      user.id,
      user.username,
      `删除工序: ${existing.processName}`,
      JSON.stringify(existing),
      clientIp
    );

    return NextResponse.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除工序失败:', error);
    return NextResponse.json({ code: 500, message: '删除工序失败' }, { status: 500 });
  }
}
