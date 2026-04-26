// =============================================================================
// 腾曦生产管理系统 - 菜单管理API
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';

// 获取菜单列表
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    
    const list = await prisma.menu.findMany({
      where: { isDelete: false },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    });
    
    return NextResponse.json({ code: 200, message: '获取成功', data: list });
  } catch (error) {
    console.error('获取菜单列表失败:', error);
    return NextResponse.json({ code: 500, message: '服务器错误', data: null }, { status: 500 });
  }
}

// 创建菜单
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    
    const body = await request.json();
    const { userId } = auth;
    
    const menu = await prisma.menu.create({
      data: {
        menuName: body.menuName,
        menuCode: body.menuCode,
        parentId: body.parentId || 0,
        path: body.path || '',
        component: body.component || '',
        icon: body.icon || '',
        sortOrder: body.sortOrder || 0,
        menuType: body.menuType || 'menu',
        status: body.status || 'active',
        createdBy: userId,
      },
    });
    
    return NextResponse.json({ code: 200, message: '创建成功', data: menu });
  } catch (error) {
    console.error('创建菜单失败:', error);
    return NextResponse.json({ code: 500, message: '服务器错误', data: null }, { status: 500 });
  }
}
