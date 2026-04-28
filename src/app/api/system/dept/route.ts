// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// =============================================================================
// 腾曦生产管理系统 - 部门管理API
// 描述: 部门树形结构CRUD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, paginatedResponse, badRequestResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getDataScopeFilterFromAuth } from '@/lib/services/data-scope';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { z } from 'zod';

const createDeptSchema = z.object({
  parentId: z.number().int().positive().optional().nullable(),
  deptName: z.string().min(1, '部门名称不能为空').max(100),
  deptCode: z.string().max(50).optional().nullable(),
  leaderName: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  status: z.enum(['active', 'disabled']).optional().default('active'),
  remark: z.string().optional().nullable(),
});

const updateDeptSchema = z.object({
  parentId: z.number().int().positive().optional().nullable(),
  deptName: z.string().min(1, '部门名称不能为空').max(100).optional(),
  deptCode: z.string().max(50).optional().nullable(),
  leaderName: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().optional(),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().optional().nullable(),
});

// =============================================================================
// 获取部门树形结构
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'tree'; // tree=树形, list=列表

    // 获取所有部门
    const depts = await prisma.dept.findMany({
      where: { isDelete: false },
      select: {
        id: true,
        parentId: true,
        deptName: true,
        deptCode: true,
        leaderName: true,
        sortOrder: true,
        status: true,
        remark: true,
        createdAt: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    // 获取每个部门的用户数量
    const users = await prisma.user.findMany({
      where: { isDelete: false, deptId: { not: null } },
      select: { deptId: true },
    });

    const userCountMap = new Map<number, number>();
    users.forEach(u => {
      if (u.deptId) {
        userCountMap.set(u.deptId, (userCountMap.get(u.deptId) || 0) + 1);
      }
    });

    const deptsWithCount = depts.map(d => ({
      ...d,
      userCount: userCountMap.get(d.id) || 0,
    }));

    // 数据范围过滤：根据角色的 dataScope 限制可见部门
    const scopeFilter = await getDataScopeFilterFromAuth(authResult);
    let filteredDepts = deptsWithCount;
    if (!scopeFilter.isAll && scopeFilter.allowedDeptIds.length > 0) {
      const allowed = new Set(scopeFilter.allowedDeptIds);
      // 确保祖先部门也可见（树形结构需要完整路径）
      const deptMap = new Map(deptsWithCount.map(d => [d.id, d]));
      const visibleIds = new Set<number>();
      for (const id of allowed) {
        visibleIds.add(id);
        // 向上追溯祖先部门
        let current = deptMap.get(id);
        while (current?.parentId) {
          visibleIds.add(current.parentId);
          current = deptMap.get(current.parentId);
        }
      }
      filteredDepts = deptsWithCount.filter(d => visibleIds.has(d.id));
    }

    if (type === 'list') {
      return successResponse(filteredDepts);
    }

    // 构建树形结构
    const buildTree = (parentId: number | null): any[] => {
      return filteredDepts
        .filter(d => d.parentId === parentId)
        .map(d => ({
          ...d,
          children: buildTree(d.id),
        }));
    };

    const tree = buildTree(null);

    return successResponse(tree);

  } catch (error: any) {
    console.error('Get depts error:', error);
    return serverErrorResponse('查询部门列表失败');
  }
}

// =============================================================================
// 创建部门
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = createDeptSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues?.[0]?.message || '参数验证失败');
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    // 如果设置了父部门，检查父部门是否存在
    if (data.parentId) {
      const parentDept = await prisma.dept.findUnique({
        where: { id: data.parentId, isDelete: false },
      });
      if (!parentDept) {
        return badRequestResponse('父部门不存在');
      }
    }

    // 检查部门代码是否已存在（如果提供了）
    if (data.deptCode) {
      const existing = await prisma.dept.findFirst({
        where: { deptCode: data.deptCode, isDelete: false },
      });
      if (existing) {
        return errorResponse(400, '部门代码已存在');
      }
    }

    const dept = await prisma.dept.create({
      data: {
        parentId: data.parentId || null,
        deptName: data.deptName,
        deptCode: data.deptCode || null,
        leaderName: data.leaderName || null,
        sortOrder: data.sortOrder,
        status: data.status,
        remark: data.remark || null,
        createdBy: authResult.userId,
      },
    });

    await operationLog.logCreate(
      '部门管理',
      authResult.userId,
      authResult.username,
      { id: dept.id, deptName: dept.deptName },
      clientIp
    );

    return successResponse({ id: dept.id, deptName: dept.deptName }, '部门创建成功');

  } catch (error: any) {
    console.error('Create dept error:', error);
    return serverErrorResponse(error.message);
  }
}
