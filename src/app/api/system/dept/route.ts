// =============================================================================
// 腾曦生产管理系统 - 部门管理API
// 描述: 部门CRUD操作，支持树形结构
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
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

const createDeptSchema = z.object({
  deptCode: z.string().min(1, '部门编码不能为空'),
  deptName: z.string().min(1, '部门名称不能为空'),
  parentId: z.number().int().positive().optional().nullable(),
  deptSort: z.number().int().min(0).default(0),
  leaderId: z.number().int().positive().optional().nullable(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  remark: z.string().optional(),
});

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
// 获取部门列表（树形）
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const url = new URL(request.url);
    const flat = url.searchParams.get('flat') === 'true';

    // 查询所有部门
    const departments = await prisma.department.findMany({
      where: { isDelete: false },
      orderBy: [{ deptLevel: 'asc' }, { deptSort: 'asc' }],
    });

    if (flat) {
      // 返回扁平列表
      return successResponse(departments);
    }

    // 转换为树形结构
    const tree = buildDeptTree(departments);

    return successResponse(tree);

  } catch (error) {
    console.error('Get departments error:', error);
    return serverErrorResponse('获取部门列表失败');
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

    const auth = authResult;
    const clientIp = getClientIp(request);

    // 解析请求参数
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const validationResult = createDeptSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse('参数验证失败');
    }

    const data = validationResult.data;

    // 检查部门编码唯一性
    const existing = await prisma.department.findUnique({
      where: { deptCode: data.deptCode, isDelete: false },
    });

    if (existing) {
      return badRequestResponse('部门编码已存在');
    }

    // 计算部门层级和路径
    let deptLevel = 1;
    let deptPath = '/0';

    if (data.parentId) {
      const parent = await prisma.department.findUnique({
        where: { id: data.parentId, isDelete: false },
      });

      if (!parent) {
        return notFoundResponse('父部门不存在');
      }

      deptLevel = parent.deptLevel + 1;
      deptPath = `${parent.deptPath}/${parent.id}`;
    }

    // 创建部门
    const newDept = await prisma.department.create({
      data: {
        deptCode: data.deptCode,
        deptName: data.deptName,
        parentId: data.parentId || null,
        deptLevel,
        deptPath,
        deptSort: data.deptSort,
        leaderId: data.leaderId || null,
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        deptStatus: 'active',
        createdBy: auth.userId,
      },
    });

    // 记录日志
    await operationLog.logCreate('部门管理', auth.userId, auth.username, {
      id: newDept.id,
      deptCode: newDept.deptCode,
      deptName: newDept.deptName,
    }, clientIp);

    return successResponse(newDept, '部门创建成功');

  } catch (error) {
    console.error('Create department error:', error);
    return serverErrorResponse('创建部门失败');
  }
}

// =============================================================================
// 批量删除部门
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const auth = authResult;
    const clientIp = getClientIp(request);

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('请求参数格式错误');
    }

    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return badRequestResponse('请选择要删除的部门');
    }

    // 检查是否有子部门
    const hasChildren = await prisma.department.findFirst({
      where: {
        parentId: { in: ids },
        isDelete: false,
      },
    });

    if (hasChildren) {
      return badRequestResponse('请先删除子部门');
    }

    // 检查是否有关联用户
    const hasUsers = await prisma.user.findFirst({
      where: {
        deptId: { in: ids },
        isDelete: false,
      },
    });

    if (hasUsers) {
      return badRequestResponse('请先移除部门下的用户');
    }

    // 执行软删除
    await prisma.department.updateMany({
      where: { id: { in: ids }, isDelete: false },
      data: {
        isDelete: true,
        updatedBy: auth.userId,
        updatedAt: new Date(),
      },
    });

    await operationLog.log({
      moduleName: '部门管理',
      businessType: 'delete',
      operatorId: auth.userId,
      operatorName: auth.username,
      operationDesc: '批量删除部门',
      requestParams: { ids },
      ipAddress: clientIp,
      status: 'success',
    });

    return successResponse({ deletedCount: ids.length }, `成功删除 ${ids.length} 个部门`);

  } catch (error) {
    console.error('Delete departments error:', error);
    return serverErrorResponse('删除部门失败');
  }
}

// =============================================================================
// 辅助函数：构建部门树
// =============================================================================

interface DeptNode {
  id: number;
  deptCode: string;
  deptName: string;
  parentId: number | null;
  deptLevel: number;
  deptPath: string;
  children?: DeptNode[];
}

function buildDeptTree(departments: any[]): DeptNode[] {
  const map = new Map<number, DeptNode>();
  const roots: DeptNode[] = [];

  // 转换为节点
  departments.forEach(dept => {
    map.set(dept.id, { ...dept, children: [] });
  });

  // 构建树
  departments.forEach(dept => {
    const node = map.get(dept.id)!;
    if (dept.parentId && map.has(dept.parentId)) {
      map.get(dept.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
