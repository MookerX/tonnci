"use client";

import { useState, useEffect } from "react";

interface Dept {
  id: number;
  parentId?: number;
  deptName: string;
  deptCode?: string;
  leaderName?: string;
  sortOrder: number;
  status: string;
  remark?: string;
  userCount: number;
  childCount: number;
  children?: Dept[];
}

export default function SystemDeptPage() {
  const [deptTree, setDeptTree] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Dept | null>(null);
  const [form, setForm] = useState({
    parentId: undefined as number | undefined,
    deptName: "",
    deptCode: "",
    leaderName: "",
    sortOrder: 0,
    status: "active",
  });
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/dept", { headers });
      const data = await res.json();
      if (data.code === 200) {
        setDeptTree(data.data || []);
        // 默认展开第一层
        const ids = new Set<number>();
        data.data?.forEach((dept: Dept) => {
          ids.add(dept.id);
        });
        setExpandedIds(ids);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDepts(); }, []);

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleOpenForm = (dept?: Dept, parentId?: number) => {
    if (dept) {
      setEditingDept(dept);
      setForm({
        parentId: dept.parentId,
        deptName: dept.deptName,
        deptCode: dept.deptCode || "",
        leaderName: dept.leaderName || "",
        sortOrder: dept.sortOrder,
        status: dept.status,
      });
    } else {
      setEditingDept(null);
      setForm({
        parentId: parentId,
        deptName: "",
        deptCode: "",
        leaderName: "",
        sortOrder: 0,
        status: "active",
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.deptName) {
      alert("请输入部门名称");
      return;
    }
    try {
      let res;
      if (editingDept) {
        res = await fetch(`/api/system/dept/${editingDept.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch("/api/system/dept", {
          method: "POST",
          headers,
          body: JSON.stringify(form),
        });
      }
      const data = await res.json();
      if (data.code === 200) {
        setShowForm(false);
        fetchDepts();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("保存失败");
    }
  };

  const handleDelete = async (dept: Dept) => {
    if (dept.childCount > 0) {
      alert(`该部门下有 ${dept.childCount} 个子部门，请先删除子部门`);
      return;
    }
    if (dept.userCount > 0) {
      alert(`该部门下有 ${dept.userCount} 个用户，请先移走用户`);
      return;
    }
    if (!confirm(`确认删除部门 "${dept.deptName}" 吗？`)) return;
    try {
      const res = await fetch(`/api/system/dept/${dept.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.code === 200) {
        fetchDepts();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("删除失败");
    }
  };

  const handleToggleStatus = async (dept: Dept) => {
    const newStatus = dept.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/system/dept/${dept.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchDepts();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("操作失败");
    }
  };

  // 扁平化部门树（用于列表视图）
  const flattenDepts = (depts: Dept[], result: Dept[] = [], level: number = 0): Dept[] => {
    for (const dept of depts) {
      result.push({ ...dept, sortOrder: level }); // 用sortOrder临时存储层级
      if (dept.children && dept.children.length > 0) {
        flattenDepts(dept.children, result, level + 1);
      }
    }
    return result;
  };

  // 渲染树形节点
  const renderDeptNode = (dept: Dept, level: number = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedIds.has(dept.id);

    return (
      <div key={dept.id}>
        <div
          className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 border-b border-gray-100"
          style={{ marginLeft: level * 24 }}
        >
          <div className="flex items-center gap-2">
            {/* 展开/收起按钮 */}
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(dept.id)}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? "−" : "+"}
              </button>
            ) : (
              <span className="w-5 h-5" />
            )}
            {/* 部门信息 */}
            <span className="font-medium">{dept.deptName}</span>
            {dept.deptCode && <span className="text-xs text-gray-400 font-mono">({dept.deptCode})</span>}
            {dept.leaderName && <span className="text-xs text-gray-500">负责人: {dept.leaderName}</span>}
            {/* 统计信息 */}
            <span className="text-xs text-gray-400 ml-2">
              {dept.userCount > 0 && <span className="mr-2">用户: {dept.userCount}</span>}
              {dept.childCount > 0 && <span>子部门: {dept.childCount}</span>}
            </span>
            {/* 状态标签 */}
            <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${dept.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {dept.status === 'active' ? '正常' : '禁用'}
            </span>
          </div>
          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenForm(undefined, dept.id)}
              className="text-blue-600 hover:underline text-sm"
            >
              添加子部门
            </button>
            <button
              onClick={() => handleOpenForm(dept)}
              className="text-gray-600 hover:underline text-sm"
            >
              编辑
            </button>
            <button
              onClick={() => handleToggleStatus(dept)}
              className="text-yellow-600 hover:underline text-sm"
            >
              {dept.status === 'active' ? '禁用' : '启用'}
            </button>
            <button
              onClick={() => handleDelete(dept)}
              className="text-red-600 hover:underline text-sm"
            >
              删除
            </button>
          </div>
        </div>
        {/* 子部门 */}
        {hasChildren && isExpanded && dept.children!.map(child => renderDeptNode(child, level + 1))}
      </div>
    );
  };

  // 列表视图
  const flatDeptList = flattenDepts(deptTree, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">部门管理</h2>
        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex border rounded overflow-hidden mr-2">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 text-sm ${viewMode === 'tree' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              树形
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              列表
            </button>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            + 新增部门
          </button>
        </div>
      </div>

      {/* 部门列表 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-400">加载中...</div>
        ) : deptTree.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400">暂无数据</div>
        ) : viewMode === 'tree' ? (
          // 树形视图
          <div>
            {deptTree.map(dept => renderDeptNode(dept, 0))}
          </div>
        ) : (
          // 列表视图
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">部门名称</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">部门代码</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">负责人</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">用户数</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {flatDeptList.map(dept => (
                <tr key={dept.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2.5" style={{ paddingLeft: (dept.sortOrder + 1) * 20 }}>
                    {dept.sortOrder > 0 && <span className="text-gray-300 mr-1">├─</span>}
                    {dept.deptName}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{dept.deptCode || "-"}</td>
                  <td className="px-4 py-2.5">{dept.leaderName || "-"}</td>
                  <td className="px-4 py-2.5">{dept.userCount}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs rounded ${dept.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {dept.status === 'active' ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleOpenForm(undefined, dept.id)} className="text-blue-600 hover:underline text-sm mr-2">添加子部门</button>
                    <button onClick={() => handleOpenForm(dept)} className="text-gray-600 hover:underline text-sm mr-2">编辑</button>
                    <button onClick={() => handleToggleStatus(dept)} className="text-yellow-600 hover:underline text-sm mr-2">
                      {dept.status === 'active' ? '禁用' : '启用'}
                    </button>
                    <button onClick={() => handleDelete(dept)} className="text-red-600 hover:underline text-sm">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 部门表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{editingDept ? "编辑部门" : "新增部门"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">上级部门</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.parentId || ""}
                  onChange={e => setForm({...form, parentId: e.target.value ? parseInt(e.target.value) : undefined})}
                >
                  <option value="">无（顶级部门）</option>
                  {flatDeptList.filter(d => d.id !== editingDept?.id).map(d => (
                    <option key={d.id} value={d.id}>
                      {"　".repeat(d.sortOrder)}{d.deptName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">部门名称 *</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.deptName} onChange={e => setForm({...form, deptName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">部门代码</label>
                <input className="w-full border rounded px-3 py-2 text-sm font-mono" value={form.deptCode} onChange={e => setForm({...form, deptCode: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">负责人</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.leaderName} onChange={e => setForm({...form, leaderName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">排序</label>
                <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.sortOrder} onChange={e => setForm({...form, sortOrder: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
