import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, serverErrorResponse } from '@/lib/response';
import { z } from 'zod';

const schema = z.object({
  materialType: z.string(),
});

const TYPE_PREFIX: Record<string, string> = {
  part: 'LJ',        // 零件
  component: 'ZJ',   // 组件
  material: 'CL',    // 原材料
  purchased: 'WG',    // 外购件
  standard: 'BZ',    // 标准件
  auxiliary: 'FC',   // 辅材
};

/** POST /api/bom/material/next-code - 获取下一个内部编码 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialType } = schema.parse(body);

    const prefix = TYPE_PREFIX[materialType] || 'LJ';

    // 查询该前缀的最大有效编码（只匹配 LJ00000001 格式）
    const maxCode = await prisma.$queryRawUnsafe<{ maxNum: bigint | null }[]>(
      `SELECT MAX(CAST(REGEXP_REPLACE(internal_code, '[^0-9]', '') AS UNSIGNED)) as maxNum
       FROM material
       WHERE internal_code LIKE ? AND internal_code REGEXP ?`,
      `${prefix}%`,
      `^${prefix}[0-9]{8}$`
    );

    let nextNum = 1;
    if (maxCode[0]?.maxNum != null) {
      nextNum = Number(maxCode[0].maxNum) + 1;
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
