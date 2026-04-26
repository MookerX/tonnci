// =============================================================================
// 腾曦生产管理系统 - 系统初始化检查API
// 描述: 检查系统是否已完成初始化，以及测试数据库连接
// =============================================================================

import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { successResponse, serverErrorResponse, errorResponse } from '@/lib/response';

export async function GET(request: NextRequest) {
  // 创建临时Prisma客户端测试连接
  let tempPrisma: PrismaClient | null = null;
  
  try {
    // 从环境变量获取数据库连接
    const dbUrl = process.env.DATABASE_URL || 'mysql://tengxi:Tengxi@2024@localhost:3306/tengxi_pms';
    
    tempPrisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });

    // 查询系统初始化状态
    const initStatus = await tempPrisma.systemInitStatus.findFirst({
      orderBy: { id: 'desc' },
    });

    // 如果没有初始化记录，返回未初始化状态
    if (!initStatus) {
      return successResponse({
        isInitialized: false,
        message: '系统尚未初始化，请完成初始化配置',
        steps: [
          { step: 1, name: '数据库配置', completed: false },
          { step: 2, name: '存储配置', completed: false },
          { step: 3, name: '管理员账号', completed: false },
          { step: 4, name: '基础参数', completed: false },
        ],
      });
    }

    return successResponse({
      isInitialized: initStatus.stepStatus === 'completed',
      initializedAt: initStatus.completedAt,
      message: '系统已初始化',
    });
  } catch (error: any) {
    console.error('Init check error:', error);
    
    // 如果是数据库连接错误，返回友好提示
    if (error.message?.includes('Can\'t reach database server') || 
        error.message?.includes('P1001') ||
        error.message?.includes('ECONNREFUSED')) {
      return errorResponse(503, '数据库服务不可用，请检查数据库配置');
    }
    
    return serverErrorResponse('检查初始化状态失败');
  } finally {
    if (tempPrisma) {
      await tempPrisma.$disconnect();
    }
  }
}

// 测试数据库连接
export async function POST(request: NextRequest) {
  let tempPrisma: PrismaClient | null = null;
  
  try {
    const body = await request.json();
    const { host, port, username, password, database } = body;

    // 验证必填参数
    if (!host || !port || !username || !password || !database) {
      return errorResponse(400, '请填写完整的数据库配置信息');
    }

    // 构建数据库连接URL
    const dbUrl = `mysql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    console.log('[DB Test] Testing connection to:', `${host}:${port}/${database}`);

    // 创建临时Prisma客户端
    tempPrisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });

    // 尝试执行简单查询测试连接
    await tempPrisma.$connect();
    
    // 测试查询
    await tempPrisma.systemInitStatus.findFirst({
      orderBy: { id: 'desc' },
    });

    console.log('[DB Test] Connection successful!');

    return successResponse({
      success: true,
      message: '数据库连接成功',
    });
  } catch (error: any) {
    console.error('[DB Test] Connection failed:', error);
    
    // 分析错误类型
    let errorMessage = '数据库连接失败';
    
    if (error.message?.includes('Can\'t reach database server') ||
        error.message?.includes('P1001') ||
        error.message?.includes('ECONNREFUSED')) {
      errorMessage = '无法连接到数据库服务器，请检查主机地址和端口是否正确';
    } else if (error.message?.includes('Access denied')) {
      errorMessage = '数据库用户名或密码错误';
    } else if (error.message?.includes('Unknown database')) {
      errorMessage = '数据库不存在，请先创建数据库';
    } else if (error.message?.includes('Too many connections')) {
      errorMessage = '数据库连接数已满，请稍后重试';
    }

    return errorResponse(400, errorMessage);
  } finally {
    if (tempPrisma) {
      await tempPrisma.$disconnect();
    }
  }
}
