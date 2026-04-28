// =============================================================================
// 腾曦生产管理系统 - 部门详情/更新/删除API
// 描述: 部门CRUD操作
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, badRequestResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getClientIp } from '@/lib/utils';
import { operationLog } from '@/lib/services/operation-log';
import { z } from 'zod';

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
// 获取部门详情
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const deptId = parseInt(id);

    if (isNaN(deptId)) {
      return badRequestResponse('无效的部门ID');
    }

    const dept = await prisma.dept.findUnique({
      where: { id: deptId, isDelete: false },
    });

    if (!dept) {
      return notFoundResponse('部门不存在');
    }

    // 获取子部门数量
    const childCount = await prisma.dept.count({
      where: { parentId: deptId, isDelete: false },
    });

    // 获取用户数量
    const userCount = await prisma.user.count({
      where: { deptId: deptId, isDelete: false },
    });

    // 获取父部门信息
    const parentDept = dept.parentId ? await prisma.dept.findUnique({
      where: { id: dept.parentId, isDelete: false },
      select: { id: true, deptName: true },
    }) : null;

    return successResponse({
      ...dept,
      childCount,
      userCount,
      parent: parentDept,
    });

  } catch (error: any) {
    console.error('Get dept detail error:', error);
    return serverErrorResponse(error.message);
  }
}

// =============================================================================
// 更新部门
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const deptId = parseInt(id);

    if (isNaN(deptId)) {
      return badRequestResponse('无效的部门ID');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = updateDeptSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues?.[0]?.message || '参数验证失败');
    }

    const data = validationResult.data;
    const clientIp = getClientIp(request);

    const existingDept = await prisma.dept.findUnique({
      where: { id: deptId, isDelete: false },
    });

    if (!existingDept) {
      return notFoundResponse('部门不存在');
    }

    // 不能将自己设置为自己的子部门
    if (data.parentId === deptId) {
      return errorResponse(400, '不能将自己设置为父部门');
    }

    // 不能将自己的子部门设置为父部门（避免循环）
    if (data.parentId) {
      const getAllChildIds = async (parentId: number): Promise<number[]> => {
        const children = await prisma.dept.findMany({
          where: { parentId, isDelete: false },
          select: { id: true },
        });
        let ids: number[] = children.map(c => c.id);
        for (const child of children) {
          ids = [...ids, ...await getAllChildIds(child.id)];
        }
        return ids;
      };

      const childIds = await getAllChildIds(deptId);
      if (childIds.includes(data.parentId)) {
        return errorResponse(400, '不能将自己或子部门设置为父部门');
      }
    }

    // 检查部门代码是否与其他部门冲突
    if (data.deptCode) {
      const existing = await prisma.dept.findFirst({
        where: { 
          deptCode: data.deptCode, 
          isDelete: false,
          id: { not: deptId },
        },
      });
      if (existing) {
        return errorResponse(400, '部门代码已存在');
      }
    }

    const updateData: any = {
      modifiedBy: authResult.userId,
    };

    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.deptName !== undefined) updateData.deptName = data.deptName;
    if (data.deptCode !== undefined) updateData.deptCode = data.deptCode;
    if (data.leaderName !== undefined) updateData.leaderName = data.leaderName;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remark !== undefined) updateData.remark = data.remark;

    const updated = await prisma.dept.update({
      where: { id: deptId },
      data: updateData,
    });

    await operationLog.logUpdate(
      '部门管理',
      authResult.userId,
      authResult.username,
      { id: existingDept.id, deptName: existingDept.deptName },
      { id: updated.id, deptName: updated.deptName },
      clientIp
    );

    return successResponse({ id: updated.id, deptName: updated.deptName }, '部门更新成功');

  } catch (error: any) {
    console.error('Update dept error:', error);
    return serverErrorResponse(error.message);
  }
}

// =============================================================================
// 删除部门（软删除）
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const deptId = parseInt(id);

    if (isNaN(deptId)) {
      return badRequestResponse('无效的部门ID');
    }

    const clientIp = getClientIp(request);

    const existingDept = await prisma.dept.findUnique({
      where: { id: deptId, isDelete: false },
    });

    if (!existingDept) {
      return notFoundResponse('部门不存在');
    }

    // 检查是否有子部门
    const childCount = await prisma.dept.count({
      where: { parentId: deptId, isDelete: false },
    });

    if (childCount > 0) {
      return errorResponse(400, `该部门下有 ${childCount} 个子部门，请先删除子部门`);
    }

    // 检查是否有用户
    const userCount = await prisma.user.count({
      where: { deptId: deptId, isDelete: false },
    });

    if (userCount > 0) {
      return errorResponse(400, `该部门下有 ${userCount} 个用户，请先移走用户`);
    }

    // 软删除
    await prisma.dept.update({
      where: { id: deptId },
      data: {
        isDelete: true,
        status: 'disabled',
        modifiedBy: authResult.userId,
      },
    });

    await operationLog.logDelete(
      '部门管理',
      authResult.userId,
      authResult.username,
      { id: existingDept.id, deptName: existingDept.deptName },
      clientIp
    );

    return successResponse(null, '部门删除成功');

  } catch (error: any) {
    console.error('Delete dept error:', error);
    return serverErrorResponse(error.message);
  }
}
