// =============================================================================
// 腾曦生产管理系统 - 主库配置API
// 描述: 获取系统主库配置信息（只读）
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, serverErrorResponse } from '@/lib/response';

/**
 * GET /api/system/database/master - 获取主库配置信息
 * 主库配置来自系统初始化时的数据库设置，不可编辑
 */
export async function GET() {
  try {
    // 从环境变量获取主库配置
    const dbUrl = process.env.DATABASE_URL || '';
    
    // 解析数据库连接URL
    let masterConfig = {
      isMaster: true,
      isReadonly: true,
      moduleName: '系统主库',
      moduleCode: 'MASTER_DB',
      host: '',
      port: 3306,
      database: '',
      username: '',
      password: '',
      remark: '系统主库配置，来自系统初始化，不可修改',
    };

    if (dbUrl) {
      try {
        // 解析 mysql://user:password@host:port/database 格式
        const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\w+)/);
        if (urlMatch) {
          masterConfig.username = urlMatch[1];
          masterConfig.password = '******'; // 隐藏密码
          masterConfig.host = urlMatch[3];
          masterConfig.port = parseInt(urlMatch[4]);
          masterConfig.database = urlMatch[5];
        }
      } catch (e) {
        console.error('解析数据库URL失败:', e);
      }
    }

    // 如果有存储的初始化配置，也可以从这里获取
    const initConfig = await prisma.systemConfig.findFirst({
      where: { paramKey: 'db_master_config', isDelete: false },
    });

    if (initConfig?.paramValue) {
      try {
        const savedConfig = JSON.parse(initConfig.paramValue);
        masterConfig = {
          ...masterConfig,
          ...savedConfig,
          password: '******', // 始终隐藏密码
          isMaster: true,
          isReadonly: true,
        };
      } catch (e) {
        console.error('解析主库配置失败:', e);
      }
    }

    return successResponse(masterConfig);

  } catch (error: any) {
    console.error('获取主库配置失败:', error);
    return serverErrorResponse(error.message);
  }
}

/**
 * PUT /api/system/database/master - 更新主库配置（仅更新保存的配置信息，不实际修改数据库连接）
 */
export async function PUT() {
  return NextResponse.json({
    code: 403,
    message: '主库配置不可修改，如需更改请联系系统管理员',
  }, { status: 403 });
}

/**
 * DELETE /api/system/database/master - 删除主库配置（禁止）
 */
export async function DELETE() {
  return NextResponse.json({
    code: 403,
    message: '主库配置不可删除',
  }, { status: 403 });
}
