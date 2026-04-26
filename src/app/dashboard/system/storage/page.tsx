"use client";

import { useState, useEffect } from "react";

export default function SystemStoragePage() {
  const [storages, setStorages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "local", host: "", port: 445, username: "", password: "", sharePath: "", fileTypes: "", remark: "" });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/storage", { headers });
      const data = await res.json();
      if (data.code === 200) setStorages(data.data?.list || data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/system/storage", { method: "POST", headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.code === 200) { setShowForm(false); setForm({ name: "", type: "local", host: "", port: 445, username: "", password: "", sharePath: "", fileTypes: "", remark: "" }); fetchData(); }
      else alert(data.message);
    } catch (e) { alert("保存失败"); }
  };

  const handleTestConnection = async (id: number) => {
    try {
      const res = await fetch(`/api/system/storage/test`, { method: "POST", headers, body: JSON.stringify({ id }) });
      const data = await res.json();
      alert(data.code === 200 ? "连接成功" : `连接失败: ${data.message}`);
    } catch (e) { alert("连接失败"); }
  };

  const typeMap: Record<string, string> = { local: "本地存储", synology: "群晖NAS", qnap: "威联通NAS" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">NAS存储管理</h2>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ 添加存储</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h3 className="font-medium mb-3">新增存储配置</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">存储名称 *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="如：群晖NAS-1" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">存储类型</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="local">本地存储</option><option value="synology">群晖NAS</option><option value="qnap">威联通NAS</option>
              </select>
            </div>
            {form.type !== "local" && <>
              <div><label className="block text-xs text-gray-500 mb-1">IP地址</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.host} onChange={e => setForm({...form, host: e.target.value})} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">端口</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value)})} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">用户名</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">密码</label><input type="password" className="w-full border rounded px-3 py-2 text-sm" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">共享目录</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.sharePath} onChange={e => setForm({...form, sharePath: e.target.value})} placeholder="如：/volume1/drawings" /></div>
            </>}
            <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">绑定文件类型（逗号分隔）</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.fileTypes} onChange={e => setForm({...form, fileTypes: e.target.value})} placeholder="如：图纸,工艺附图,排版文件" /></div>
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
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">名称</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">类型</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">地址</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">共享目录</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">绑定类型</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr> :
            storages.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr> :
            storages.map(s => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">{s.name || "-"}</td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{typeMap[s.type] || s.type || "-"}</span></td>
                <td className="px-4 py-2.5">{s.host || "-"}</td>
                <td className="px-4 py-2.5">{s.sharePath || s.localPath || "-"}</td>
                <td className="px-4 py-2.5">{s.fileTypes || "-"}</td>
                <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs ${s.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.status === "active" ? "启用" : "禁用"}</span></td>
                <td className="px-4 py-2.5"><button onClick={() => handleTestConnection(s.id)} className="text-blue-600 hover:underline text-sm">测试</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
