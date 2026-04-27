"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { moduleConfig, actionConfig, generatePermission } from "@/lib/permissions";

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

interface Dept {
  id: number;
  deptName: string;
  children?: Dept[];
}

interface PermissionNode {
  module: string;
  moduleName: string;
  tables: Array<{
    table: string;
    tableName: string;
    permissions: Array<{
      action: string;
      label: string;
      permission: string;
    }>;
  }>;
}

function buildPermissionTree(): PermissionNode[] {
  const nodes: PermissionNode[] = [];

  for (const [moduleKey, moduleData] of Object.entries(moduleConfig)) {
    const tables: PermissionNode['tables'] = [];

    for (const [tableKey, tableData] of Object.entries(moduleData.tables)) {
      const permissions = tableData.permissions.map(action => {
        const actionInfo = actionConfig.find(a => a.value === action);
        return {
          action,
          label: actionInfo?.label || action,
          permission: generatePermission(moduleKey, tableKey, action),
        };
      });

      tables.push({
        table: tableKey,
        tableName: tableData.name,
        permissions,
      });
    }

    nodes.push({
      module: moduleKey,
      moduleName: moduleData.name,
      tables,
    });
  }

  return nodes;
}

const dataScopeOptions = [
  { value: 'all', label: '全部数据权限' },
  { value: 'dept', label: '本部门数据权限' },
  { value: 'deptAndChild', label: '本部门及子部门数据权限' },
  { value: 'custom', label: '自定义数据权限' },
];

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
  const [menuTree, setMenuTree] = useState<any[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([]);
  const [deptTree, setDeptTree] = useState<Dept[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'menu' | 'data'>('menu');
  const permissionTree = buildPermissionTree();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

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
      warning("请填写完整信息");
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
        error(data.message);
      }
    } catch (e) {
      error("保存失败");
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.roleCode === 'super_admin') {
      warning("不能删除超级管理员角色");
      return;
    }
    if (!confirm(`确认删除角色 "${role.roleName}" 吗？`)) return;
    try {
      const res = await fetch(`/api/system/role/${role.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.code === 200) fetchRoles();
      else error(data.message);
    } catch (e) {
      error("删除失败");
    }
  };

  // 打开权限配置
  const handleOpenPermission = async (role: Role) => {
    if (role.roleCode === 'super_admin') {
      warning("超级管理员拥有全部权限，无需配置");
      return;
    }
    setEditingRole(role);
    setSelectedPermissions(new Set());

    // 获取角色已有的权限
    try {
      const roleDetailRes = await fetch(`/api/system/role/${role.id}`, { headers });
      const roleData = await roleDetailRes.json();

      if (roleData.code === 200) {
        const perms = roleData.data?.permissions || [];
        const permSet = new Set<string>();
        perms.forEach((p: any) => {
          if (p.menuId) {
            // 菜单权限
            if (!selectedMenuIds.includes(p.menuId)) {
              setSelectedMenuIds([...selectedMenuIds, p.menuId]);
            }
          }
          if (p.permission) {
            permSet.add(p.permission);
          }
          if (p.actions && Array.isArray(p.actions)) {
            p.actions.forEach((a: string) => permSet.add(a));
          }
        });
        setSelectedPermissions(permSet);
        setSelectedDeptIds(roleData.data?.deptIds || []);
      }

      // 获取菜单树
      const menuRes = await fetch("/api/system/menu", { headers });
      const menuData = await menuRes.json();
      if (menuData.code === 200) {
        setMenuTree(menuData.data || []);
      }

      // 获取部门树
      const deptRes = await fetch("/api/system/dept", { headers });
      const deptData = await deptRes.json();
      if (deptData.code === 200) {
        setDeptTree(deptData.data || []);
      }

      setShowPermForm(true);
      setActiveTab('menu');
    } catch (e) {
      warning("加载权限配置失败");
    }
  };

  const handleTogglePermission = (permission: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permission)) {
      newSet.delete(permission);
    } else {
      newSet.add(permission);
    }
    setSelectedPermissions(newSet);
  };

  const handleSelectAllInTable = (tablePermissions: string[]) => {
    const allSelected = tablePermissions.every(p => selectedPermissions.has(p));
    const newSet = new Set(selectedPermissions);
    if (allSelected) {
      tablePermissions.forEach(p => newSet.delete(p));
    } else {
      tablePermissions.forEach(p => newSet.add(p));
    }
    setSelectedPermissions(newSet);
  };

  const handleSubmitPermission = async () => {
    if (!editingRole) return;
    try {
      const permissions = Array.from(selectedPermissions);

      const res = await fetch(`/api/system/role/${editingRole.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          action: "assignPermission",
          permissions,
          deptIds: selectedDeptIds,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setShowPermForm(false);
        warning("权限分配成功");
      } else {
        error(data.message);
      }
    } catch (e) {
      warning("保存权限失败");
    }
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

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="搜索角色名称或代码..."
          className="border rounded px-3 py-2 text-sm w-64"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
      </div>

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
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">权限配置 - {editingRole.roleName}</h3>
              <p className="text-sm text-gray-500 mt-1">配置该角色可访问的数据表操作权限</p>
            </div>
            <div className="border-b">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('menu')}
                  className={`px-4 py-2 text-sm ${activeTab === 'menu' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                >
                  数据表权限
                </button>
                <button
                  onClick={() => setActiveTab('data')}
                  className={`px-4 py-2 text-sm ${activeTab === 'data' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                >
                  数据范围
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {activeTab === 'menu' ? (
                <div className="space-y-4">
                  {permissionTree.map(node => (
                    <div key={node.module} className="border rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-gray-100 font-medium text-sm">
                        {node.moduleName}
                      </div>
                      <div className="p-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 text-xs">
                              <th className="pb-2 w-32">表名</th>
                              <th className="pb-2">权限操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {node.tables.map(table => {
                              const tablePerms = table.permissions.map(p => p.permission);
                              const allSelected = tablePerms.every(p => selectedPermissions.has(p));
                              const someSelected = tablePerms.some(p => selectedPermissions.has(p));

                              return (
                                <tr key={table.table} className="border-t">
                                  <td className="py-2">
                                    <label className="flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                        onChange={() => handleSelectAllInTable(tablePerms)}
                                      />
                                      <span className="font-medium">{table.tableName}</span>
                                    </label>
                                  </td>
                                  <td className="py-2">
                                    <div className="flex flex-wrap gap-2">
                                      {table.permissions.map(p => (
                                        <label
                                          key={p.permission}
                                          className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs ${
                                            selectedPermissions.has(p.permission)
                                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedPermissions.has(p.permission)}
                                            onChange={() => handleTogglePermission(p.permission)}
                                            className="hidden"
                                          />
                                          <span>{p.label}</span>
                                          <code className="text-xs text-gray-400">({p.action})</code>
                                        </label>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">数据权限（部门范围）</h4>
                  <p className="text-xs text-gray-500 mb-3">选择该角色可查看哪些部门的数据</p>
                  <div className="max-h-80 overflow-auto">
                    {deptTree.map(dept => renderDeptNode(dept, 0))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-500">
                已选 {selectedPermissions.size} 个数据表操作权限
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPermForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
                <button onClick={handleSubmitPermission} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存配置</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
