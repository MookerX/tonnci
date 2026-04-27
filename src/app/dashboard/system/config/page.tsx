"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/system/config", { headers });
        const data = await res.json();
        if (data.code === 200 && data.data) setConfigs(data.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/system/config", { method: "PUT", headers, body: JSON.stringify(configs) });
      const data = await res.json();
      warning(data.code === 200 ? "保存成功" : `保存失败: ${data.message}`);
    } catch (e) { error("保存失败"); }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-400">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">全局参数配置</h2>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? "保存中..." : "保存配置"}</button>
      </div>
      <div className="space-y-4">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-3 text-gray-700">编码规则</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">物料编码前缀</label><input className="w-full border rounded px-3 py-2 text-sm" value={configs.materialPrefix || ""} onChange={e => setConfigs({...configs, materialPrefix: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">订单编码前缀</label><input className="w-full border rounded px-3 py-2 text-sm" value={configs.orderPrefix || ""} onChange={e => setConfigs({...configs, orderPrefix: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">客户编码前缀</label><input className="w-full border rounded px-3 py-2 text-sm" value={configs.customerPrefix || ""} onChange={e => setConfigs({...configs, customerPrefix: e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">采购编码前缀</label><input className="w-full border rounded px-3 py-2 text-sm" value={configs.purchasePrefix || ""} onChange={e => setConfigs({...configs, purchasePrefix: e.target.value})} /></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-3 text-gray-700">上传限制</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">允许上传文件类型（逗号分隔）</label><input className="w-full border rounded px-3 py-2 text-sm" value={configs.allowedFileTypes || ""} onChange={e => setConfigs({...configs, allowedFileTypes: e.target.value})} placeholder=".pdf,.dwg,.xlsx,.doc" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">单文件最大大小(MB)</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={configs.maxFileSizeMB || ""} onChange={e => setConfigs({...configs, maxFileSizeMB: e.target.value})} /></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-3 text-gray-700">流程开关</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2"><input type="checkbox" checked={configs.enableProofread === "true"} onChange={e => setConfigs({...configs, enableProofread: e.target.checked ? "true" : "false"})} /><label className="text-sm">启用校对流程</label></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={configs.enableAudit === "true"} onChange={e => setConfigs({...configs, enableAudit: e.target.checked ? "true" : "false"})} /><label className="text-sm">启用审核流程</label></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={configs.enableCustomerProgress === "true"} onChange={e => setConfigs({...configs, enableCustomerProgress: e.target.checked ? "true" : "false"})} /><label className="text-sm">客户可查看工序进度</label></div>
          </div>
        </div>
      </div>
    </div>
  );
}
