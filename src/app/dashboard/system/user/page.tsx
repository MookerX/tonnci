"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";

interface User {
  id: number;
  username: string;
  realName?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  deptId?: number;
  roleIds: number[];
  status: string;
  createdAt: string;
  roles?: { id: number; roleCode: string; roleName: string }[];
  dept?: { id: number; deptName: string };
}

interface Dept {
  id: number;
  parentId?: number;
  deptName: string;
  deptCode?: string;
  children?: Dept[];
}

interface Role {
  id: number;
  roleName: string;
  roleCode: string;
}

export default function SystemUserPage() {
  const { success, error, warning } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    realName: "",
    phone: "",
    email: "",
    deptId: undefined as number | undefined,
    roleIds: [] as number[],
    status: "active",
  });
  const [keyword, setKeyword] = useState("");
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({
    show: false, title: "", message: "", onConfirm: () => {},
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const flattenDepts = (depts: Dept[], result: Dept[] = []): Dept[] => {
    for (const dept of depts) {
      result.push(dept);
      if (dept.children && dept.children.length > 0) flattenDepts(dept.children, result);
    }
    return result;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, rolesRes] = await Promise.all([
        fetch("/api/system/user", { headers }),
        fetch("/api/system/dept", { headers }),
        fetch("/api/system/role", { headers }),
      ]);
      const usersData = await usersRes.json();
      const deptsData = await deptsRes.json();
      const rolesData = await rolesRes.json();
      if (usersData.code === 200) setUsers(usersData.data?.list || usersData.data || []);
      if (deptsData.code === 200) setDepts(deptsData.data || []);
      if (rolesData.code === 200) setRoles(rolesData.data?.list || rolesData.data || []);
    } catch (e) {
      error("加载数据失败");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const currentUserId = typeof window !== "undefined" ? (() => {
    const userStr = localStorage.getItem("user");
    if (userStr) { try { return JSON.parse(userStr).id; } catch {} }
    return null;
  })() : null;

  const handleOpenForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setForm({
        username: user.username,
        password: "",
        realName: user.realName || "",
        phone: user.phone || "",
        email: user.email || "",
        deptId: user.deptId,
        roleIds: user.roleIds || [],
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setForm({ username: "", password: "", realName: "", phone: "", email: "", deptId: undefined, roleIds: [], status: "active" });
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!editingUser && !form.username) { warning("请输入用户名"); return; }
    if (!editingUser && (!form.password || form.password.length < 6)) { warning("密码至少6个字符"); return; }
    if (form.password && form.password.length < 6) { warning("密码至少6个字符"); return; }
    try {
      let res;
      if (editingUser) {
        res = await fetch(`/api/system/user/${editingUser.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            realName: form.realName || null,
            phone: form.phone || null,
            email: form.email || null,
            deptId: form.deptId || null,
            roleIds: form.roleIds,
            status: form.status,
          }),
        });
      } else {
        res = await fetch("/api/system/user", {
          method: "POST",
          headers,
          body: JSON.stringify({ ...form, email: form.email || null, deptId: form.deptId || null }),
        });
      }
      const data = await res.json();
      if (data.code === 200) {
        success(data.message);
        setShowForm(false);
        fetchData();
      } else {
        error(data.message);
      }
    } catch (e) {
      error("保存失败");
    }
  };

  const handleResetPassword = async () => {
    if (!resetPwdUser) return;
    if (!newPassword) { warning("请输入新密码"); return; }
    if (newPassword.length < 6) { warning("密码至少6个字符"); return; }
    try {
      const res = await fetch(`/api/system/user/${resetPwdUser.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ action: "resetPassword", newPassword }),
      });
      const data = await res.json();
      if (data.code === 200) {
        success(data.message);
        setShowResetPwd(false);
        setResetPwdUser(null);
        setNewPassword("");
      } else {
        error(data.message);
      }
    } catch (e) {
      error("重置失败");
    }
  };

  const handleToggleStatus = (user: User) => {
    if (user.id === currentUserId) { warning("不能对当前登录用户进行状态操作"); return; }
    const newStatus = user.status === "active" ? "disabled" : "active";
    const action = newStatus === "active" ? "启用" : "禁用";
    setConfirmAction({
      show: true,
      title: `确认${action}`,
      message: `确认${action}用户 "${user.realName || user.username}" 吗？`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/system/user/${user.id}`, { method: "PUT", headers, body: JSON.stringify({ status: newStatus }) });
          const data = await res.json();
          if (data.code === 200) { success(data.message); fetchData(); } else { error(data.message); }
        } catch { error("操作失败"); }
        setConfirmAction(prev => ({ ...prev, show: false }));
      },
    });
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUserId) { warning("不能删除当前登录用户"); return; }
    setConfirmAction({
      show: true,
      title: "确认删除",
      message: `确认删除用户 "${user.realName || user.username}" 吗？`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/system/user/${user.id}`, { method: "DELETE", headers });
          const data = await res.json();
          if (data.code === 200) { success(data.message); fetchData(); } else { error(data.message); }
        } catch { error("删除失败"); }
        setConfirmAction(prev => ({ ...prev, show: false }));
      },
    });
  };

  const filteredUsers = users.filter(u => {
    if (!keyword) return true;
    return u.username.includes(keyword) || (u.realName && u.realName.includes(keyword)) || (u.phone && u.phone.includes(keyword));
  });

  const flatDepts = flattenDepts(depts);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">用户管理</h2>
        <button onClick={() => handleOpenForm()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + 添加用户
        </button>
      </div>

      {/* 搜索 */}
      <div className="flex items-center mb-4 gap-4">
        <input type="text" placeholder="搜索用户名、姓名、电话..." className="border rounded px-3 py-2 text-sm w-64" value={keyword} onChange={e => setKeyword(e.target.value)} />
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">头像</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">用户名</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">姓名</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">部门</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">角色</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">电话</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <img src="/logo.png" alt="默认" className="w-full h-full object-contain" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-medium">{user.username}</td>
                  <td className="px-4 py-2.5">{user.realName || "-"}</td>
                  <td className="px-4 py-2.5">{user.dept?.deptName || "-"}</td>
                  <td className="px-4 py-2.5">{user.roles?.map(r => r.roleName).join(", ") || "-"}</td>
                  <td className="px-4 py-2.5">{user.phone || "-"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs rounded ${user.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {user.status === "active" ? "正常" : "禁用"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleOpenForm(user)} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 border border-blue-200">编辑</button>
                      {user.id !== currentUserId && (
                        <>
                          <button onClick={() => handleToggleStatus(user)} className={`px-2.5 py-1 rounded text-xs border ${user.status === "active" ? "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100" : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"}`}>
                            {user.status === "active" ? "禁用" : "启用"}
                          </button>
                          <button onClick={() => { setResetPwdUser(user); setShowResetPwd(true); }} className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded text-xs hover:bg-orange-100 border border-orange-200">重置密码</button>
                          <button onClick={() => handleDelete(user)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 border border-red-200">删除</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 用户表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{editingUser ? "编辑用户" : "添加用户"}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">用户名 {editingUser ? "(不可修改)" : "*"}</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.username} onChange={e => setForm({...form, username: e.target.value})} disabled={!!editingUser} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">密码 {editingUser ? "(留空不修改)" : "*"}</label>
                <input type="password" className="w-full border rounded px-3 py-2 text-sm" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editingUser ? "留空不修改" : ""} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">姓名</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.realName} onChange={e => setForm({...form, realName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">电话</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">部门</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.deptId || ""} onChange={e => setForm({...form, deptId: e.target.value ? parseInt(e.target.value) : undefined})}>
                  <option value="">请选择</option>
                  {flatDepts.map(d => <option key={d.id} value={d.id}>{d.deptName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">状态</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="active">正常</option>
                  <option value="disabled">禁用</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">角色</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => (
                    <label key={role.id} className="flex items-center gap-1 px-2 py-1 border rounded cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={form.roleIds.includes(role.id)} onChange={e => {
                        if (e.target.checked) setForm({...form, roleIds: [...form.roleIds, role.id]});
                        else setForm({...form, roleIds: form.roleIds.filter(id => id !== role.id)});
                      }} />
                      <span className="text-sm">{role.roleName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {showResetPwd && resetPwdUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">重置密码</h3>
            <p className="text-sm text-gray-600 mb-4">用户: {resetPwdUser.realName || resetPwdUser.username}</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">新密码 (至少6位) *</label>
              <input type="password" className="w-full border rounded px-3 py-2 text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="请输入新密码" autoFocus />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowResetPwd(false); setResetPwdUser(null); setNewPassword(""); }} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
              <button onClick={handleResetPassword} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">确认重置</button>
            </div>
          </div>
        </div>
      )}

      {/* 确认操作弹窗 */}
      {confirmAction.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">{confirmAction.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{confirmAction.message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(prev => ({ ...prev, show: false }))} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
              <button onClick={confirmAction.onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
