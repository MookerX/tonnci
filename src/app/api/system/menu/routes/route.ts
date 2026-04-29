import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const DASHBOARD_DIR = join(process.cwd(), 'src/app/dashboard');

/**
 * 扫描 dashboard 目录下的所有 page.tsx，生成路由路径
 */
async function scanRoutes(dir: string, basePath: string = ''): Promise<string[]> {
  const routes: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // 跳过非路由目录
        if (['api', 'layout.tsx', 'loading.tsx', 'error.tsx', 'not-found.tsx', 'favicon.ico'].includes(entry.name)) {
          continue;
        }
        // 检查是否有 page.tsx
        const pagePath = join(fullPath, 'page.tsx');
        try {
          await readFile(pagePath, 'utf8');
          // 有 page.tsx，说明当前目录是一个路由
          const routePath = `/dashboard${basePath}/${entry.name}`;
          routes.push(routePath);
          // 继续扫描子路由
          const childRoutes = await scanRoutes(fullPath, `${basePath}/${entry.name}`);
          routes.push(...childRoutes);
        } catch {
          // 没有 page.tsx，继续作为目录扫描
          const childRoutes = await scanRoutes(fullPath, `${basePath}/${entry.name}`);
          routes.push(...childRoutes);
        }
      }
    }
  } catch {
    // 目录不存在或无法读取
  }
  return routes;
}

/**
 * GET /api/system/menu/routes
 * 获取所有路由（含文件系统和数据库），标注入库状态
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ code: 401, message: '未登录', data: null });
    }

    // 1. 扫描文件系统获取所有路由
    const fsRoutes = await scanRoutes(DASHBOARD_DIR);
    // dashboard 目录本身也是路由
    fsRoutes.unshift('/dashboard');
    // 去重
    const uniqueFsRoutes = [...new Set(fsRoutes)].sort();

    // 2. 获取数据库中已有的路由
    const dbMenus = await prisma.menu.findMany({
      where: { isDelete: false },
      select: { id: true, menuName: true, path: true, menuType: true, icon: true, visible: true, sortOrder: true, parentId: true },
    });

    // 3. 合并：以文件系统路由为主，标注是否在数据库中
    const dbRouteSet = new Map(dbMenus.map(m => [m.path, m]));

    const result = uniqueFsRoutes.map(routePath => {
      const dbMenu = dbRouteSet.get(routePath);
      return {
        path: routePath,
        inDb: !!dbMenu,
        menuId: dbMenu?.id ?? null,
        menuName: dbMenu?.menuName ?? null,
        menuType: dbMenu?.menuType ?? null,
        icon: dbMenu?.icon ?? null,
        visible: dbMenu?.visible ?? null,
        sortOrder: dbMenu?.sortOrder ?? null,
        parentId: dbMenu?.parentId ?? null,
      };
    });

    return NextResponse.json({ code: 200, message: 'success', data: result });
  } catch (error) {
    console.error('获取路由列表失败', error);
    return NextResponse.json({ code: 500, message: '获取路由列表失败', data: null });
  }
}
