// =============================================================================
// 腾曦生产管理系统 - 系统初始化设置页面
// 描述: 首次使用时配置数据库、存储、管理员等信息
// =============================================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 数据库配置
  const [dbConfig, setDbConfig] = useState({
    host: "localhost",
    port: "3306",
    username: "root",
    password: "",
    database: "tengxi_pms",
  });

  // 存储配置
  const [storageConfig, setStorageConfig] = useState({
    localPath: "/workspace/projects/storage",
    nasEnabled: false,
    nasHost: "",
    nasUsername: "",
    nasPassword: "",
    nasShare: "",
  });

  // 管理员配置
  const [adminConfig, setAdminConfig] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    realName: "",
    phone: "",
    email: "",
  });

  // 密码可见性状态
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 全局参数配置
  const [globalConfig, setGlobalConfig] = useState({
    fileTypes: ".jpg,.jpeg,.png,.pdf,.dwg,.xlsx,.xls",
    maxFileSize: "50",
    orderPrefix: "DD",
    materialPrefix: "WL",
    customerPrefix: "KH",
  });

  // 步骤1: 测试数据库连接
  const testDatabaseConnection = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/system/init/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dbConfig, action: "test" }),
      });

      const data = await res.json();

      if (data.code === 200) {
        setStep(2);
      } else {
        setError(data.message || "数据库连接失败");
      }
    } catch (err) {
      setError("网络错误，请检查数据库配置");
    } finally {
      setLoading(false);
    }
  };

  // 步骤2: 配置存储
  const handleStorageConfig = () => {
    setStep(3);
  };

  // 步骤3: 创建管理员
  const validateAdminConfig = () => {
    if (adminConfig.password !== adminConfig.confirmPassword) {
      setError("两次密码输入不一致");
      return false;
    }
    if (adminConfig.password.length < 6) {
      setError("密码长度不能少于6位");
      return false;
    }
    return true;
  };

  // 完成初始化
  const completeSetup = async () => {
    if (!validateAdminConfig()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/system/init/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: dbConfig,
          storage: storageConfig,
          admin: {
            username: adminConfig.username,
            password: adminConfig.password,
            realName: adminConfig.realName,
            phone: adminConfig.phone,
            email: adminConfig.email,
          },
          global: globalConfig,
        }),
      });

      const data = await res.json();

      if (data.code === 200) {
        router.push("/");
      } else {
        setError(data.message || "初始化失败");
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">系统初始化配置</h1>
          <p className="text-slate-400">首次使用请完成以下配置</p>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((s, index) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  step >= s
                    ? "bg-blue-500 text-white"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {s}
              </div>
              {index < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    step > s ? "bg-blue-500" : "bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 步骤1: 数据库配置 */}
        {step === 1 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="text-blue-400">1</span> 数据库配置
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">数据库地址</label>
                  <input
                    type="text"
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">端口</label>
                  <input
                    type="text"
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="3306"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">用户名</label>
                  <input
                    type="text"
                    value={dbConfig.username}
                    onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="root"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">密码</label>
                  <input
                    type="password"
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="请输入密码"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">数据库名称</label>
                <input
                  type="text"
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="tengxi_pms"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={testDatabaseConnection}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? "测试中..." : "测试连接并继续"}
              </button>
            </div>
          </div>
        )}

        {/* 步骤2: 存储配置 */}
        {step === 2 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="text-blue-400">2</span> 文件存储配置
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">本地存储路径</label>
                <input
                  type="text"
                  value={storageConfig.localPath}
                  onChange={(e) => setStorageConfig({ ...storageConfig, localPath: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storageConfig.nasEnabled}
                    onChange={(e) => setStorageConfig({ ...storageConfig, nasEnabled: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-500"
                  />
                  <span className="text-slate-300">启用NAS存储（可选）</span>
                </label>
              </div>

              {storageConfig.nasEnabled && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">NAS地址</label>
                      <input
                        type="text"
                        value={storageConfig.nasHost}
                        onChange={(e) => setStorageConfig({ ...storageConfig, nasHost: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">共享目录</label>
                      <input
                        type="text"
                        value={storageConfig.nasShare}
                        onChange={(e) => setStorageConfig({ ...storageConfig, nasShare: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder="/share"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">用户名</label>
                      <input
                        type="text"
                        value={storageConfig.nasUsername}
                        onChange={(e) => setStorageConfig({ ...storageConfig, nasUsername: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">密码</label>
                      <input
                        type="password"
                        value={storageConfig.nasPassword}
                        onChange={(e) => setStorageConfig({ ...storageConfig, nasPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                上一步
              </button>
              <button
                onClick={handleStorageConfig}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                继续
              </button>
            </div>
          </div>
        )}

        {/* 步骤3: 管理员配置 */}
        {step === 3 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="text-blue-400">3</span> 超级管理员配置
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">登录用户名</label>
                  <input
                    type="text"
                    value={adminConfig.username}
                    onChange={(e) => setAdminConfig({ ...adminConfig, username: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">姓名</label>
                  <input
                    type="text"
                    value={adminConfig.realName}
                    onChange={(e) => setAdminConfig({ ...adminConfig, realName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">密码</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={adminConfig.password}
                      onChange={(e) => setAdminConfig({ ...adminConfig, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="请输入密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">确认密码</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={adminConfig.confirmPassword}
                      onChange={(e) => setAdminConfig({ ...adminConfig, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 pr-12 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="请确认密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">手机号（选填）</label>
                  <input
                    type="text"
                    value={adminConfig.phone}
                    onChange={(e) => setAdminConfig({ ...adminConfig, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">邮箱（选填）</label>
                  <input
                    type="email"
                    value={adminConfig.email}
                    onChange={(e) => setAdminConfig({ ...adminConfig, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                上一步
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                继续
              </button>
            </div>
          </div>
        )}

        {/* 步骤4: 全局参数配置 */}
        {step === 4 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="text-blue-400">4</span> 全局参数配置
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">允许上传的文件类型</label>
                <input
                  type="text"
                  value={globalConfig.fileTypes}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, fileTypes: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">用逗号分隔，如：.jpg,.png,.pdf,.dwg</p>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">单文件大小限制（MB）</label>
                <input
                  type="number"
                  value={globalConfig.maxFileSize}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, maxFileSize: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">订单编号前缀</label>
                  <input
                    type="text"
                    value={globalConfig.orderPrefix}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, orderPrefix: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">物料编号前缀</label>
                  <input
                    type="text"
                    value={globalConfig.materialPrefix}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, materialPrefix: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">客户编号前缀</label>
                  <input
                    type="text"
                    value={globalConfig.customerPrefix}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, customerPrefix: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                上一步
              </button>
              <button
                onClick={completeSetup}
                disabled={loading}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? "初始化中..." : "完成初始化"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
