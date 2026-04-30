import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, username, password, name } = body;

    // 验证必填字段
    if (!host || !port || !username || !name) {
      return NextResponse.json(
        { code: 400, message: "请填写完整的数据库信息" },
        { status: 400 }
      );
    }

    // 尝试连接数据库
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user: username,
      password: password || "",
      connectTimeout: 5000, // 5秒超时
    });

    // 检查数据库是否存在
    const [databases] = await connection.execute<mysql.RowDataPacket[]>(
      `SHOW DATABASES LIKE '${name}'`
    );

    await connection.end();

    if (databases.length === 0) {
      // 数据库不存在，提示可以创建
      return NextResponse.json({
        code: 200,
        message: "数据库不存在，将自动创建",
        data: {
          connected: true,
          databaseExists: false,
          canCreate: true,
        },
      });
    }

    return NextResponse.json({
      code: 200,
      message: "数据库连接成功",
      data: {
        connected: true,
        databaseExists: true,
        canCreate: false,
      },
    });
  } catch (error: any) {
    console.error("数据库测试失败:", error);

    // 解析常见错误
    let message = "数据库连接失败";
    
    if (error.code === "ECONNREFUSED") {
      message = "无法连接到数据库服务器，请检查主机和端口";
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      message = "用户名或密码错误";
    } else if (error.code === "ENOTFOUND") {
      message = "找不到数据库服务器，请检查主机地址";
    } else if (error.message) {
      message = error.message;
    }

    return NextResponse.json(
      { code: 500, message },
      { status: 500 }
    );
  }
}
