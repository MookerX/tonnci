"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ConfigStatus {
  exists: boolean;
  initialized: boolean;
  systemName?: string;
  initializedAt?: string;
  database?: {
    host: string;
    port: number;
    name: string;
  };
  storageInfo?: {
    name: string;
    type: string;
    path: string;
  };
  adminInfo?: {
    username: string;
    realName?: string;
    createdAt?: string;
  };
}

interface DatabaseForm {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

interface StorageForm {
  type: 'local' | 'nas' | 'oss';
  path: string;
  // NAS配置
  nasHost?: string;
  nasPort?: number;
  nasUsername?: string;
  nasPassword?: string;
  // OSS配置
  endpoint?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
}

interface AdminForm {
  username: string;
  password: string;
  confirmPassword: string;
  realName: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [showReinitConfirm, setShowReinitConfirm] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<ConfigStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<'db' | 'storage' | 'admin' | 'complete'>('db');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hasOldData, setHasOldData] = useState(false);
  const [reuseMode, setReuseMode] = useState<'new' | 'reuse'>('new');

  const [dbForm, setDbForm] = useState<DatabaseForm>({
    host: '127.0.0.1',
    port: 3306,
    username: 'root',
    password: '',
    name: 'tengxi_pms',
  });

  const [storageForm, setStorageForm] = useState<StorageForm>({
    type: '',
    path: '',
  });

  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingStorage, setTestingStorage] = useState(false);
  const [storageTestResult, setStorageTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [adminForm, setAdminForm] = useState<AdminForm>({
    username: 'admin',
    password: '',
    confirmPassword: '',
    realName: '',
  });

  const [systemName, setSystemName] = useState('');

  // 检查配置状态
  useEffect(() => {
    checkConfigStatus();
  }, []);

  const checkConfigStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/system/init/config");
      const data = await res.json();
      if (data.code === 200 && data.data) {
        if (data.data.initialized) {
          setInitialized(true);
          setOriginalConfig(data.data);
          // 从API数据设置表单初始值
          if (data.data.systemName) setSystemName(data.data.systemName);
          if (data.data.storageInfo) {
            // 将中文存储类型映射到英文
            const typeMap: Record<string, string> = {
              '本地存储': 'local',
              'NAS存储': 'nas',
              '对象存储(OSS)': 'oss',
            };
            const storageType = typeMap[data.data.storageInfo.storageType] || 'local';
            setStorageForm({
              type: storageType,
              path: data.data.storageInfo.storagePath || '',
              nasHost: '',
              nasPort: 445,
              nasUsername: '',
              nasPassword: '',
              nasShareName: '',
              nasPath: '',
              ossEndpoint: '',
              ossBucket: '',
              ossAccessKey: '',
              ossSecretKey: '',
            });
          }
        } else if (data.data.exists) {
          // 配置文件存在但未初始化，说明是已保存配置
          setCurrentStep('storage');
        }
      }
    } catch (err) {
      console.error("检查配置状态失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const goToLogin = () => {
    router.push("/");
  };

  // 测试数据库连接
  const handleTestDbConnection = async () => {
    setTestingDb(true);
    setDbTestResult(null);
    setError("");
    try {
      const res = await fetch("/api/system/init/config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbForm),
      });
      const data = await res.json();
      setDbTestResult({
        success: data.code === 200,
        message: data.message || data.data?.message || JSON.stringify(data),
      });
    } catch (err) {
      setDbTestResult({ success: false, message: "测试连接失败，请检查网络" });
    } finally {
      setTestingDb(false);
    }
  };

  // 测试存储连接
  const handleTestStorageConnection = async () => {
    setTestingStorage(true);
    setStorageTestResult(null);
    setError("");
    try {
      const res = await fetch("/api/system/init/config/test-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storageForm),
      });
      const data = await res.json();
      setStorageTestResult({
        success: data.code === 200,
        message: data.message || data.data?.message || JSON.stringify(data),
      });
    } catch (err) {
      setStorageTestResult({ success: false, message: "测试连接失败，请检查网络" });
    } finally {
      setTestingStorage(false);
    }
  };

  // 保存配置（步骤1数据库 -> 步骤2存储）
  const handleSaveDbConfig = async () => {
    if (!dbForm.host || !dbForm.username || !dbForm.name) {
      setError("请填写完整的数据库配置");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/system/init/config/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: dbForm,
          storage: storageForm,
          systemName: systemName,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setCurrentStep('storage');
      } else {
        setError(data.message || "保存配置失败");
      }
    } catch (err) {
      setError("保存配置失败，请检查网络");
    } finally {
      setSubmitting(false);
    }
  };

  // 保存存储配置（步骤2存储 -> 步骤3管理员）
  const handleSaveStorageConfig = async () => {
    if (storageForm.type === 'local' && !storageForm.path) {
      setError("请填写存储路径");
      return;
    }
    if (storageForm.type === 'nas') {
      if (!storageForm.nasHost || !storageForm.nasUsername || !storageForm.nasPassword) {
        setError("请填写完整的NAS配置");
        return;
      }
    }
    if (storageForm.type === 'oss') {
      if (!storageForm.endpoint || !storageForm.bucket || !storageForm.accessKey || !storageForm.secretKey) {
        setError("请填写完整的OSS配置");
        return;
      }
    }
    
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/system/init/config/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: dbForm,
          storage: storageForm,
          systemName: systemName,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        if (data.data?.hasOldData) {
          setHasOldData(true);
        }
        setCurrentStep('admin');
      } else {
        setError(data.message || "保存配置失败");
      }
    } catch (err) {
      setError("保存配置失败，请检查网络");
    } finally {
      setSubmitting(false);
    }
  };

  // 创建管理员
  const handleCreateAdmin = async () => {
    if (!adminForm.username || adminForm.username.length < 2) {
      setError("用户名至少2个字符");
      return;
    }
    if (!adminForm.password || adminForm.password.length < 6) {
      setError("密码至少6个字符");
      return;
    }
    if (adminForm.password !== adminForm.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/system/init/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: reuseMode,
          admin: {
            username: adminForm.username,
            password: adminForm.password,
            realName: adminForm.realName || adminForm.username,
          },
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setCurrentStep('complete');
      } else {
        setError(data.message || "初始化失败");
      }
    } catch (err) {
      setError("初始化失败，请检查网络");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  // 已初始化完成
  if (currentStep === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="max-w-md w-full mx-4">
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-500 mb-2">初始化完成</h2>
            <p className="text-slate-400 mb-6">系统已配置完毕，可以开始使用</p>
            <button
              onClick={goToLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              前往登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 已初始化，询问是否重新初始化
  if (initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="max-w-lg w-full mx-4">
          <div className="bg-slate-800 rounded-lg shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">系统已初始化完成</h2>
            </div>
            
            {originalConfig && (
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">原配置信息</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">系统名称</span>
                    <span className="text-white">{originalConfig.systemName || '未设置'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">初始化时间</span>
                    <span className="text-white">{originalConfig.initializedAt ? new Date(originalConfig.initializedAt).toLocaleString() : '未知'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">数据库</span>
                    <span className="text-white">{originalConfig.database?.host}:{originalConfig.database?.port}/{originalConfig.database?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">存储类型</span>
                    <span className="text-white">{originalConfig.storageInfo?.storageType || '未设置'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">存储路径</span>
                    <span className="text-white">{originalConfig.storageInfo?.storagePath || '未设置'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">管理员</span>
                    <span className="text-white">{originalConfig.adminInfo?.username || '未知'}</span>
                  </div>
                  {originalConfig.adminInfo?.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">创建时间</span>
                      <span className="text-white">{new Date(originalConfig.adminInfo.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-center">
              <p className="text-slate-400 mb-4">是否需要重新进行系统初始化？</p>
              <div className="flex gap-4">
                <button
                  onClick={goToLogin}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  返回登录
                </button>
                <button
                  onClick={() => {
                    setShowReinitConfirm(false);
                    setInitialized(false);
                    setCurrentStep('db');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  继续初始化
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 步骤1：配置数据库
  if (currentStep === 'db') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="max-w-lg w-full bg-slate-800 rounded-lg shadow-xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">系统初始化</h1>
          <p className="text-slate-400 mb-6">步骤1：系统信息与数据库配置</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">系统名称</label>
              <input
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="腾曦生产管理系统"
              />
            </div>

            <div className="border-t border-slate-700 pt-4 mt-4">
              <h3 className="text-sm text-slate-400 mb-3">数据库配置</h3>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">数据库主机</label>
              <input
                type="text"
                value={dbForm.host}
                onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="127.0.0.1"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">端口</label>
              <input
                type="number"
                value={dbForm.port}
                onChange={(e) => setDbForm({ ...dbForm, port: parseInt(e.target.value) || 3306 })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="3306"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">用户名</label>
              <input
                type="text"
                value={dbForm.username}
                onChange={(e) => setDbForm({ ...dbForm, username: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="root"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">密码</label>
              <input
                type="password"
                value={dbForm.password}
                onChange={(e) => setDbForm({ ...dbForm, password: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="输入密码"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">数据库名</label>
              <input
                type="text"
                value={dbForm.name}
                onChange={(e) => setDbForm({ ...dbForm, name: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="tengxi_pms"
              />
            </div>

            {/* 测试数据库连接 */}
            <div>
              <button
                onClick={handleTestDbConnection}
                disabled={testingDb}
                className="w-full py-2 px-4 border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm"
              >
                {testingDb ? "测试中..." : "测试数据库连接"}
              </button>
              {dbTestResult && (
                <div className={`mt-2 p-2 rounded-lg text-sm ${dbTestResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {dbTestResult.message}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSaveDbConfig}
            disabled={submitting}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            {submitting ? "保存中..." : "下一步"}
          </button>
        </div>
      </div>
    );
  }

  // 步骤2：配置存储
  if (currentStep === 'storage') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="max-w-lg w-full bg-slate-800 rounded-lg shadow-xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">系统初始化</h1>
          <p className="text-slate-400 mb-6">步骤2：存储配置</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-1">存储类型</label>
            <select
              value={storageForm.type}
              onChange={(e) => setStorageForm({ ...storageForm, type: e.target.value as 'local' | 'nas' | 'oss' })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="local">本地存储</option>
              <option value="nas">NAS存储</option>
              <option value="oss">对象存储 (OSS)</option>
            </select>
          </div>

          {/* 本地存储 */}
          {storageForm.type === 'local' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">存储路径</label>
                <input
                  type="text"
                  value={storageForm.path}
                  onChange={(e) => setStorageForm({ ...storageForm, path: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="/workspace/projects/storage"
                />
                <p className="text-xs text-slate-400 mt-1">用于存储系统图片、附件等文件</p>
              </div>
            </div>
          )}

          {/* NAS存储 */}
          {storageForm.type === 'nas' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">NAS主机地址</label>
                <input
                  type="text"
                  value={storageForm.nasHost || ''}
                  onChange={(e) => setStorageForm({ ...storageForm, nasHost: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">端口</label>
                <input
                  type="number"
                  value={storageForm.nasPort || 22}
                  onChange={(e) => setStorageForm({ ...storageForm, nasPort: parseInt(e.target.value) || 22 })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="22"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">用户名</label>
                <input
                  type="text"
                  value={storageForm.nasUsername || ''}
                  onChange={(e) => setStorageForm({ ...storageForm, nasUsername: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">密码</label>
                <input
                  type="password"
                  value={storageForm.nasPassword || ''}
                  onChange={(e) => setStorageForm({ ...storageForm, nasPassword: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="输入密码"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">挂载路径</label>
                <input
                  type="text"
                  value={storageForm.path}
                  onChange={(e) => setStorageForm({ ...storageForm, path: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="/mnt/nas"
                />
              </div>
            </div>
          )}

          {/* OSS存储 */}
          {storageForm.type === 'oss' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Endpoint</label>
                <input
                  type="text"
                  value={storageForm.endpoint || ''}
                  onChange={(e) => setStorageForm({ ...storageForm, endpoint: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="oss-cn-hangzhou.aliyuncs.com"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Bucket</label>
                <input
                  type="text"
                  value={storageForm.bucket || ''}
                  onChange={(e) => setStorageForm({ ...storageForm, bucket: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="my-bucket"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Access Key</label>
                <input
                  type="text"
                  value={storageForm.accessKey || ''}
                  onChange={(e) => setStorageForm({ ...storageForm, accessKey: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="LTAI..."
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Secret Key</label>
                <input
                  type="password"
                  value={storageForm.secretKey || ''}
                  onChange={(e) => setStorageForm({ ...storageForm, secretKey: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="输入Secret Key"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleTestStorageConnection}
            disabled={testingStorage}
            className="w-full mt-4 py-2 px-4 border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm"
          >
            {testingStorage ? "测试中..." : "测试存储连接"}
          </button>
          {storageTestResult && (
            <div className={`mt-2 p-2 rounded-lg text-sm ${storageTestResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {storageTestResult.message}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setCurrentStep('db')}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              上一步
            </button>
            <button
              onClick={handleSaveStorageConfig}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              {submitting ? "保存中..." : "下一步"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 步骤3：创建管理员
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-lg w-full bg-slate-800 rounded-lg shadow-xl p-6">
        <h1 className="text-2xl font-bold text-white mb-2">系统初始化</h1>
        <p className="text-slate-400 mb-6">步骤3：创建超级管理员</p>

        {hasOldData && (
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-4">
            <p className="text-yellow-500 text-sm mb-3">检测到数据库中存在旧数据</p>
            <div className="flex gap-2">
              <button
                onClick={() => setReuseMode('reuse')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  reuseMode === 'reuse'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                重用数据
              </button>
              <button
                onClick={() => setReuseMode('new')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  reuseMode === 'new'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                清空数据
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">用户名</label>
            <input
              type="text"
              value={adminForm.username}
              onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">姓名</label>
            <input
              type="text"
              value={adminForm.realName}
              onChange={(e) => setAdminForm({ ...adminForm, realName: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="系统管理员"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">密码</label>
            <input
              type="password"
              value={adminForm.password}
              onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="至少6个字符"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">确认密码</label>
            <input
              type="password"
              value={adminForm.confirmPassword}
              onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="再次输入密码"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setCurrentStep('storage')}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            上一步
          </button>
          <button
            onClick={handleCreateAdmin}
            disabled={submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            {submitting ? "初始化中..." : "完成初始化"}
          </button>
        </div>
      </div>
    </div>
  );
}
