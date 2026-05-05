import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { z } from 'zod';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';

// Schema验证
const teamSchema = z.object({
  teamCode: z.string().min(1, '班组编码不能为空'),
  teamName: z.string().min(1, '班组名称不能为空'),
  deptId: z.number().optional(),
  leaderId: z.number().optional(),
  teamType: z.string().optional(),
  status: z.string().optional(),
  remark: z.string().optional(),
});

// GET 获取班组列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status');

    const where: any = { isDelete: false };
    
    if (keyword) {
      where.OR = [
        { teamCode: { contains: keyword } },
        { teamName: { contains: keyword } },
      ];
    }
    
    if (status) {
      where.status = status;
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        dept: { select: { id: true, deptName: true } },
        leader: { select: { id: true, realName: true } },
        _count: { select: { workers: true, equipments: true } },
      },
      orderBy: [{ teamCode: 'asc' }],
    });

    return NextResponse.json({ code: 200, message: 'success', data: teams });
  } catch (error) {
    console.error('获取班组列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取班组列表失败' }, { status: 500 });
  }
}

// POST 创建班组
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

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

    // 检查班组编码是否已存在
    const existing = await prisma.team.findFirst({
      where: { teamCode: data.teamCode, isDelete: false },
    });

    if (existing) {
      return NextResponse.json({ code: 400, message: '班组编码已存在' }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        teamCode: data.teamCode,
        teamName: data.teamName,
        deptId: data.deptId,
        leaderId: data.leaderId,
        teamType: data.teamType || 'processing',
        status: data.status || 'active',
        remark: data.remark,
        createdBy: user.id,
      },
    });

    await operationLog.logSuccess(
      '班组管理',
      'create',
      user.id,
      user.username,
      `创建班组: ${data.teamName}`,
      JSON.stringify(data),
      clientIp
    );

    return NextResponse.json({ code: 200, message: '创建成功', data: team });
  } catch (error) {
    console.error('创建班组失败:', error);
    return NextResponse.json({ code: 500, message: '创建班组失败' }, { status: 500 });
  }
}
