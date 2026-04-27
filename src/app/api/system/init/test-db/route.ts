/**
 * 数据库连接测试API
 */

import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, username, password, database } = body;

    if (!host || !port || !username || !database) {
      return NextResponse.json({
        code: 400,
        message: "请填写完整的数据库连接信息",
        data: null,
      });
    }

    // 测试数据库连接
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user: username,
      password: password || "",
      database,
      connectTimeout: 5000,
    });

    await connection.end();

    return NextResponse.json({
      code: 200,
      message: "数据库连接成功",
      data: { success: true },
    });
  } catch (error: any) {
    console.error("数据库连接测试失败", error);
    return NextResponse.json({
      code: 400,
      message: error.message || "数据库连接失败",
      data: null,
    });
  }
}
