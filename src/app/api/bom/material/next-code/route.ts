import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, serverErrorResponse } from '@/lib/response';
import { z } from 'zod';

const schema = z.object({
  materialType: z.string(),
});

const TYPE_PREFIX: Record<string, string> = {
  part: 'P',        // 零件
  component: 'C',   // 组件
  material: 'R',    // 原材料
  purchased: 'B',   // 外购件
  standard: 'S',    // 标准件
  auxiliary: 'A',   // 辅材
};

/** POST /api/bom/material/next-code - 获取下一个内部编码 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialType } = schema.parse(body);

    const prefix = TYPE_PREFIX[materialType] || 'P';

    // 查询该前缀的最大编码
    const maxCode = await prisma.$queryRawUnsafe<{ maxCode: string | null }[]>(
      `SELECT MAX(internal_code) as maxCode FROM material WHERE internal_code LIKE ?`,
      prefix + '%'
    );

    let nextNum = 1;
    if (maxCode[0]?.maxCode) {
      const numStr = maxCode[0].maxCode.slice(prefix.length);
      nextNum = parseInt(numStr) + 1;
    }

    const internalCode = `${prefix}${String(nextNum).padStart(8, '0')}`;
    return successResponse(internalCode);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return NextResponse.json({ code: 400, message: '参数错误', data: null });
    }
    console.error('生成内部编码失败:', e);
    return serverErrorResponse('生成内部编码失败');
  }
}
