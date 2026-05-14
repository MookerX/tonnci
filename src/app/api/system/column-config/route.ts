import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

// 数据库连接配置 - 直接使用正确的值
const getDbConfig = () => ({
  host: '10.60.192.12',
  port: 3306,
  user: 'tengxi_pms_user',
  password: 'Tx@Pms2024',
  database: 'tengxi_pms',
});

// 默认列配置
const DEFAULT_COLUMNS = [
  { key: 'internalCode', label: '内部编码', width: 120, visible: true, order: 0 },
  { key: 'materialName', label: '名称', width: 150, visible: true, order: 1 },
  { key: 'drawingCode', label: '图纸编码', width: 120, visible: true, order: 2 },
  { key: 'drawingNo', label: '图号', width: 80, visible: true, order: 3 },
  { key: 'quantity', label: '单层用量', width: 70, visible: true, order: 4 },
  { key: 'materialType', label: '物料类型', width: 80, visible: true, order: 5 },
  { key: 'customerGroupName', label: '所属客户', width: 100, visible: true, order: 6 },
  { key: 'remark', label: '备注', width: 150, visible: true, order: 7 },
  { key: 'bomOwner', label: 'BOM所有者', width: 100, visible: true, order: 8 },
  { key: 'materialOwner', label: '物料所有者', width: 100, visible: true, order: 9 },
  { key: 'actions', label: '操作', width: 130, visible: true, order: 10 },
];

// 创建表（如果不存在）
async function ensureTableExists(connection: mysql.Connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS user_column_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT 0,
      page_key VARCHAR(100) NOT NULL,
      config_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_page (user_id, page_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

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
    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get('pageKey');
    
    if (!pageKey) {
      return NextResponse.json({ code: 400, message: '缺少pageKey参数' });
    }

    const userId = getUserIdFromRequest(request);
    const connection = await mysql.createConnection(getDbConfig());
    
    try {
      await ensureTableExists(connection);
      
      // 先查找用户自己的配置
      const [userRows] = await connection.execute(
        'SELECT config_json FROM user_column_config WHERE user_id = ? AND page_key = ?',
        [userId, pageKey]
      ) as [any[], any];
      
      if (userRows.length > 0) {
        const config = JSON.parse(userRows[0].config_json);
        return NextResponse.json({ code: 200, data: config });
      }
      
      // 如果用户没有配置，查找默认配置（user_id = 0）
      const [defaultRows] = await connection.execute(
        'SELECT config_json FROM user_column_config WHERE user_id = 0 AND page_key = ?',
        [pageKey]
      ) as [any[], any];
      
      if (defaultRows.length > 0) {
        const config = JSON.parse(defaultRows[0].config_json);
        return NextResponse.json({ code: 200, data: config });
      }
      
      // 如果没有任何配置，返回默认配置
      return NextResponse.json({ code: 200, data: DEFAULT_COLUMNS });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('获取列配置失败:', error);
    return NextResponse.json({ code: 500, message: '获取列配置失败', data: DEFAULT_COLUMNS });
  }
}

// POST - 保存列配置
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' });
    }

    const body = await request.json();
    const { pageKey, columns } = body;
    
    if (!pageKey || !columns) {
      return NextResponse.json({ code: 400, message: '缺少必要参数' });
    }

    const connection = await mysql.createConnection(getDbConfig());
    
    try {
      await ensureTableExists(connection);
      
      const configJson = JSON.stringify(columns);
      
      // 使用 INSERT ... ON DUPLICATE KEY UPDATE
      await connection.execute(
        `INSERT INTO user_column_config (user_id, page_key, config_json) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE config_json = ?, updated_at = NOW()`,
        [userId, pageKey, configJson, configJson]
      );
      
      return NextResponse.json({ code: 200, message: '保存成功' });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('保存列配置失败:', error);
    return NextResponse.json({ code: 500, message: '保存列配置失败' });
  }
}

// DELETE - 重置列配置
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' });
    }

    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get('pageKey');
    
    if (!pageKey) {
      return NextResponse.json({ code: 400, message: '缺少pageKey参数' });
    }

    const connection = await mysql.createConnection(getDbConfig());
    
    try {
      await connection.execute(
        'DELETE FROM user_column_config WHERE user_id = ? AND page_key = ?',
        [userId, pageKey]
      );
      
      return NextResponse.json({ code: 200, message: '重置成功', data: DEFAULT_COLUMNS });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('重置列配置失败:', error);
    return NextResponse.json({ code: 500, message: '重置列配置失败' });
  }
}
