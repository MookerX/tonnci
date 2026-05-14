import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// 确保表存在
async function ensureTableExists() {
  try {
    // 尝试查询表，如果表不存在会抛出错误
    await prisma.$executeRaw`SELECT 1 FROM user_column_config LIMIT 1`;
  } catch (error: any) {
    // 检查是否是表不存在的错误
    const isTableNotExist = 
      error.code === 'P2010' || 
      error.code === 'P2021' ||
      error.message?.includes("doesn't exist") ||
      error.message?.includes('does not exist');
    
    if (isTableNotExist) {
      console.log('[ColumnConfig] 表不存在，正在创建 user_column_config 表...');
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS user_column_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            page_key VARCHAR(100) NOT NULL,
            config TEXT NOT NULL,
            is_default BOOLEAN NOT NULL DEFAULT false,
            isDelete BOOLEAN NOT NULL DEFAULT false,
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at DATETIME(3) NOT NULL,
            INDEX idx_user (user_id),
            INDEX idx_page (page_key),
            UNIQUE INDEX user_column_config_user_id_page_key_key (user_id, page_key)
          ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('[ColumnConfig] 表创建成功');
      } catch (createError: any) {
        console.error('[ColumnConfig] 创建表失败:', createError.message);
        throw createError;
      }
    } else {
      console.error('[ColumnConfig] 检查表存在失败:', error.message);
      throw error;
    }
  }
}

// 默认列配置 - 与前端 page.tsx 保持一致
const DEFAULT_COLUMNS = [
  { key: 'expand', label: '', width: 32, visible: true, order: 0 },
  { key: 'internalCode', label: '内部编码', width: 100, visible: true, order: 1 },
  { key: 'materialName', label: '物料名称', width: 150, visible: true, order: 2 },
  { key: 'drawingCode', label: '图纸编码', width: 100, visible: true, order: 3 },
  { key: 'drawingNo', label: '图号', width: 80, visible: true, order: 4 },
  { key: 'quantity', label: '单层用量', width: 70, visible: true, order: 5 },
  { key: 'materialType', label: '物料类型', width: 80, visible: true, order: 6 },
  { key: 'customerGroupName', label: '所属客户', width: 100, visible: true, order: 7 },
  { key: 'remark', label: '备注', width: 150, visible: true, order: 8 },
  { key: 'bomOwner', label: 'BOM所有者', width: 90, visible: true, order: 9 },
  { key: 'materialOwner', label: '物料所有者', width: 90, visible: true, order: 10 },
  { key: 'actions', label: '操作', width: 128, visible: true, order: 11 },
];

// 从请求头获取用户ID
function getUserIdFromRequest(request: NextRequest): number {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return 0; // 返回0表示未登录用户
  }
  const token = authHeader.substring(7);
  try {
    // 使用与系统其他部分一致的默认密钥
    const secret = process.env.JWT_SECRET || 'tengxi-production-system-secret-key-2024';
    const decoded = jwt.verify(token, secret) as { userId?: number; id?: number; sub?: string };
    // 支持多种格式: userId, id, 或 sub
    return decoded.userId || decoded.id || (decoded.sub ? parseInt(decoded.sub) : 0);
  } catch {
    return 0;
  }
}

// GET - 获取列配置
export async function GET(request: NextRequest) {
  try {
    // 确保表存在
    await ensureTableExists();
    
    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get('pageKey');
    
    if (!pageKey) {
      return NextResponse.json({ code: 400, message: '缺少pageKey参数' });
    }

    const userId = getUserIdFromRequest(request);
    
    // 先查找用户自己的配置
    const userConfig = await prisma.userColumnConfig.findFirst({
      where: {
        userId,
        pageKey,
        isDelete: false
      }
    });
    
    if (userConfig) {
      const config = JSON.parse(userConfig.config);
      return NextResponse.json({ code: 200, data: config });
    }
    
    // 如果用户没有配置，查找默认配置（userId 为 null）
    const defaultConfig = await prisma.userColumnConfig.findFirst({
      where: {
        userId: null,
        pageKey,
        isDelete: false
      }
    });
    
    if (defaultConfig) {
      const config = JSON.parse(defaultConfig.config);
      return NextResponse.json({ code: 200, data: config });
    }
    
    // 如果没有任何配置，返回默认配置
    return NextResponse.json({ code: 200, data: DEFAULT_COLUMNS });
  } catch (error) {
    console.error('获取列配置失败:', error);
    return NextResponse.json({ code: 500, message: '获取列配置失败', data: DEFAULT_COLUMNS });
  }
}

// POST - 保存列配置
export async function POST(request: NextRequest) {
  try {
    // 确保表存在
    await ensureTableExists();
    
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' });
    }

    const body = await request.json();
    const { pageKey, columns } = body;
    
    if (!pageKey || !columns) {
      return NextResponse.json({ code: 400, message: '缺少必要参数' });
    }

    const config = JSON.stringify(columns);
    
    // 查找是否已有配置（包括已删除的）
    const existing = await prisma.userColumnConfig.findFirst({
      where: { userId, pageKey }
    });
    
    if (existing) {
      // 更新现有配置
      await prisma.userColumnConfig.update({
        where: { id: existing.id },
        data: {
          config,
          isDelete: false,
          updatedAt: new Date()
        }
      });
    } else {
      // 创建新配置
      await prisma.userColumnConfig.create({
        data: {
          userId,
          pageKey,
          config,
          isDefault: false
        }
      });
    }
    
    return NextResponse.json({ code: 200, message: '保存成功' });
  } catch (error) {
    console.error('保存列配置失败:', error);
    return NextResponse.json({ code: 500, message: '保存列配置失败' });
  }
}

// DELETE - 重置列配置
export async function DELETE(request: NextRequest) {
  try {
    // 确保表存在
    await ensureTableExists();
    
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' });
    }

    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get('pageKey');
    
    if (!pageKey) {
      return NextResponse.json({ code: 400, message: '缺少pageKey参数' });
    }

    // 先查找配置
    const existing = await prisma.userColumnConfig.findFirst({
      where: { userId, pageKey, isDelete: false }
    });
    
    if (existing) {
      // 软删除
      await prisma.userColumnConfig.update({
        where: { id: existing.id },
        data: { isDelete: true }
      });
    }
    
    return NextResponse.json({ code: 200, message: '重置成功', data: DEFAULT_COLUMNS });
  } catch (error) {
    console.error('重置列配置失败:', error);
    return NextResponse.json({ code: 500, message: '重置列配置失败' });
  }
}
