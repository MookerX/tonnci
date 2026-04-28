"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchApi } from "@/lib/utils/fetch";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function BomManagementPage() {
  const { success, error, warning } = useToast();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ keyword: "", materialType: "" });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ materialName: "", drawingCode: "", internalCode: "", drawingNo: "", materialType: "part", unit: "个", spec: "", remark: "", customerId: "" });
  const [customers, setCustomers] = useState<any[]>([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const typeMap: Record<string, string> = { part: "零件", component: "组件", raw_material: "原材料", purchased: "外购件", standard: "标准件", auxiliary: "辅材" };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.keyword) params.set("keyword", search.keyword);
      if (search.materialType) params.set("materialType", search.materialType);
      const data = await fetchApi(`/api/bom/material?${params.toString()}`, { headers });
      if (data.code === 200) setMaterials(data.data?.list || data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    try {
      const data = await fetchApi("/api/customer", { headers });
      if (data.code === 200) setCustomers(data.data?.list || data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); fetchCustomers(); }, []);

  const handleSubmit = async () => {
    try {
      const data = await fetchApi("/api/bom/material", { method: "POST", headers, body: JSON.stringify(form) });
      if (data.code === 200) { setShowForm(false); fetchData(); }
      else error(data.message);
    } catch (e) { error("保存失败"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">BOM物料管理</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ 新增物料</button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">导入BOM</button>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-3 mb-4 flex gap-3 items-end">
        <div><label className="block text-xs text-gray-500 mb-1">关键词</label><input className="border rounded px-3 py-1.5 text-sm w-48" value={search.keyword} onChange={e => setSearch({...search, keyword: e.target.value})} placeholder="编码/名称/图号" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">物料类型</label>
          <select className="border rounded px-3 py-1.5 text-sm" value={search.materialType} onChange={e => setSearch({...search, materialType: e.target.value})}>
            <option value="">全部</option>
            {Object.entries(typeMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button onClick={fetchData} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">搜索</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h3 className="font-medium mb-3">新增物料</h3>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">物料名称 *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.materialName} onChange={e => setForm({...form, materialName: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">图纸编码</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.drawingCode} onChange={e => setForm({...form, drawingCode: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">图号</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.drawingNo} onChange={e => setForm({...form, drawingNo: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">物料类型</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={form.materialType} onChange={e => setForm({...form, materialType: e.target.value})}>
                {Object.entries(typeMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">单位</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">规格</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.spec} onChange={e => setForm({...form, spec: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">所属客户</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={form.customerId} onChange={e => setForm({...form, customerId: e.target.value})}>
                <option value="">请选择</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.customerName}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">备注</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.remark} onChange={e => setForm({...form, remark: e.target.value})} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">内部编码</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">物料名称</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">图纸编码</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">图号</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">类型</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">规格</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">单位</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">客户</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">图纸</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">操作</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr> :
            materials.length === 0 ? <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr> :
            materials.map(m => (
              <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{m.internalCode || "-"}</td>
                <td className="px-3 py-2 font-medium">{m.materialName}</td>
                <td className="px-3 py-2 text-gray-500">{m.drawingCode || "-"}</td>
                <td className="px-3 py-2 text-gray-500">{m.drawingNo || "-"}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{typeMap[m.materialType] || m.materialType}</span></td>
                <td className="px-3 py-2">{m.spec || "-"}</td>
                <td className="px-3 py-2">{m.unit || "-"}</td>
                <td className="px-3 py-2">{m.customer?.customerName || "-"}</td>
                <td className="px-3 py-2"><button className="text-blue-600 hover:underline text-xs">查看图纸</button></td>
                <td className="px-3 py-2"><button className="text-blue-600 hover:underline text-xs mr-2">编辑</button><button className="text-red-600 hover:underline text-xs">删除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
