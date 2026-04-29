"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/utils/fetch";
import { PagePermission } from "@/components/AuthProvider";

export default function SystemLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await fetchApi(`/api/system/log?page=${page}&pageSize=20`, { headers });
        if (data.code === 200) setLogs(data.data?.list || data.data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchLogs();
  }, [page]);

  const typeMap: Record<string, string> = { create: "新增", update: "修改", delete: "删除", login: "登录", logout: "登出", import: "导入", export: "导出" };

  // 判断是否有详细数据
  const hasDetail = (log: any) => log.oldData || log.newData;

  // 渲染详情对比
  const renderDetail = (log: any) => {
    const { oldData, newData } = log;
    if (!oldData && !newData) return null;

    // 获取所有变化的字段
    const fields: { key: string; oldVal: any; newVal: any }[] = [];
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
    
    for (const key of allKeys) {
      // 跳过不需要显示的字段
      if (['id', 'createdAt', 'updatedAt', 'createdBy', 'modifiedBy', 'isDelete', 'password', 'roleIds', 'menuIds'].includes(key)) {
        continue;
      }
      const oldVal = oldData?.[key];
      const newVal = newData?.[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        fields.push({ key, oldVal, newVal });
      }
    }

    if (fields.length === 0) return null;

    return (
      <div className="p-4 bg-gray-50 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-600 mb-2">修改前</h4>
            <div className="space-y-1 text-xs">
              {fields.map(({ key, oldVal }) => (
                <div key={key}>
                  <span className="text-gray-500">{key}: </span>
                  <span className="text-red-600">{oldVal === null || oldVal === undefined ? '(空)' : String(oldVal)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-600 mb-2">修改后</h4>
            <div className="space-y-1 text-xs">
              {fields.map(({ key, newVal }) => (
                <div key={key}>
                  <span className="text-gray-500">{key}: </span>
                  <span className="text-green-600">{newVal === null || newVal === undefined ? '(空)' : String(newVal)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PagePermission permission="system:log:query">
            <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">操作日志</h2>
      </div>
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作人</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作模块</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作类型</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作描述</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">IP地址</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作时间</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr> :
            logs.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr> :
            logs.map(log => (
              <React.Fragment key={log.id}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2.5">{log.operatorName || log.operator || "-"}</td>
                  <td className="px-4 py-2.5">{log.module || "-"}</td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{typeMap[log.action || log.type] || log.action || log.type || "-"}</span></td>
                  <td className="px-4 py-2.5 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{log.description || log.desc || "-"}</span>
                      {hasDetail(log) && (
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs whitespace-nowrap"
                        >
                          {expandedId === log.id ? "收起" : "查看详情"}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{log.ip || "-"}</td>
                  <td className="px-4 py-2.5 text-gray-500">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</td>
                </tr>
                {expandedId === log.id && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      {renderDetail(log)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-2 mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" disabled={page === 1}>上一页</button>
        <span className="px-3 py-1.5 text-sm text-gray-600">第 {page} 页</span>
        <button onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">下一页</button>
      </div>
    </div>
  </PagePermission>
    );
}
