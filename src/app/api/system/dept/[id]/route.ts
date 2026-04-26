// =============================================================================
// 腾曦生产管理系统 - 部门详情/修改/删除API
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  successResponse, 
  badRequestResponse, 
  notFoundResponse,
  serverErrorResponse 
} from '@/lib/response';
import { requireAuth } from '@/lib/auth/middleware';
import { operationLog } from '@/lib/services/operation-log';
import { getClientIp } from '@/lib/utils';
import { z } from 'zod';

const updateDeptSchema = z.object({
  deptName: z.string().min(1).optional(),
  parentId: z.number().int().positive().optional().nullable(),
  deptSort: z.number().int().min(0).optional(),
  leaderId: z.number().int().positive().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  deptStatus: z.enum(['active', 'disabled']).optional(),
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

    const department = await prisma.department.findUnique({
      where: { id: deptId, isDelete: false },
      include: {
        leader: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    if (!department) {
      return notFoundResponse('部门不存在');
    }

    // 获取子部门数量
    const childCount = await prisma.department.count({
      where: { parentId: deptId, isDelete: false },
    });

    // 获取用户数量
    const userCount = await prisma.user.count({
      where: { deptId: deptId, isDelete: false },
    });

    return successResponse({
      ...department,
      childCount,
      userCount,
    });

  } catch (error) {
    console.error('Get department detail error:', error);
    return serverErrorResponse('获取部门详情失败');
  }
}

// =============================================================================
// 修改部门
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

    const auth = authResult;
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
      return badRequestResponse('参数验证失败');
    }

    const data = validationResult.data;

    // 检查部门是否存在
    const existing = await prisma.department.findUnique({
      where: { id: deptId, isDelete: false },
    });

    if (!existing) {
      return notFoundResponse('部门不存在');
    }

    // 不能将自己设为父部门
    if (data.parentId === deptId) {
      return badRequestResponse('不能将自己设为父部门');
    }

    // 不能将父部门设为自己的子部门
    if (data.parentId) {
      const parent = await prisma.department.findUnique({
        where: { id: data.parentId, isDelete: false },
      });
      if (parent && parent.deptPath.includes(`/${deptId}/`)) {
        return badRequestResponse('不能将子部门设为父部门');
      }
    }

    // 构建更新数据
    const updateData: any = {
      updatedBy: auth.userId,
      updatedAt: new Date(),
    };

    if (data.deptName !== undefined) updateData.deptName = data.deptName;
    if (data.deptSort !== undefined) updateData.deptSort = data.deptSort;
    if (data.leaderId !== undefined) updateData.leaderId = data.leaderId;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.deptStatus !== undefined) updateData.deptStatus = data.deptStatus;
    if (data.remark !== undefined) updateData.remark = data.remark;

    // 处理层级变化
    if (data.parentId !== undefined && data.parentId !== existing.parentId) {
      if (data.parentId) {
        const parent = await prisma.department.findUnique({
          where: { id: data.parentId, isDelete: false },
        });
        if (!parent) {
          return notFoundResponse('父部门不存在');
        }
        updateData.deptLevel = parent.deptLevel + 1;
        updateData.deptPath = `${parent.deptPath}/${parent.id}`;
      } else {
        updateData.deptLevel = 1;
        updateData.deptPath = '/0';
      }
    }

    const updated = await prisma.department.update({
      where: { id: deptId },
      data: updateData,
    });

    // 记录日志
    await operationLog.logUpdate(
      '部门管理',
      auth.userId,
      auth.username,
      existing,
      updated,
      getClientIp(request)
    );

    return successResponse(updated, '部门更新成功');

  } catch (error) {
    console.error('Update department error:', error);
    return serverErrorResponse('更新部门失败');
  }
}

// =============================================================================
// 删除部门（单个）
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

    const auth = authResult;
    const { id } = await params;
    const deptId = parseInt(id);

    if (isNaN(deptId)) {
      return badRequestResponse('无效的部门ID');
    }

    const department = await prisma.department.findUnique({
      where: { id: deptId, isDelete: false },
    });

    if (!department) {
      return notFoundResponse('部门不存在');
    }

    // 检查是否有子部门
    const hasChildren = await prisma.department.findFirst({
      where: { parentId: deptId, isDelete: false },
    });

    if (hasChildren) {
      return badRequestResponse('请先删除子部门');
    }

    // 检查是否有关联用户
    const hasUsers = await prisma.user.findFirst({
      where: { deptId: deptId, isDelete: false },
    });

    if (hasUsers) {
      return badRequestResponse('请先移除部门下的用户');
    }

    // 执行软删除
    await prisma.department.update({
      where: { id: deptId },
      data: {
        isDelete: true,
        updatedBy: auth.userId,
        updatedAt: new Date(),
      },
    });

    await operationLog.logDelete(
      '部门管理',
      auth.userId,
      auth.username,
      department,
      getClientIp(request)
    );

    return successResponse(null, '部门删除成功');

  } catch (error) {
    console.error('Delete department error:', error);
    return serverErrorResponse('删除部门失败');
  }
}
