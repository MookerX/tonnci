import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { z } from 'zod';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';

const equipmentSchema = z.object({
  equipmentCode: z.string().min(1, '设备编码不能为空'),
  equipmentName: z.string().min(1, '设备名称不能为空'),
  teamId: z.number().optional().nullable(),
  equipmentType: z.string().optional(),
  parameters: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  status: z.string().optional(),
  remark: z.string().optional(),
});

// GET 获取单个设备详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const equipment = await prisma.equipment.findUnique({
      where: { id: parseInt(id), isDelete: false },
      include: {
        team: { select: { id: true, teamName: true } },
      },
    });

    if (!equipment) {
      return NextResponse.json({ code: 404, message: '设备不存在' }, { status: 404 });
    }

    return NextResponse.json({ code: 200, message: 'success', data: equipment });
  } catch (error) {
    console.error('获取设备详情失败:', error);
    return NextResponse.json({ code: 500, message: '获取设备详情失败' }, { status: 500 });
  }
}

// PUT 更新设备
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
    const validationResult = equipmentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        code: 400, 
        message: validation.error.message 
      }, { status: 400 });
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查设备是否存在
    const existing = await prisma.equipment.findUnique({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!existing) {
      return NextResponse.json({ code: 404, message: '设备不存在' }, { status: 404 });
    }

    // 检查设备编码是否被其他设备使用
    if (data.equipmentCode !== existing.equipmentCode) {
      const codeExists = await prisma.equipment.findFirst({
        where: { equipmentCode: data.equipmentCode, isDelete: false, id: { not: parseInt(id) } },
      });

      if (codeExists) {
        return NextResponse.json({ code: 400, message: '设备编码已存在' }, { status: 400 });
      }
    }

    const oldData = {
      equipmentCode: existing.equipmentCode,
      equipmentName: existing.equipmentName,
      teamId: existing.teamId,
      status: existing.status,
    };

    const equipment = await prisma.equipment.update({
      where: { id: parseInt(id) },
      data: {
        equipmentCode: data.equipmentCode,
        equipmentName: data.equipmentName,
        teamId: data.teamId,
        equipmentType: data.equipmentType,
        parameters: data.parameters,
        brand: data.brand,
        model: data.model,
        status: data.status,
        remark: data.remark,
        modifiedBy: user.id,
      },
    });

    await operationLog.logSuccess(
      '设备管理',
      'update',
      user.id,
      user.username,
      `更新设备: ${data.equipmentName}`,
      JSON.stringify({ oldData, newData: data }),
      clientIp
    );

    return NextResponse.json({ code: 200, message: '更新成功', data: equipment });
  } catch (error) {
    console.error('更新设备失败:', error);
    return NextResponse.json({ code: 500, message: '更新设备失败' }, { status: 500 });
  }
}

// DELETE 删除设备
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

    // 检查设备是否存在
    const existing = await prisma.equipment.findUnique({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!existing) {
      return NextResponse.json({ code: 404, message: '设备不存在' }, { status: 404 });
    }

    await prisma.equipment.update({
      where: { id: parseInt(id) },
      data: { isDelete: true, modifiedBy: user.id },
    });

    await operationLog.logSuccess(
      '设备管理',
      'delete',
      user.id,
      user.username,
      `删除设备: ${existing.equipmentName}`,
      JSON.stringify(existing),
      clientIp
    );

    return NextResponse.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除设备失败:', error);
    return NextResponse.json({ code: 500, message: '删除设备失败' }, { status: 500 });
  }
}
