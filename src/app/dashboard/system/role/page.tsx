"use client";

import { useState, useEffect } from "react";

interface Role {
  id: number;
  roleName: string;
  roleCode: string;
  dataScope: string;
  status: string;
  sortOrder: number;
  remark?: string;
  userCount: number;
}

interface Menu {
  id: number;
  parentId?: number;
  menuName: string;
  menuType: string;
  path?: string;
  permission?: string;
  children?: Menu[];
  checked?: boolean;
  halfChecked?: boolean;
}

interface Dept {
  id: number;
  deptName: string;
  children?: Dept[];
}

const dataScopeOptions = [
  { value: 'all', label: '全部数据权限' },
  { value: 'dept', label: '本部门数据权限' },
  { value: 'deptAndChild', label: '本部门及子部门数据权限' },
  { value: 'custom', label: '自定义数据权限' },
];

const actionOptions = ['query', 'create', 'update', 'delete', 'upload', 'download'];
const actionLabels: Record<string, string> = {
  query: '查询',
  create: '新增',
  update: '编辑',
  delete: '删除',
  upload: '上传',
  download: '下载',
};

export default function SystemRolePage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPermForm, setShowPermForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState({
    roleName: "",
    roleCode: "",
    dataScope: "custom",
    status: "active",
    sortOrder: 0,
    remark: "",
  });
  const [keyword, setKeyword] = useState("");
  // 权限配置相关
  const [menuTree, setMenuTree] = useState<Menu[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
  const [menuPermissions, setMenuPermissions] = useState<Record<number, string[]>>({});
  const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([]);
  const [deptTree, setDeptTree] = useState<Dept[]>([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  // 扁平化菜单树
  const flattenMenus = (menus: Menu[], result: Menu[] = []): Menu[] => {
    for (const menu of menus) {
      result.push(menu);
      if (menu.children && menu.children.length > 0) {
        flattenMenus(menu.children, result);
      }
    }
    return result;
  };

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

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/role", { headers });
      const data = await res.json();
      if (data.code === 200) setRoles(data.data?.list || data.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleOpenForm = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setForm({
        roleName: role.roleName,
        roleCode: role.roleCode,
        dataScope: role.dataScope,
        status: role.status,
        sortOrder: role.sortOrder,
        remark: role.remark || "",
      });
    } else {
      setEditingRole(null);
      setForm({ roleName: "", roleCode: "", dataScope: "custom", status: "active", sortOrder: 0, remark: "" });
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.roleName || !form.roleCode) {
      alert("请填写完整信息");
      return;
    }
    try {
      let res;
      if (editingRole) {
        res = await fetch(`/api/system/role/${editingRole.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch("/api/system/role", {
          method: "POST",
          headers,
          body: JSON.stringify(form),
        });
      }
      const data = await res.json();
      if (data.code === 200) {
        setShowForm(false);
        fetchRoles();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("保存失败");
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.roleCode === 'super_admin') {
      alert("不能删除超级管理员角色");
      return;
    }
    if (!confirm(`确认删除角色 "${role.roleName}" 吗？`)) return;
    try {
      const res = await fetch(`/api/system/role/${role.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.code === 200) {
        fetchRoles();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("删除失败");
    }
  };

  // 打开权限配置
  const handleOpenPermission = async (role: Role) => {
    if (role.roleCode === 'super_admin') {
      alert("超级管理员拥有全部权限，无需配置");
      return;
    }
    setEditingRole(role);

    // 获取菜单树和角色权限
    try {
      const [menuRes, roleDetailRes] = await Promise.all([
        fetch(`/api/system/menu?type=perms&roleId=${role.id}`, { headers }),
        fetch(`/api/system/role/${role.id}`, { headers }),
      ]);
      const menuData = await menuRes.json();
      const roleData = await roleDetailRes.json();

      if (menuData.code === 200) {
        setMenuTree(menuData.data?.tree || []);
        setSelectedMenuIds(menuData.data?.selectedMenuIds || []);
      }

      if (roleData.code === 200) {
        // 设置操作权限
        const perms = roleData.data?.permissions || [];
        const permMap: Record<number, string[]> = {};
        perms.forEach((p: any) => {
          permMap[p.menuId] = p.actions;
        });
        setMenuPermissions(permMap);
        setSelectedDeptIds(roleData.data?.deptIds || []);
      }

      // 获取部门树
      const deptRes = await fetch("/api/system/dept", { headers });
      const deptData = await deptRes.json();
      if (deptData.code === 200) {
        setDeptTree(deptData.data || []);
      }

      setShowPermForm(true);
    } catch (e) {
      alert("加载权限配置失败");
    }
  };

  const handleToggleMenu = (menuId: number, checked: boolean) => {
    if (checked) {
      setSelectedMenuIds([...selectedMenuIds, menuId]);
    } else {
      setSelectedMenuIds(selectedMenuIds.filter(id => id !== menuId));
    }
  };

  const handleToggleAction = (menuId: number, action: string) => {
    const current = menuPermissions[menuId] || [];
    if (current.includes(action)) {
      setMenuPermissions({
        ...menuPermissions,
        [menuId]: current.filter(a => a !== action),
      });
    } else {
      setMenuPermissions({
        ...menuPermissions,
        [menuId]: [...current, action],
      });
    }
  };

  const handleSubmitPermission = async () => {
    if (!editingRole) return;
    try {
      // 收集权限配置
      const permissions = Object.entries(menuPermissions)
        .filter(([_, actions]) => actions.length > 0)
        .map(([menuId, actions]) => ({
          menuId: parseInt(menuId),
          actions,
        }));

      const res = await fetch(`/api/system/role/${editingRole.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          action: "assignPermission",
          menuIds: selectedMenuIds,
          permissions,
          deptIds: selectedDeptIds,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setShowPermForm(false);
        alert("权限分配成功");
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("保存权限失败");
    }
  };

  // 渲染菜单树节点
  const renderMenuNode = (menu: Menu, level: number = 0) => {
    const isSelected = selectedMenuIds.includes(menu.id);
    const hasChildren = menu.children && menu.children.length > 0;

    return (
      <div key={menu.id} style={{ marginLeft: level * 20 }}>
        <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 hover:bg-gray-50">
          {hasChildren && <span className="text-gray-400">├─</span>}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => handleToggleMenu(menu.id, e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">{menu.menuName}</span>
          {menu.menuType === 'button' && (
            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-xs rounded">按钮</span>
          )}
          {menu.menuType === 'directory' && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">目录</span>
          )}
        </div>
        {/* 操作权限 */}
        {isSelected && menu.menuType === 'menu' && (
          <div className="flex items-center gap-2 py-1 ml-8" style={{ marginLeft: (level + 1) * 20 }}>
            {actionOptions.map(action => (
              <label key={action} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded cursor-pointer hover:bg-gray-200">
                <input
                  type="checkbox"
                  checked={(menuPermissions[menu.id] || []).includes(action)}
                  onChange={() => handleToggleAction(menu.id, action)}
                />
                <span className="text-xs">{actionLabels[action]}</span>
              </label>
            ))}
          </div>
        )}
        {/* 子菜单 */}
        {hasChildren && menu.children!.map(child => renderMenuNode(child, level + 1))}
      </div>
    );
  };

  // 渲染部门树节点
  const renderDeptNode = (dept: Dept, level: number = 0) => {
    const isSelected = selectedDeptIds.includes(dept.id);
    const hasChildren = dept.children && dept.children.length > 0;

    return (
      <div key={dept.id} style={{ marginLeft: level * 20 }}>
        <div className="flex items-center gap-2 py-1 border-b border-gray-100 hover:bg-gray-50">
          {hasChildren && <span className="text-gray-400">├─</span>}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => {
              if (e.target.checked) {
                setSelectedDeptIds([...selectedDeptIds, dept.id]);
              } else {
                setSelectedDeptIds(selectedDeptIds.filter(id => id !== dept.id));
              }
            }}
            className="rounded"
          />
          <span className="text-sm">{dept.deptName}</span>
        </div>
        {hasChildren && dept.children!.map(child => renderDeptNode(child, level + 1))}
      </div>
    );
  };

  const filteredRoles = roles.filter(r =>
    !keyword || r.roleName.includes(keyword) || r.roleCode.includes(keyword)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">角色管理</h2>
        <button onClick={() => handleOpenForm()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + 新增角色
        </button>
      </div>

      {/* 搜索 */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="搜索角色名称或代码..."
          className="border rounded px-3 py-2 text-sm w-64"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
      </div>

      {/* 角色列表 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">角色名称</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">角色代码</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">数据权限</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">用户数</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : filteredRoles.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
            ) : (
              filteredRoles.map(role => (
                <tr key={role.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{role.roleName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{role.roleCode}</td>
                  <td className="px-4 py-2.5">
                    {dataScopeOptions.find(o => o.value === role.dataScope)?.label || role.dataScope}
                  </td>
                  <td className="px-4 py-2.5">{role.userCount}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs rounded ${role.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {role.status === 'active' ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleOpenPermission(role)} className="text-blue-600 hover:underline text-sm mr-2">权限配置</button>
                    <button onClick={() => handleOpenForm(role)} className="text-gray-600 hover:underline text-sm mr-2">编辑</button>
                    <button onClick={() => handleDelete(role)} className="text-red-600 hover:underline text-sm">删除</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 角色表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{editingRole ? "编辑角色" : "新增角色"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">角色名称 *</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.roleName} onChange={e => setForm({...form, roleName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">角色代码 *</label>
                <input className="w-full border rounded px-3 py-2 text-sm font-mono" value={form.roleCode} onChange={e => setForm({...form, roleCode: e.target.value})} disabled={!!editingRole} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">数据权限</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.dataScope} onChange={e => setForm({...form, dataScope: e.target.value})}>
                  {dataScopeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">排序</label>
                <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.sortOrder} onChange={e => setForm({...form, sortOrder: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">备注</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} value={form.remark} onChange={e => setForm({...form, remark: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 权限配置弹窗 */}
      {showPermForm && editingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">权限配置 - {editingRole.roleName}</h3>
              <p className="text-sm text-gray-500 mt-1">勾选菜单分配权限，按钮可配置具体操作权限（查询、新增、编辑、删除、上传、下载）</p>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 菜单权限 */}
                <div className="border rounded p-3">
                  <h4 className="font-medium mb-2 text-sm">菜单权限</h4>
                  <div className="max-h-80 overflow-auto">
                    {menuTree.map(menu => renderMenuNode(menu, 0))}
                  </div>
                </div>
                {/* 数据权限 */}
                <div className="border rounded p-3">
                  <h4 className="font-medium mb-2 text-sm">数据权限（部门范围）</h4>
                  <p className="text-xs text-gray-500 mb-2">选择可访问数据的部门范围</p>
                  <div className="max-h-80 overflow-auto">
                    {deptTree.map(dept => renderDeptNode(dept, 0))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowPermForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
              <button onClick={handleSubmitPermission} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存配置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
