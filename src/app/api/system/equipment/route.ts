import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth/jwt';
import { z } from 'zod';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';

// Schema验证
const equipmentSchema = z.object({
  equipmentCode: z.string().min(1, '设备编码不能为空'),
  equipmentName: z.string().min(1, '设备名称不能为空'),
  teamId: z.number().optional().nullable(),
  equipmentType: z.string().optional(),
  parameters: z.string().optional(), // JSON格式
  brand: z.string().optional(),
  model: z.string().optional(),
  status: z.string().optional(),
  remark: z.string().optional(),
});

// GET 获取设备列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const teamId = searchParams.get('teamId');
    const status = searchParams.get('status');

    const where: any = { isDelete: false };
    
    if (keyword) {
      where.OR = [
        { equipmentCode: { contains: keyword } },
        { equipmentName: { contains: keyword } },
        { brand: { contains: keyword } },
      ];
    }
    
    if (teamId) {
      where.teamId = parseInt(teamId);
    }

    if (status) {
      where.status = status;
    }

    const equipments = await prisma.equipment.findMany({
      where,
      include: {
        team: { select: { id: true, teamName: true } },
      },
      orderBy: [{ equipmentCode: 'asc' }],
    });

    return NextResponse.json({ code: 200, message: 'success', data: equipments });
  } catch (error) {
    console.error('获取设备列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取设备列表失败' }, { status: 500 });
  }
}

// POST 创建设备
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = equipmentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        code: 400, 
        message: validationResult.error.errors[0].message 
      }, { status: 400 });
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 检查设备编码是否已存在
    const existing = await prisma.equipment.findFirst({
      where: { equipmentCode: data.equipmentCode, isDelete: false },
    });

    if (existing) {
      return NextResponse.json({ code: 400, message: '设备编码已存在' }, { status: 400 });
    }

    const equipment = await prisma.equipment.create({
      data: {
        equipmentCode: data.equipmentCode,
        equipmentName: data.equipmentName,
        teamId: data.teamId,
        equipmentType: data.equipmentType || 'other',
        parameters: data.parameters,
        brand: data.brand,
        model: data.model,
        status: data.status || 'active',
        remark: data.remark,
        createdBy: user.id,
      },
    });

    await operationLog.logSuccess(
      '设备管理',
      'create',
      user.id,
      user.username,
      `创建设备: ${data.equipmentName}`,
      JSON.stringify(data),
      clientIp
    );

    return NextResponse.json({ code: 200, message: '创建成功', data: equipment });
  } catch (error) {
    console.error('创建设备失败:', error);
    return NextResponse.json({ code: 500, message: '创建设备失败' }, { status: 500 });
  }
}
