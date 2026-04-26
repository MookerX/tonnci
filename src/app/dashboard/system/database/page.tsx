"use client";

import { useState, useEffect } from "react";

export default function SystemDatabasePage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ moduleName: "", dbHost: "localhost", dbPort: 3306, dbUser: "", dbPassword: "", dbName: "", remark: "" });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/database", { headers });
      const data = await res.json();
      if (data.code === 200) setConfigs(data.data?.list || data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleTestConnection = async (cfg: any) => {
    try {
      const res = await fetch("/api/system/init/check", { method: "POST", headers, body: JSON.stringify({ host: cfg.dbHost, port: cfg.dbPort, username: cfg.dbUser, password: cfg.dbPassword, database: cfg.dbName }) });
      const data = await res.json();
      alert(data.code === 200 ? "连接成功" : `连接失败: ${data.message}`);
    } catch (e) { alert("连接失败"); }
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/system/database", { method: "POST", headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.code === 200) { setShowForm(false); fetchData(); }
      else alert(data.message);
    } catch (e) { alert("保存失败"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">分布式数据库配置</h2>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ 添加数据库</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h3 className="font-medium mb-3">新增数据库配置</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">模块名称 *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.moduleName} onChange={e => setForm({...form, moduleName: e.target.value})} placeholder="如：订单模块" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">主机地址 *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.dbHost} onChange={e => setForm({...form, dbHost: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">端口</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.dbPort} onChange={e => setForm({...form, dbPort: parseInt(e.target.value)})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">用户名</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.dbUser} onChange={e => setForm({...form, dbUser: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">密码</label><input type="password" className="w-full border rounded px-3 py-2 text-sm" value={form.dbPassword} onChange={e => setForm({...form, dbPassword: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">数据库名</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.dbName} onChange={e => setForm({...form, dbName: e.target.value})} /></div>
            <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">备注</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.remark} onChange={e => setForm({...form, remark: e.target.value})} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">模块</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">主机</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">端口</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">用户名</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">数据库</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">备注</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr> :
            configs.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无数据，主库默认使用系统初始化配置</td></tr> :
            configs.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">{c.moduleName || c.module || "-"}</td>
                <td className="px-4 py-2.5">{c.dbHost || c.host || "-"}</td>
                <td className="px-4 py-2.5">{c.dbPort || c.port || "-"}</td>
                <td className="px-4 py-2.5">{c.dbUser || c.username || "-"}</td>
                <td className="px-4 py-2.5">{c.dbName || c.database || "-"}</td>
                <td className="px-4 py-2.5 text-gray-500">{c.remark || "-"}</td>
                <td className="px-4 py-2.5"><button onClick={() => handleTestConnection(c)} className="text-blue-600 hover:underline text-sm">测试连接</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
