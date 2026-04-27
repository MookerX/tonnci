"use client";

import { useState, useEffect } from "react";

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
  leaderName?: string;
  userCount: number;
  children?: Dept[];
}

interface Role {
  id: number;
  roleName: string;
  roleCode: string;
  status: string;
  userCount: number;
}

export default function SystemUserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
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

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  // 扁平化部门树
  const flattenDepts = (depts: Dept[], result: Dept[] = []): Dept[] => {
    for (const dept of depts) {
      result.push(dept);
      if (dept.children && dept.children.length > 0) {
        flattenDepts(dept.children, result);
      }
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
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelect = (id: number) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleBatchAction = async (action: 'enable' | 'disable' | 'delete') => {
    if (selectedUsers.length === 0) {
      alert("请先选择用户");
      return;
    }
    if (!confirm(`确认要${action === 'enable' ? '启用' : action === 'disable' ? '禁用' : '删除'}选中的 ${selectedUsers.length} 个用户吗？`)) {
      return;
    }
    try {
      const res = await fetch("/api/system/user", {
        method: "PUT",
        headers,
        body: JSON.stringify({ userIds: selectedUsers, action }),
      });
      const data = await res.json();
      if (data.code === 200) {
        alert(data.message);
        setSelectedUsers([]);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("操作失败");
    }
  };

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
      setForm({
        username: "",
        password: "",
        realName: "",
        phone: "",
        email: "",
        deptId: undefined,
        roleIds: [],
        status: "active",
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!editingUser && !form.username) {
      alert("请输入用户名");
      return;
    }
    if (!editingUser && !form.password) {
      alert("请输入密码");
      return;
    }
    try {
      let res;
      if (editingUser) {
        res = await fetch(`/api/system/user/${editingUser.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            realName: form.realName,
            phone: form.phone,
            email: form.email,
            deptId: form.deptId,
            roleIds: form.roleIds,
            status: form.status,
          }),
        });
      } else {
        res = await fetch("/api/system/user", {
          method: "POST",
          headers,
          body: JSON.stringify(form),
        });
      }
      const data = await res.json();
      if (data.code === 200) {
        setShowForm(false);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("保存失败");
    }
  };

  const handleResetPassword = async () => {
    if (!resetPwdUser) return;
    if (!newPassword) {
      alert("请输入新密码");
      return;
    }
    if (newPassword.length < 6) {
      alert("密码至少6个字符");
      return;
    }
    try {
      const res = await fetch(`/api/system/user/${resetPwdUser.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          action: "resetPassword",
          newPassword: newPassword,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        alert(data.message);
        setShowResetPwd(false);
        setResetPwdUser(null);
        setNewPassword("");
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("重置失败");
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`确认删除用户 "${user.realName || user.username}" 吗？`)) return;
    try {
      const res = await fetch(`/api/system/user/${user.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.code === 200) {
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("删除失败");
    }
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
      </div>

      {/* 搜索和批量操作 */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="搜索用户名、姓名、电话..."
            className="border rounded px-3 py-2 text-sm w-64"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>
        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">已选 {selectedUsers.length} 项</span>
            <button onClick={() => handleBatchAction('enable')} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">启用</button>
            <button onClick={() => handleBatchAction('disable')} className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">禁用</button>
            <button onClick={() => handleBatchAction('delete')} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">删除</button>
          </div>
        )}
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2.5 text-left w-10">
                <input type="checkbox" checked={selectedUsers.length === users.length && users.length > 0} onChange={handleSelectAll} />
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">用户名</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">姓名</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">部门</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">角色</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">电话</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">邮箱</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => handleSelect(user.id)} />
                  </td>
                  <td className="px-4 py-2.5 font-medium">{user.username}</td>
                  <td className="px-4 py-2.5">{user.realName || "-"}</td>
                  <td className="px-4 py-2.5">{user.dept?.deptName || "-"}</td>
                  <td className="px-4 py-2.5">
                    {user.roles?.map(r => r.roleName).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-2.5">{user.phone || "-"}</td>
                  <td className="px-4 py-2.5">{user.email || "-"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs rounded ${user.status === 'active' ? 'bg-green-100 text-green-700' : user.status === 'disabled' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'}`}>
                      {user.status === 'active' ? '正常' : user.status === 'disabled' ? '禁用' : '锁定'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => { setResetPwdUser(user); setShowResetPwd(true); }} className="text-blue-600 hover:underline text-sm mr-2">重置密码</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
