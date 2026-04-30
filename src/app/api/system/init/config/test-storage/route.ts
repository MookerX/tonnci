import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

interface StorageForm {
  type: 'local' | 'nas' | 'oss';
  path: string;
  nasHost?: string;
  nasPort?: number;
  nasUsername?: string;
  nasPassword?: string;
  endpoint?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StorageForm = await request.json();
    const { type } = body;

    // 测试本地存储
    if (type === 'local') {
      const storagePath = body.path;
      if (!storagePath) {
        return NextResponse.json({
          code: 400,
          message: "请填写存储路径"
        });
      }
      
      try {
        // 检查路径是否存在，不存在则尝试创建
        if (!fs.existsSync(storagePath)) {
          fs.mkdirSync(storagePath, { recursive: true });
          return NextResponse.json({
            code: 200,
            message: `存储路径不存在，已自动创建: ${storagePath}`,
            data: { connected: true, path: storagePath, created: true }
          });
        }
        
        // 检查是否可写
        const testFile = path.join(storagePath, '.write_test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        
        return NextResponse.json({
          code: 200,
          message: "本地存储连接正常",
          data: { connected: true, path: storagePath, writable: true }
        });
      } catch (err: any) {
        return NextResponse.json({
          code: 500,
          message: `存储路径不可用: ${err.message}`,
          data: { connected: false }
        });
      }
    }

    // 测试NAS存储
    if (type === 'nas') {
      const { nasHost, nasPort, nasUsername, nasPassword, path: nasPath } = body;
      
      if (!nasHost || !nasUsername || !nasPassword) {
        return NextResponse.json({
          code: 400,
          message: "请填写完整的NAS配置"
        });
      }
      
      const port = nasPort || 22;
      
      try {
        // 使用SSH测试连接
        const result = execSync(
          `sshpass -p '${nasPassword}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p ${port} ${nasUsername}@${nasHost} "echo ok" 2>&1`,
          { timeout: 15000 }
        ).toString();
        
        if (result.includes('ok')) {
          // 检查挂载路径是否存在
          try {
            execSync(
              `sshpass -p '${nasPassword}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p ${port} ${nasUsername}@${nasHost} "test -d '${nasPath}' && echo exists" 2>&1`,
              { timeout: 15000 }
            );
            return NextResponse.json({
              code: 200,
              message: `NAS存储连接正常，路径可访问: ${nasPath}`,
              data: { connected: true, type: 'nas', host: nasHost, path: nasPath }
            });
          } catch {
            return NextResponse.json({
              code: 200,
              message: `NAS存储连接正常，但路径 ${nasPath} 不存在，将自动创建`,
              data: { connected: true, type: 'nas', host: nasHost, path: nasPath, needCreate: true }
            });
          }
        }
        
        return NextResponse.json({
          code: 500,
          message: "NAS连接失败",
          data: { connected: false }
        });
      } catch (err: any) {
        const errorMsg = err.stdout?.toString() || err.stderr?.toString() || '连接失败';
        return NextResponse.json({
          code: 500,
          message: `NAS连接失败: ${errorMsg}`,
          data: { connected: false }
        });
      }
    }

    // 测试OSS存储
    if (type === 'oss') {
      const { endpoint, bucket, accessKey, secretKey } = body;
      
      if (!endpoint || !bucket || !accessKey || !secretKey) {
        return NextResponse.json({
          code: 400,
          message: "请填写完整的OSS配置"
        });
      }
      
      try {
        // 使用ossutil测试连接
        const result = execSync(
          `ossutil ls oss://${bucket}/ --endpoint ${endpoint} --access-key-id ${accessKey} --access-key-secret ${secretKey} 2>&1 | head -5`,
          { timeout: 30000 }
        ).toString();
        
        return NextResponse.json({
          code: 200,
          message: `OSS存储连接正常，Bucket: ${bucket}`,
          data: { connected: true, type: 'oss', bucket, endpoint }
        });
      } catch (err: any) {
        const errorMsg = err.stdout?.toString() || err.stderr?.toString() || '连接失败';
        return NextResponse.json({
          code: 500,
          message: `OSS连接失败: ${errorMsg}`,
          data: { connected: false }
        });
      }
    }

    return NextResponse.json({
      code: 400,
      message: "不支持的存储类型"
    });
  } catch (err: any) {
    return NextResponse.json({
      code: 500,
      message: `测试失败: ${err.message}`,
      data: { connected: false }
    });
  }
}
