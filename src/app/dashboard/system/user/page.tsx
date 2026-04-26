"use client";

import { useState, useEffect } from "react";

// 用户管理页面
export default function SystemUserPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ username: "", realName: "", phone: "", gender: "male", deptId: "", roleIds: "", status: "active", remark: "" });
  const [depts, setDepts] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/system/user?keyword=${keyword}`, { headers });
      const data = await res.json();
      if (data.code === 200) setUsers(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchDeptsAndRoles = async () => {
    try {
      const [deptRes, roleRes] = await Promise.all([
        fetch("/api/system/dept", { headers }),
        fetch("/api/system/role", { headers }),
      ]);
      const deptData = await deptRes.json();
      const roleData = await roleRes.json();
      if (deptData.code === 200) setDepts(deptData.data || []);
      if (roleData.code === 200) setRoles(roleData.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchUsers(); fetchDeptsAndRoles(); }, []);

  const handleAdd = async () => {
    try {
      const res = await fetch("/api/system/user", { method: "POST", headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.code === 200) { setShowAdd(false); setForm({ username: "", realName: "", phone: "", gender: "male", deptId: "", roleIds: "", status: "active", remark: "" }); fetchUsers(); }
      else alert(data.message);
    } catch (e) { alert("操作失败"); }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/system/user/${editUser.id}`, { method: "PUT", headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.code === 200) { setEditUser(null); fetchUsers(); }
      else alert(data.message);
    } catch (e) { alert("操作失败"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此用户？")) return;
    try {
      const res = await fetch(`/api/system/user/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.code === 200) fetchUsers();
      else alert(data.message);
    } catch (e) { alert("操作失败"); }
  };

  const openEdit = (u: any) => {
    setForm({ username: u.username, realName: u.realName || "", phone: u.phone || "", gender: u.gender || "male", deptId: u.deptId || "", roleIds: u.roleIds || "", status: u.status || "active", remark: u.remark || "" });
    setEditUser(u);
  };

  const statusMap: Record<string, string> = { active: "启用", disabled: "禁用" };
  const genderMap: Record<string, string> = { male: "男", female: "女" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">用户管理</h2>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-1.5 text-sm" placeholder="搜索用户名/姓名" value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchUsers()} />
          <button onClick={fetchUsers} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">查询</button>
          <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">新增用户</button>
        </div>
      </div>

      {(showAdd || editUser) && (
        <div className="bg-white border rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-3">{editUser ? "编辑用户" : "新增用户"}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">用户名 *</label><input className="w-full border rounded px-2 py-1.5 text-sm" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={!!editUser} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">姓名 *</label><input className="w-full border rounded px-2 py-1.5 text-sm" value={form.realName} onChange={e => setForm({ ...form, realName: e.target.value })} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">电话</label><input className="w-full border rounded px-2 py-1.5 text-sm" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">性别</label><select className="w-full border rounded px-2 py-1.5 text-sm" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="male">男</option><option value="female">女</option></select></div>
            <div><label className="block text-xs text-gray-500 mb-1">部门</label><select className="w-full border rounded px-2 py-1.5 text-sm" value={form.deptId} onChange={e => setForm({ ...form, deptId: e.target.value })}><option value="">请选择</option>{depts.map(d => <option key={d.id} value={d.id}>{d.deptName}</option>)}</select></div>
            <div><label className="block text-xs text-gray-500 mb-1">状态</label><select className="w-full border rounded px-2 py-1.5 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">启用</option><option value="disabled">禁用</option></select></div>
            <div className="col-span-3"><label className="block text-xs text-gray-500 mb-1">备注</label><input className="w-full border rounded px-2 py-1.5 text-sm" value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={editUser ? handleUpdate : handleAdd} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
            <button onClick={() => { setShowAdd(false); setEditUser(null); }} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">取消</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">用户名</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">姓名</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">电话</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">性别</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">创建时间</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr> :
            users.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr> :
            users.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2.5">{u.username}</td>
                <td className="px-4 py-2.5">{u.realName}</td>
                <td className="px-4 py-2.5">{u.phone || "-"}</td>
                <td className="px-4 py-2.5">{genderMap[u.gender] || "-"}</td>
                <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{statusMap[u.status] || u.status}</span></td>
                <td className="px-4 py-2.5 text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</td>
                <td className="px-4 py-2.5"><button onClick={() => openEdit(u)} className="text-blue-600 hover:underline mr-2">编辑</button><button onClick={() => handleDelete(u.id)} className="text-red-600 hover:underline">删除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
