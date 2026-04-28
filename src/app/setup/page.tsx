"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/utils/fetch";

interface InitStatus {
  isInitialized: boolean;
  hasData: boolean;
  databaseConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  connectionTest?: {
    success: boolean;
    message: string;
  };
  adminUser?: {
    username: string;
    realName: string;
  };
}

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface AdminConfig {
  username: string;
  password: string;
  realName: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initStatus, setInitStatus] = useState<InitStatus | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [connectionOk, setConnectionOk] = useState(false);
  const [reinitMode, setReinitMode] = useState<'reuse' | 'clear' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    host: "",
    port: 3306,
    username: "",
    password: "",
    database: "",
  });
  const [adminConfig, setAdminConfig] = useState<AdminConfig>({
    username: "",
    password: "",
    realName: "",
  });
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // 检查初始化状态
  const checkInitStatus = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/api/system/init/status");
      if (data.code === 200) {
        const status = data.data;
        setInitStatus(status);
        // 如果系统已初始化，自动填充数据库配置信息
        if (status.isInitialized && status.databaseConfig) {
          setDbConfig({
            host: status.databaseConfig.host || "",
            port: status.databaseConfig.port || 3306,
            username: status.databaseConfig.username || "",
            password: status.databaseConfig.password || "",
            database: status.databaseConfig.database || "",
          });
        }
      } else {
        setError(data.message || "检查初始化状态失败");
      }
    } catch (e) {
      setError("连接服务器失败");
    }
    setLoading(false);
  };

  useEffect(() => {
    checkInitStatus();
  }, []);

  const testDatabase = async () => {
    if (!dbConfig.host || !dbConfig.username || !dbConfig.database) {
      setDbTestResult({ success: false, message: "请填写完整的数据库连接信息" });
      return;
    }

    setTestLoading(true);
    setDbTestResult(null);
    try {
      const data = await fetchApi("/api/system/init/test-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });
      setDbTestResult({
        success: data.code === 200,
        message: data.message || (data.code === 200 ? "连接成功" : "连接失败"),
      });
      if (data.code === 200) {
        setConnectionOk(true);
      }
    } catch (e) {
      setDbTestResult({ success: false, message: "测试连接失败，请检查网络" });
    }
    setTestLoading(false);
  };

  const handleStartSetup = async () => {
    // 如果有现有数据，必须选择初始化模式
    if (initStatus?.hasData && !reinitMode) {
      setError("请选择初始化模式");
      return;
    }

    // 验证管理员信息
    if (!adminConfig.username || adminConfig.username.length < 2) {
      setError("用户名至少2个字符");
      return;
    }

    if (!adminConfig.password || adminConfig.password.length < 6) {
      setError("密码至少6个字符");
      return;
    }

    if (!adminConfig.realName) {
      setError("请输入管理员姓名");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await fetchApi("/api/system/init/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: dbConfig,
          admin: adminConfig,
          mode: initStatus?.hasData ? reinitMode : "new",
        }),
      });

      if (data.code === 200) {
        setStep(3);
      } else {
        setError(data.message || "初始化失败");
      }
    } catch (e) {
      setError("初始化请求失败，请检查网络连接");
    }

    setSubmitting(false);
  };

  const goToLogin = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">检查系统状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* 头部 */}
        <div className="bg-blue-600 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">腾曦生产管理系统</h1>
          <p className="text-blue-100 mt-1">系统初始化配置</p>
        </div>

        {/* 步骤指示器 */}
        <div className="px-8 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? "bg-blue-600 text-white" : "bg-gray-300"}`}>1</div>
              <span className="ml-2 text-sm font-medium">数据库配置</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200"><div className={`h-full bg-blue-600 transition-all ${step >= 2 ? "w-full" : "w-0"}`} /></div>
            <div className={`flex items-center ${step >= 2 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? "bg-blue-600 text-white" : "bg-gray-300"}`}>2</div>
              <span className="ml-2 text-sm font-medium">管理员设置</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200"><div className={`h-full bg-blue-600 transition-all ${step >= 3 ? "w-full" : "w-0"}`} /></div>
            <div className={`flex items-center ${step >= 3 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? "bg-blue-600 text-white" : "bg-gray-300"}`}>3</div>
              <span className="ml-2 text-sm font-medium">完成</span>
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div className="px-8 py-6">
          {/* 步骤1: 数据库配置 */}
          {step === 1 && (
            <div>
              {initStatus?.isInitialized && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium">系统已初始化</p>
                  <p className="text-yellow-600 text-sm mt-1">
                    数据库: {initStatus.databaseConfig?.host}:{initStatus.databaseConfig?.port}/{initStatus.databaseConfig?.database}
                  </p>
                  {initStatus.adminUser && (
                    <p className="text-yellow-600 text-sm mt-1">
                      当前管理员: {initStatus.adminUser.username} {initStatus.adminUser.realName && `(${initStatus.adminUser.realName})`}
                    </p>
                  )}
                  {initStatus.hasData && (
                    <p className="text-yellow-700 text-sm mt-2 font-medium">
                      检测到主数据库中已有数据，重新初始化将覆盖用户和角色信息
                    </p>
                  )}
                </div>
              )}

              <p className="text-gray-600 mb-4">请填写数据库连接信息</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">主机地址 *</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={dbConfig.host}
                      onChange={e => setDbConfig({ ...dbConfig, host: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">端口 *</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={dbConfig.port}
                      onChange={e => setDbConfig({ ...dbConfig, port: parseInt(e.target.value) || 3306 })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户名 *</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={dbConfig.username}
                    onChange={e => setDbConfig({ ...dbConfig, username: e.target.value })}
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码 *</label>
                  <input
                    type="password"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={dbConfig.password}
                    onChange={e => setDbConfig({ ...dbConfig, password: e.target.value })}
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数据库名 *</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={dbConfig.database}
                    onChange={e => setDbConfig({ ...dbConfig, database: e.target.value })}
                    placeholder=""
                  />
                </div>

                {dbTestResult && (
                  <div className={`p-3 rounded-lg ${dbTestResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {dbTestResult.message}
                  </div>
                )}

                {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={goToLogin}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  返回登录
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={testDatabase}
                    disabled={testLoading}
                    className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                  >
                    {testLoading ? "测试中..." : "测试连接"}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    继续
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 步骤2: 管理员设置 */}
          {step === 2 && (
            <div>
              {initStatus?.hasData && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium">检测到数据库中已有数据</p>
                  <p className="text-yellow-600 text-sm mt-1">请选择初始化模式：</p>
                </div>
              )}

              {/* 初始化模式选择 */}
              {initStatus?.hasData && (
                <div className="space-y-3 mb-6">
                  <label
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      reinitMode === "reuse"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reinitMode"
                      value="reuse"
                      checked={reinitMode === "reuse"}
                      onChange={() => setReinitMode("reuse")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-800">重用现有数据</p>
                      <p className="text-sm text-gray-500">只更新管理员信息，保留其他业务数据</p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      reinitMode === "clear"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reinitMode"
                      value="clear"
                      checked={reinitMode === "clear"}
                      onChange={() => setReinitMode("clear")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-800">清空所有数据</p>
                      <p className="text-sm text-gray-500">删除所有数据，重新初始化</p>
                    </div>
                  </label>
                </div>
              )}

              <h3 className="font-medium text-gray-800 mb-4">超级管理员配置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户名 *</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={adminConfig.username}
                    onChange={e => setAdminConfig({ ...adminConfig, username: e.target.value })}
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密码 * <span className="text-gray-400 text-xs">(至少6位)</span>
                  </label>
                  <input
                    type="password"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={adminConfig.password}
                    onChange={e => setAdminConfig({ ...adminConfig, password: e.target.value })}
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={adminConfig.realName}
                    onChange={e => setAdminConfig({ ...adminConfig, realName: e.target.value })}
                    placeholder=""
                  />
                </div>

                {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  上一步
                </button>
                <button
                  onClick={handleStartSetup}
                  disabled={submitting || (initStatus?.hasData && !reinitMode)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {submitting ? "初始化中..." : "开始初始化"}
                </button>
              </div>
            </div>
          )}

          {/* 步骤3: 完成 */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">初始化完成</h2>
              <p className="text-gray-600 mb-2">
                {initStatus?.hasData && reinitMode === "reuse"
                  ? "管理员配置已更新，现有业务数据已保留"
                  : initStatus?.hasData && reinitMode === "clear"
                  ? "所有数据已清空，系统已重新初始化"
                  : "系统初始化成功"}
              </p>
              <p className="text-gray-500 mb-6">
                管理员账号: <span className="font-mono font-medium">{adminConfig.username}</span>
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-yellow-800 text-sm">
                  <strong>安全提示：</strong>初始化完成后，建议删除 setup 目录以防止未授权重新初始化。
                </p>
              </div>

              <button
                onClick={goToLogin}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                进入系统
              </button>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-8 py-4 bg-gray-50 border-t text-center text-sm text-gray-500">
          腾曦生产管理系统 v1.0.0
        </div>
      </div>
    </div>
  );
}
