"use client";

import { useState, useEffect } from "react";

// 通用列表页面模板
function ListPage({ title, apiPath, columns, formFields }: {
  title: string; apiPath: string;
  columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode }[];
  formFields: { key: string; label: string; type?: string; options?: { value: string; label: string }[] }[];
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiPath}?keyword=${keyword}`, { headers });
      const data = await res.json();
      if (data.code === 200) setItems(data.data?.list || data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    try {
      const url = editItem ? `${apiPath}/${editItem.id}` : apiPath;
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.code === 200) { setShowForm(false); setEditItem(null); setForm({}); fetchData(); }
      else alert(data.message || "操作失败");
    } catch (e) { alert("操作失败"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除？")) return;
    try {
      const res = await fetch(`${apiPath}/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.code === 200) fetchData();
      else alert(data.message);
    } catch (e) { alert("操作失败"); }
  };

  const openEdit = (item: any) => {
    const f: Record<string, any> = {};
    formFields.forEach(fd => { f[fd.key] = item[fd.key] ?? ""; });
    setForm(f);
    setEditItem(item);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-1.5 text-sm" placeholder="搜索..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchData()} />
          <button onClick={fetchData} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">查询</button>
          <button onClick={() => { setForm({}); setShowForm(true); }} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">新增</button>
        </div>
      </div>

      {(showForm || editItem) && (
        <div className="bg-white border rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-3">{editItem ? "编辑" : "新增"}</h3>
          <div className="grid grid-cols-3 gap-3">
            {formFields.map(fd => (
              <div key={fd.key}>
                <label className="block text-xs text-gray-500 mb-1">{fd.label}</label>
                {fd.type === "select" ? (
                  <select className="w-full border rounded px-2 py-1.5 text-sm" value={form[fd.key] || ""} onChange={e => setForm({ ...form, [fd.key]: e.target.value })}>
                    <option value="">请选择</option>
                    {fd.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : fd.type === "textarea" ? (
                  <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form[fd.key] || ""} onChange={e => setForm({ ...form, [fd.key]: e.target.value })} />
                ) : (
                  <input className="w-full border rounded px-2 py-1.5 text-sm" type={fd.type || "text"} value={form[fd.key] || ""} onChange={e => setForm({ ...form, [fd.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSubmit} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
            <button onClick={() => { setShowForm(false); setEditItem(null); setForm({}); }} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">取消</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map(c => <th key={c.key} className="px-4 py-2.5 text-left font-medium text-gray-600">{c.label}</th>)}
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                {columns.map(c => (
                  <td key={c.key} className="px-4 py-2.5">
                    {c.render ? c.render(item[c.key], item) : (item[c.key] ?? "-")}
                  </td>
                ))}
                <td className="px-4 py-2.5">
                  <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline mr-2">编辑</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== 角色管理 ==========
export default function SystemRolePage() {
  return <ListPage title="角色管理" apiPath="/api/system/role"
    columns={[
      { key: "roleName", label: "角色名称" },
      { key: "roleCode", label: "角色编码" },
      { key: "remark", label: "备注" },
      { key: "createdAt", label: "创建时间", render: (v: any) => v ? new Date(v).toLocaleString() : "-" },
    ]}
    formFields={[
      { key: "roleName", label: "角色名称 *" },
      { key: "roleCode", label: "角色编码 *" },
      { key: "remark", label: "备注", type: "textarea" },
    ]}
  />;
}
