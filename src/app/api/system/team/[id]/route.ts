import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { z } from 'zod';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';

const teamSchema = z.object({
  teamCode: z.string().min(1, '班组编码不能为空'),
  teamName: z.string().min(1, '班组名称不能为空'),
  deptId: z.number().optional().nullable(),
  leaderId: z.number().optional().nullable(),
  teamType: z.string().optional(),
  status: z.string().optional(),
  remark: z.string().optional(),
});

// GET 获取单个班组详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team = await prisma.team.findUnique({
      where: { id: parseInt(id), isDelete: false },
      include: {
        dept: { select: { id: true, deptName: true } },
        leader: { select: { id: true, realName: true } },
        workers: {
          where: { isDelete: false },
          select: { id: true, workerCode: true, realName: true },
        },
        equipments: {
          where: { isDelete: false },
          select: { id: true, equipmentCode: true, equipmentName: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ code: 404, message: '班组不存在' }, { status: 404 });
    }

    return NextResponse.json({ code: 200, message: 'success', data: team });
  } catch (error) {
    console.error('获取班组详情失败:', error);
    return NextResponse.json({ code: 500, message: '获取班组详情失败' }, { status: 500 });
  }
}

// PUT 更新班组
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
    const validationResult = teamSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        code: 400, 
        message: validationResult.error.errors[0].message 
      }, { status: 400 });
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查班组是否存在
    const existing = await prisma.team.findUnique({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!existing) {
      return NextResponse.json({ code: 404, message: '班组不存在' }, { status: 404 });
    }

    // 检查班组编码是否被其他班组使用
    if (data.teamCode !== existing.teamCode) {
      const codeExists = await prisma.team.findFirst({
        where: { teamCode: data.teamCode, isDelete: false, id: { not: parseInt(id) } },
      });

      if (codeExists) {
        return NextResponse.json({ code: 400, message: '班组编码已存在' }, { status: 400 });
      }
    }

    // 获取更新前的数据
    const oldData = {
      teamCode: existing.teamCode,
      teamName: existing.teamName,
      deptId: existing.deptId,
      leaderId: existing.leaderId,
      status: existing.status,
    };

    const team = await prisma.team.update({
      where: { id: parseInt(id) },
      data: {
        teamCode: data.teamCode,
        teamName: data.teamName,
        deptId: data.deptId,
        leaderId: data.leaderId,
        teamType: data.teamType,
        status: data.status,
        remark: data.remark,
        modifiedBy: user.id,
      },
    });

    await operationLog.logSuccess(
      '班组管理',
      'update',
      user.id,
      user.username,
      `更新班组: ${data.teamName}`,
      JSON.stringify({ oldData, newData: data }),
      clientIp
    );

    return NextResponse.json({ code: 200, message: '更新成功', data: team });
  } catch (error) {
    console.error('更新班组失败:', error);
    return NextResponse.json({ code: 500, message: '更新班组失败' }, { status: 500 });
  }
}

// DELETE 删除班组
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

    // 检查班组是否存在
    const existing = await prisma.team.findUnique({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!existing) {
      return NextResponse.json({ code: 404, message: '班组不存在' }, { status: 404 });
    }

    // 检查是否有员工关联
    const workerCount = await prisma.worker.count({
      where: { teamId: parseInt(id), isDelete: false },
    });

    if (workerCount > 0) {
      return NextResponse.json({ 
        code: 400, 
        message: `该班组下有 ${workerCount} 名员工，无法删除` 
      }, { status: 400 });
    }

    // 检查是否有设备关联
    const equipmentCount = await prisma.equipment.count({
      where: { teamId: parseInt(id), isDelete: false },
    });

    if (equipmentCount > 0) {
      return NextResponse.json({ 
        code: 400, 
        message: `该班组下有 ${equipmentCount} 台设备，无法删除` 
      }, { status: 400 });
    }

    await prisma.team.update({
      where: { id: parseInt(id) },
      data: { isDelete: true, modifiedBy: user.id },
    });

    await operationLog.logSuccess(
      '班组管理',
      'delete',
      user.id,
      user.username,
      `删除班组: ${existing.teamName}`,
      JSON.stringify(existing),
      clientIp
    );

    return NextResponse.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除班组失败:', error);
    return NextResponse.json({ code: 500, message: '删除班组失败' }, { status: 500 });
  }
}
