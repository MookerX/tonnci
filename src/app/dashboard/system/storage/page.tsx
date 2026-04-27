"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchApi } from "@/lib/utils/fetch";

interface StorageItem {
  id: number;
  storageName: string;
  storageType: string;
  basePath?: string;
  fileTypes: string;
  maxFileSize: number;
  isDefault: boolean;
  status: string;
  remark?: string;
}

interface NasItem {
  id: number;
  deviceName: string;
  deviceType: string;
  host: string;
  port: number;
  username?: string;
  sharePath: string;
  storageTypes?: string[];
  isDefault: boolean;
  status: string;
  remark?: string;
}

export default function SystemStoragePage() {
  const [storages, setStorages] = useState<StorageItem[]>([]);
  const [nasDevices, setNasDevices] = useState<NasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"storage" | "nas">("storage");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StorageItem | null>(null);
  const [form, setForm] = useState({
    storageName: "",
    storageType: "local",
    basePath: "",
    fileTypes: "",
    maxFileSize: 10485760,
    isDefault: false,
    status: "active",
    remark: "",
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storageData, nasData] = await Promise.all([
        fetchApi("/api/system/storage-config", { headers }),
        fetchApi("/api/system/storage", { headers }),
      ]);
      if (storageData.code === 200) setStorages(storageData.data || []);
      if (nasData.code === 200) setNasDevices(nasData.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenForm = (item?: StorageItem) => {
    if (item) {
      setEditingItem(item);
      setForm({
        storageName: item.storageName,
        storageType: item.storageType,
        basePath: item.basePath || "",
        fileTypes: item.fileTypes,
        maxFileSize: item.maxFileSize,
        isDefault: item.isDefault,
        status: item.status,
        remark: item.remark || "",
      });
    } else {
      setEditingItem(null);
      setForm({
        storageName: "",
        storageType: "local",
        basePath: "",
        fileTypes: "",
        maxFileSize: 10485760,
        isDefault: false,
        status: "active",
        remark: "",
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.storageName) { warning("请输入存储名称"); return; }
    if (!form.fileTypes) { warning("请输入绑定文件类型"); return; }
    try {
      let data;
      if (editingItem) {
        data = await fetchApi(`/api/system/storage-config/${editingItem.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(form),
        });
      } else {
        data = await fetchApi("/api/system/storage-config", {
          method: "POST",
          headers,
          body: JSON.stringify(form),
        });
      }
      if (data.code === 200) {
        setShowForm(false);
        setEditingItem(null);
        fetchData();
      } else {
        error(data.message);
      }
    } catch (e) {
      error("保存失败");
    }
  };

  const handleDelete = async (item: StorageItem) => {
    if (!confirm(`确认删除存储 "${item.storageName}" 吗？`)) return;
    try {
      const data = await fetchApi(`/api/system/storage-config/${item.id}`, { method: "DELETE", headers });
      if (data.code === 200) {
        fetchData();
      } else {
        error(data.message);
      }
    } catch (e) {
      error("删除失败");
    }
  };

  const handleToggleStatus = async (item: StorageItem) => {
    const newStatus = item.status === "active" ? "inactive" : "active";
    const action = newStatus === "active" ? "启用" : "禁用";
    if (!confirm(`确认${action}存储 "${item.storageName}" 吗？`)) return;
    try {
      const data = await fetchApi(`/api/system/storage-config/${item.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (data.code === 200) {
        fetchData();
      } else {
        error(data.message);
      }
    } catch (e) {
      error("操作失败");
    }
  };

  const storageTypeMap: Record<string, string> = {
    local: "本地存储",
    nas: "NAS存储",
    oss: "对象存储",
  };

  const nasTypeMap: Record<string, string> = {
    synology: "群晖NAS",
    qnap: "威联通NAS",
    local: "本地",
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
    return bytes + " B";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">存储管理</h2>
        {activeTab === "storage" && (
          <button onClick={() => handleOpenForm()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            + 添加存储
          </button>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab("storage")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "storage"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          存储配置
        </button>
        <button
          onClick={() => setActiveTab("nas")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "nas"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          NAS设备
        </button>
      </div>

      {/* 存储配置 Tab */}
      {activeTab === "storage" && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">存储名称</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">存储类型</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">存储路径</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">绑定文件类型</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">最大文件大小</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">默认</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
              ) : storages.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
              ) : (
                storages.map(s => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{s.storageName}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        {storageTypeMap[s.storageType] || s.storageType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{s.basePath || "-"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {s.fileTypes.split(",").map((t, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{t.trim()}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{formatFileSize(s.maxFileSize)}</td>
                    <td className="px-4 py-2.5">
                      {s.isDefault ? <span className="text-green-600 text-xs font-medium">默认</span> : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs ${s.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {s.status === "active" ? "启用" : "禁用"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleOpenForm(s)} className="text-blue-600 hover:underline text-sm mr-2">编辑</button>
                      <button onClick={() => handleToggleStatus(s)} className="text-gray-600 hover:underline text-sm mr-2">
                        {s.status === "active" ? "禁用" : "启用"}
                      </button>
                      <button onClick={() => handleDelete(s)} className="text-red-600 hover:underline text-sm">删除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* NAS设备 Tab */}
      {activeTab === "nas" && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">设备名称</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">类型</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">地址</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">共享目录</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
              ) : nasDevices.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
              ) : (
                nasDevices.map(n => (
                  <tr key={n.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{n.deviceName}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        {nasTypeMap[n.deviceType] || n.deviceType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{n.host}:{n.port}</td>
                    <td className="px-4 py-2.5">{n.sharePath || "-"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs ${n.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {n.status === "active" ? "启用" : "禁用"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 存储配置表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{editingItem ? "编辑存储配置" : "添加存储配置"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">存储名称 *</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.storageName}
                  onChange={e => setForm({ ...form, storageName: e.target.value })}
                  placeholder="如：系统图片存储"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">存储类型</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.storageType}
                  onChange={e => setForm({ ...form, storageType: e.target.value })}
                >
                  <option value="local">本地存储</option>
                  <option value="nas">NAS存储</option>
                  <option value="oss">对象存储</option>
                </select>
              </div>
              {form.storageType === "local" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">存储路径</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form.basePath}
                    onChange={e => setForm({ ...form, basePath: e.target.value })}
                    placeholder="如：/workspace/projects/storage/images"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">绑定文件类型（逗号分隔） *</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.fileTypes}
                  onChange={e => setForm({ ...form, fileTypes: e.target.value })}
                  placeholder="如：.png,.jpg,.jpeg,.gif,.svg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">最大文件大小（字节）</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.maxFileSize}
                  onChange={e => setForm({ ...form, maxFileSize: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-400 mt-1">当前：{formatFileSize(form.maxFileSize)}</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                  />
                  <span className="text-sm">设为默认存储</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">状态：</span>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">启用</option>
                    <option value="inactive">禁用</option>
                  </select>
                </label>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">备注</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.remark}
                  onChange={e => setForm({ ...form, remark: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
