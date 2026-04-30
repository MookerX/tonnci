"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ConfigStatus {
  exists: boolean;
  initialized: boolean;
  systemName?: string;
  database?: {
    host: string;
    port: number;
    name: string;
    hasCredentials: boolean;
  };
  storage?: {
    type: string;
    path: string;
  };
  initializedAt?: string;
}

interface DatabaseForm {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

interface StorageForm {
  type: 'local' | 'nas';
  path: string;
  nasHost?: string;
  nasUsername?: string;
  nasPassword?: string;
}

interface AdminForm {
  username: string;
  password: string;
  confirmPassword: string;
  realName: string;
  phone: string;
  email: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<'config' | 'admin' | 'complete'>('config');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [configSaved, setConfigSaved] = useState(false);
  const [hasOldData, setHasOldData] = useState(false);
  const [reuseMode, setReuseMode] = useState<'new' | 'reuse'>('new');

  // 表单数据
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

  const [adminForm, setAdminForm] = useState<AdminForm>({
    username: 'admin',
    password: '',
    confirmPassword: '',
    realName: '',
    phone: '',
    email: '',
  });

  // 检查配置状态
  useEffect(() => {
    checkConfigStatus();
  }, []);

  const checkConfigStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/init/config");
      const data = await res.json();

      if (data.code === 200) {
        setConfigStatus(data.data);

        // 如果配置文件已存在
        if (data.data.exists) {
          if (data.data.initialized) {
            // 系统已初始化完成，跳转到登录页
            router.push("/");
            return;
          }
          // 配置存在但未初始化
          setConfigSaved(true);
          setCurrentStep('admin');
        }
      }
    } catch (e) {
      setError("无法连接到服务器");
    }
    setLoading(false);
  };

  // 保存配置文件
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
        setConfigSaved(true);
        setHasOldData(data.data.hasOldData);
        setCurrentStep('admin');
      } else {
        setError(data.message);
      }
    } catch (e) {
      setError("保存配置失败");
    }

    setSubmitting(false);
  };

  // 创建超级管理员
  const handleCreateAdmin = async () => {
    setError("");

    // 表单验证
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
            phone: adminForm.phone || undefined,
            email: adminForm.email || undefined,
          },
        }),
      });

      const data = await res.json();

      if (data.code === 200) {
        setCurrentStep('complete');
      } else {
        setError(data.message);
      }
    } catch (e) {
      setError("初始化失败");
    }

    setSubmitting(false);
  };

  // 返回登录页
  const handleBackToLogin = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">腾曦生产管理系统</h1>
          <p className="text-slate-400">系统初始化向导</p>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center mb-8">
          <StepIndicator
            step={1}
            label="配置"
            active={currentStep === 'config'}
            completed={configSaved}
          />
          <div className={`w-16 h-0.5 ${currentStep !== 'config' ? 'bg-blue-500' : 'bg-slate-600'}`} />
          <StepIndicator
            step={2}
            label="管理员"
            active={currentStep === 'admin'}
            completed={currentStep === 'complete'}
          />
          <div className={`w-16 h-0.5 ${currentStep === 'complete' ? 'bg-blue-500' : 'bg-slate-600'}`} />
          <StepIndicator
            step={3}
            label="完成"
            active={currentStep === 'complete'}
            completed={false}
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 配置已存在提示 */}
        {configSaved && !configStatus?.initialized && currentStep === 'admin' && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-amber-400 font-medium">检测到已有配置</p>
                <p className="text-amber-300/80 text-sm mt-1">
                  系统检测到数据库中可能存在旧数据。请选择初始化模式：
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => setReuseMode('new')}
                    className={`px-4 py-2 rounded text-sm ${
                      reuseMode === 'new'
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    清空数据重新开始
                  </button>
                  <button
                    onClick={() => setReuseMode('reuse')}
                    className={`px-4 py-2 rounded text-sm ${
                      reuseMode === 'reuse'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    保留数据继续使用
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 步骤1: 数据库和存储配置 */}
        {currentStep === 'config' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">数据库与存储配置</h2>

            {/* 数据库配置 */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-slate-300 mb-4">数据库配置</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">主机地址</label>
                  <input
                    type="text"
                    value={dbForm.host}
                    onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="127.0.0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">端口</label>
                  <input
                    type="number"
                    value={dbForm.port}
                    onChange={(e) => setDbForm({ ...dbForm, port: parseInt(e.target.value) || 3306 })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="3306"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">用户名</label>
                  <input
                    type="text"
                    value={dbForm.username}
                    onChange={(e) => setDbForm({ ...dbForm, username: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="root"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">密码</label>
                  <input
                    type="password"
                    value={dbForm.password}
                    onChange={(e) => setDbForm({ ...dbForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="密码"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">数据库名</label>
                  <input
                    type="text"
                    value={dbForm.name}
                    onChange={(e) => setDbForm({ ...dbForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="tengxi_pms"
                  />
                </div>
              </div>
            </div>

            {/* 存储配置 */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-slate-300 mb-4">文件存储配置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">存储类型</label>
                  <select
                    value={storageForm.type}
                    onChange={(e) => setStorageForm({ ...storageForm, type: e.target.value as 'local' | 'nas' })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="local">本地存储</option>
                    <option value="nas">NAS 存储</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">存储路径</label>
                  <input
                    type="text"
                    value={storageForm.path}
                    onChange={(e) => setStorageForm({ ...storageForm, path: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="/workspace/projects/storage"
                  />
                </div>

                {storageForm.type === 'nas' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-lg">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">NAS 地址</label>
                      <input
                        type="text"
                        value={storageForm.nasHost || ''}
                        onChange={(e) => setStorageForm({ ...storageForm, nasHost: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">用户名</label>
                      <input
                        type="text"
                        value={storageForm.nasUsername || ''}
                        onChange={(e) => setStorageForm({ ...storageForm, nasUsername: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-slate-400 mb-1">密码</label>
                      <input
                        type="password"
                        value={storageForm.nasPassword || ''}
                        onChange={(e) => setStorageForm({ ...storageForm, nasPassword: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveConfig}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存配置并继续"
                )}
              </button>
            </div>
          </div>
        )}

        {/* 步骤2: 超级管理员设置 */}
        {currentStep === 'admin' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">设置超级管理员</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">用户名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={adminForm.username}
                  onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="管理员用户名（至少2个字符）"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">密码 <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="至少6个字符"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">确认密码 <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    value={adminForm.confirmPassword}
                    onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="再次输入密码"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">姓名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={adminForm.realName}
                  onChange={(e) => setAdminForm({ ...adminForm, realName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="管理员真实姓名"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">手机（选填）</label>
                  <input
                    type="tel"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="手机号码"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">邮箱（选填）</label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="电子邮箱"
                  />
                </div>
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex justify-between mt-6">
              <button
                onClick={handleBackToLogin}
                className="px-6 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
              >
                返回登录
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    初始化中...
                  </>
                ) : (
                  "完成初始化"
                )}
              </button>
            </div>
          </div>
        )}

        {/* 步骤3: 完成 */}
        {currentStep === 'complete' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">初始化完成</h2>
            <p className="text-slate-400 mb-6">恭喜！系统已成功初始化，现在可以开始使用腾曦生产管理系统了。</p>
            <button
              onClick={handleBackToLogin}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"
            >
              进入登录页面
            </button>
          </div>
        )}

        {/* 底部说明 */}
        <div className="mt-6 text-center text-slate-500 text-sm">
          <p>配置文件将加密存储在服务器非公开目录，保护您的数据安全</p>
        </div>
      </div>
    </div>
  );
}

// 步骤指示器组件
function StepIndicator({
  step,
  label,
  active,
  completed,
}: {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          completed
            ? 'bg-green-500 text-white'
            : active
            ? 'bg-blue-500 text-white'
            : 'bg-slate-700 text-slate-400'
        }`}
      >
        {completed ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step
        )}
      </div>
      <span className={`text-xs mt-1 ${active ? 'text-slate-300' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}
