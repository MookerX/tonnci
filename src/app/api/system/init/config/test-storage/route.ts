import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

interface StorageForm {
  type: 'local' | 'nas' | 'oss';
  path: string;
  // NAS配置 (SMB协议)
  nasHost?: string;
  nasPort?: number;
  nasUsername?: string;
  nasPassword?: string;
  domain?: string;
  // OSS配置
  endpoint?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
}

// 测试本地存储
function testLocalStorage(storagePath: string) {
  if (!storagePath) {
    return {
      code: 400,
      message: "请填写存储路径",
      data: { connected: false }
    };
  }
  
  try {
    // 检查路径是否存在，不存在则尝试创建
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
      return {
        code: 200,
        message: `存储路径不存在，已自动创建: ${storagePath}`,
        data: { connected: true, path: storagePath, created: true }
      };
    }
    
    // 检查是否可写
    const testFile = path.join(storagePath, '.write_test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    return {
      code: 200,
      message: "本地存储连接正常",
      data: { connected: true, path: storagePath, writable: true }
    };
  } catch (err: any) {
    return {
      code: 500,
      message: `存储路径不可用: ${err.message}`,
      data: { connected: false }
    };
  }
}

// 测试NAS存储 (使用smbclient命令行工具)
async function testNasStorage(config: {
  nasHost: string;
  nasPort?: number;
  nasUsername: string;
  nasPassword: string;
  path: string;
  domain?: string;
}) {
  const { nasHost, nasPort, nasUsername, nasPassword, path: nasPath, domain } = config;
  const port = nasPort || 445;
  const sharePath = nasPath || 'share';
  
  return new Promise<{code: number, message: string, data: any}>((resolve) => {
    try {
      // 使用 smbclient 测试SMB连接
      // 先检查 smbclient 是否可用
      const smbclientCmd = `smbclient //${nasHost}/${sharePath} -U ${nasUsername}%${nasPassword} -p ${port} -c "ls" 2>&1`;
      
      try {
        const result = execSync(smbclientCmd, { timeout: 15000, encoding: 'utf8' });
        
        // 如果命令成功执行（没有错误），说明连接成功
        if (!result.includes('NT_STATUS')) {
          resolve({
            code: 200,
            message: `NAS存储(SMB)连接正常: \\\\${nasHost}\\${sharePath}`,
            data: { connected: true, type: 'smb', host: nasHost, path: sharePath }
          });
          return;
        }
        
        resolve({
          code: 500,
          message: `SMB连接失败: ${result}`,
          data: { connected: false, error: result }
        });
      } catch (err: any) {
        const errorOutput = err.stdout?.toString() || err.stderr?.toString() || err.message;
        
        // 检查是否是认证失败
        if (errorOutput.includes('NT_STATUS_LOGON_FAILURE') || errorOutput.includes('ACCESS_DENIED')) {
          resolve({
            code: 500,
            message: 'SMB认证失败，请检查用户名和密码',
            data: { connected: false, error: '认证失败' }
          });
          return;
        }
        
        // 检查是否是路径不存在
        if (errorOutput.includes('NT_STATUS_BAD_NETWORK_NAME') || errorOutput.includes('not found')) {
          resolve({
            code: 500,
            message: `SMB共享路径不存在: ${sharePath}`,
            data: { connected: false, error: '路径不存在' }
          });
          return;
        }
        
        resolve({
          code: 500,
          message: `SMB连接失败: ${errorOutput.substring(0, 200)}`,
          data: { connected: false, error: errorOutput }
        });
      }
    } catch (err: any) {
      resolve({
        code: 500,
        message: `SMB连接失败: ${err.message}`,
        data: { connected: false }
      });
    }
  });
}

// 测试OSS存储
function testOssStorage(config: {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}) {
  const { endpoint, bucket, accessKey, secretKey } = config;
  
  if (!endpoint || !bucket || !accessKey || !secretKey) {
    return {
      code: 400,
      message: "请填写完整的OSS配置",
      data: { connected: false }
    };
  }
  
  try {
    // 使用 ossutil 测试连接
    const result = execSync(
      `ossutil ls oss://${bucket}/ --endpoint ${endpoint} --access-key-id ${accessKey} --access-key-secret ${secretKey} 2>&1 | head -5`,
      { timeout: 30000 }
    ).toString();
    
    return {
      code: 200,
      message: `OSS存储连接正常，Bucket: ${bucket}`,
      data: { connected: true, type: 'oss', bucket, endpoint }
    };
  } catch (err: any) {
    const errorMsg = err.stdout?.toString() || err.stderr?.toString() || '连接失败';
    return {
      code: 500,
      message: `OSS连接失败: ${errorMsg.substring(0, 200)}`,
      data: { connected: false }
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: StorageForm = await request.json();
    const { type } = body;

    let result: {code: number, message: string, data: any};

    switch (type) {
      case 'local':
        result = testLocalStorage(body.path);
        break;
        
      case 'nas':
        if (!body.nasHost || !body.nasUsername || !body.nasPassword) {
          result = {
            code: 400,
            message: "请填写完整的NAS配置（主机地址、用户名、密码）",
            data: { connected: false }
          };
        } else {
          result = await testNasStorage({
            nasHost: body.nasHost,
            nasPort: body.nasPort,
            nasUsername: body.nasUsername,
            nasPassword: body.nasPassword,
            path: body.path,
            domain: body.domain
          });
        }
        break;
        
      case 'oss':
        result = testOssStorage({
          endpoint: body.endpoint || '',
          bucket: body.bucket || '',
          accessKey: body.accessKey || '',
          secretKey: body.secretKey || ''
        });
        break;
        
      default:
        result = {
          code: 400,
          message: "不支持的存储类型",
          data: { connected: false }
        };
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({
      code: 500,
      message: `测试失败: ${err.message}`,
      data: { connected: false }
    });
  }
}
