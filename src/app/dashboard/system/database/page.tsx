"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchApi } from "@/lib/utils/fetch";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PagePermission } from "@/components/AuthProvider";

export default function SystemDatabasePage() {
  const { success, error, warning } = useToast();
  const [masterConfig, setMasterConfig] = useState<any>(null);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    moduleName: "",
    moduleCode: "",
    host: "localhost",
    port: 3306,
    database: "",
    username: "",
    password: "",
    remark: ""
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取主库配置
      const masterData = await fetchApi("/api/system/database/master", { headers });
      if (masterData.code === 200) setMasterConfig(masterData.data);

      // 获取分布式数据库配置列表
      const listData = await fetchApi("/api/system/database", { headers });
      if (listData.code === 200) setConfigs(listData.data?.list || listData.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleTestConnection = async (cfg: any) => {
    try {
      const data = await fetchApi("/api/system/database", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "test", data: { host: cfg.host, port: cfg.port, username: cfg.username, password: cfg.password, database: cfg.database } })
      });
      warning(data.code === 200 ? "连接成功" : `连接失败: ${data.message}`);
    } catch (e) { warning("连接失败"); }
  };

  const handleSubmit = async () => {
    try {
      let data;
      if (editingId) {
        data = await fetchApi(`/api/system/database/${editingId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(form)
        });
      } else {
        data = await fetchApi("/api/system/database", {
          method: "POST",
          headers,
          body: JSON.stringify(form)
        });
      }
      if (data.code === 200) {
        setShowForm(false);
        setEditingId(null);
        setForm({ moduleName: "", moduleCode: "", host: "localhost", port: 3306, database: "", username: "", password: "", remark: "" });
        fetchData();
      } else {
        error(data.message);
      }
    } catch (e) { error("保存失败"); }
  };

  const handleEdit = (cfg: any) => {
    setForm({
      moduleName: cfg.moduleName || "",
      moduleCode: cfg.moduleCode || "",
      host: cfg.host || "localhost",
      port: cfg.port || 3306,
      database: cfg.database || "",
      username: cfg.username || "",
      password: "",
      remark: cfg.remark || ""
    });
    setEditingId(cfg.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此数据库配置？")) return;
    try {
      const data = await fetchApi(`/api/system/database/${id}`, { method: "DELETE", headers });
      if (data.code === 200) fetchData();
      else error(data.message);
    } catch (e) { error("删除失败"); }
  };

  return (
    <PagePermission permission="system:database:query">
            <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">分布式数据库配置</h2>
        <PermissionGuard permission="system:database:create"><button onClick={() => { setShowForm(true); setEditingId(null); setForm({ moduleName: "", moduleCode: "", host: "localhost", port: 3306, database: "", username: "", password: "", remark: "" }); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ 添加数据库</button></PermissionGuard>
      </div>

      {/* 主库配置 - 只读显示 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">主库</span>
          <h3 className="font-semibold text-gray-800">{masterConfig?.moduleName || "系统主库"}</h3>
          <span className="text-xs text-gray-500">（系统初始化配置，不可修改）</span>
        </div>
        <div className="grid grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-gray-500">主机地址：</span>
            <span className="font-mono">{masterConfig?.host || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">端口：</span>
            <span className="font-mono">{masterConfig?.port || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">数据库名：</span>
            <span className="font-mono">{masterConfig?.database || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">用户名：</span>
            <span className="font-mono">{masterConfig?.username || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">密码：</span>
            <span className="font-mono text-gray-400">******</span>
          </div>
        </div>
      </div>

      {/* 添加/编辑表单 */}
      {showForm && (
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h3 className="font-medium mb-3">{editingId ? "编辑数据库配置" : "新增数据库配置"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">模块名称 *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.moduleName} onChange={e => setForm({...form, moduleName: e.target.value})} placeholder="如：订单模块" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">模块代码 *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.moduleCode} onChange={e => setForm({...form, moduleCode: e.target.value})} placeholder="如：order_db" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">主机地址 *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.host} onChange={e => setForm({...form, host: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">端口</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value)})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">用户名</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{editingId ? "新密码（不修改请留空）" : "密码"}</label><input type="password" className="w-full border rounded px-3 py-2 text-sm" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editingId ? "不修改请留空" : ""} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">数据库名</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.database} onChange={e => setForm({...form, database: e.target.value})} /></div>
            <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">备注</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.remark} onChange={e => setForm({...form, remark: e.target.value})} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      {/* 分布式数据库配置列表 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">模块</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">模块代码</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">主机</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">端口</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">用户名</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">数据库</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : configs.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">暂无分布式数据库配置</td></tr>
            ) : (
              configs.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{c.moduleName || "-"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{c.moduleCode || "-"}</td>
                  <td className="px-4 py-2.5">{c.host || "-"}</td>
                  <td className="px-4 py-2.5">{c.port || "-"}</td>
                  <td className="px-4 py-2.5">{c.username || "-"}</td>
                  <td className="px-4 py-2.5">{c.database || "-"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs rounded ${c.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.isEnabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <PermissionGuard permission="system:database:update"><button onClick={() => handleTestConnection(c)} className="text-blue-600 hover:underline text-sm mr-2">测试</button></PermissionGuard>
                    <PermissionGuard permission="system:database:update"><button onClick={() => handleEdit(c)} className="text-gray-600 hover:underline text-sm mr-2">编辑</button></PermissionGuard>
                    <PermissionGuard permission="system:database:delete"><button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline text-sm">删除</button></PermissionGuard>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </PagePermission>
    );
}
