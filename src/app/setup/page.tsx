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
  storage?: {
    type: string;
    path: string;
  };
  adminInfo?: {
    username: string;
    realName?: string;
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
  type: 'local' | 'oss';
  path: string;
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
  const [currentStep, setCurrentStep] = useState<'config' | 'admin' | 'complete'>('config');
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
    type: 'local',
    path: '/workspace/projects/storage',
  });

  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [adminForm, setAdminForm] = useState<AdminForm>({
    username: 'admin',
    password: '',
    confirmPassword: '',
    realName: '',
  });

  // 检查配置状态
  useEffect(() => {
    checkConfigStatus();
  }, []);

  const checkConfigStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/system/init/config");
      const data = await res.json();
      
      if (data.code === 200 && data.data) {
        if (data.data.exists && data.data.initialized) {
          setInitialized(true);
          setOriginalConfig(data.data);
          setShowReinitConfirm(true);
        } else if (data.data.exists) {
          setCurrentStep('admin');
        }
      }
    } catch (e) {
      console.error("检查配置失败:", e);
      setError("无法连接到服务器，请确保后端服务正在运行");
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存配置
  const handleSaveConfig = async () => {
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/system/init/config/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: dbForm,
          storage: storageForm,
          systemName: "腾曦生产管理系统",
        }),
      });

      const data = await res.json();
      
      if (data.code === 200) {
        setHasOldData(data.data?.hasOldData || false);
        setCurrentStep('admin');
      } else {
        setError(data.message || "保存配置失败");
      }
    } catch (e) {
      setError("保存配置失败，请检查服务器连接");
    } finally {
      setSubmitting(false);
    }
  };

  // 测试数据库连接
  const handleTestDbConnection = async () => {
    setTestingDb(true);
    setDbTestResult(null);

    try {
      const res = await fetch("/api/system/init/config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbForm),
      });
      const data = await res.json();

      if (data.code === 200) {
        setDbTestResult({ success: true, message: "数据库连接成功！" });
      } else {
        setDbTestResult({ success: false, message: data.message || "数据库连接失败" });
      }
    } catch (err) {
      setDbTestResult({ success: false, message: "无法连接到服务器" });
    } finally {
      setTestingDb(false);
    }
  };

  // 创建管理员
  const handleCreateAdmin = async () => {
    setError("");

    if (adminForm.password.length < 6) {
      setError("密码至少6个字符");
      return;
    }

    if (adminForm.password !== adminForm.confirmPassword) {
      setError("两次密码输入不一致");
      return;
    }

    if (!adminForm.realName) {
      setError("请输入管理员姓名");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/system/init/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: reuseMode,
          admin: {
            username: adminForm.username,
            password: adminForm.password,
            realName: adminForm.realName,
          },
        }),
      });

      const data = await res.json();
      
      if (data.code === 200) {
        setCurrentStep('complete');
      } else {
        setError(data.message || "初始化失败");
      }
    } catch (e) {
      setError("初始化失败，请检查服务器连接");
    } finally {
      setSubmitting(false);
    }
  };

  // 返回登录页
  const goToLogin = () => {
    router.push('/');
  };

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  // 已初始化完成
  if (initialized || currentStep === 'complete') {
    // 显示重新初始化确认
    if (showReinitConfirm && originalConfig) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
          <div className="max-w-lg w-full bg-slate-800 rounded-lg shadow-xl p-6">
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-green-500">系统已初始化</h2>
                  <p className="text-slate-400 text-sm">当前系统配置信息如下</p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400">系统名称：</span>
                    <span className="text-white">{originalConfig.systemName || '腾曦生产管理系统'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">初始化时间：</span>
                    <span className="text-white">{originalConfig.initializedAt ? new Date(originalConfig.initializedAt).toLocaleString('zh-CN') : '-'}</span>
                  </div>
                </div>
                
                {originalConfig.database && (
                  <div className="pt-2 border-t border-slate-700">
                    <span className="text-slate-400">数据库：</span>
                    <span className="text-white">
                      {originalConfig.database.host}:{originalConfig.database.port}/{originalConfig.database.name}
                    </span>
                  </div>
                )}
                
                {originalConfig.storage && (
                  <div>
                    <span className="text-slate-400">存储位置：</span>
                    <span className="text-white">{originalConfig.storage.path}</span>
                  </div>
                )}
                
                {originalConfig.adminInfo && (
                  <div>
                    <span className="text-slate-400">管理员：</span>
                    <span className="text-white">{originalConfig.adminInfo.realName || originalConfig.adminInfo.username}</span>
                  </div>
                )}
              </div>
            </div>
            
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
                    setCurrentStep('config');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  继续初始化
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-md w-full mx-4">
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-500 mb-2">系统已初始化完成</h2>
            <p className="text-slate-400 mb-6">系统已经配置完毕，可以开始使用</p>
            <button
              onClick={goToLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              返回登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 步骤1：配置数据库
  if (currentStep === 'config') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="max-w-lg w-full bg-slate-800 rounded-lg shadow-xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">系统初始化</h1>
          <p className="text-slate-400 mb-6">步骤1：配置数据库连接</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
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

          {/* 存储配置 */}
          <div className="border-t border-slate-600 pt-4 mt-4">
            <h3 className="text-lg font-medium text-white mb-3">存储配置</h3>
            
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-1">存储类型</label>
              <select
                value={storageForm.type}
                onChange={(e) => setStorageForm({ ...storageForm, type: e.target.value as 'local' | 'oss' })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="local">本地存储</option>
                <option value="oss">对象存储 (OSS)</option>
              </select>
            </div>

            {storageForm.type === 'local' ? (
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
            ) : (
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
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={submitting}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            {submitting ? "保存中..." : "保存配置"}
          </button>
        </div>
      </div>
    );
  }

  // 步骤2：创建管理员
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-lg w-full bg-slate-800 rounded-lg shadow-xl p-6">
        <h1 className="text-2xl font-bold text-white mb-2">系统初始化</h1>
        <p className="text-slate-400 mb-6">步骤2：创建超级管理员</p>

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
            onClick={() => setCurrentStep('config')}
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
