"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { moduleConfig, actionConfig, getModulePermissions, getAllPermissions, generatePermission } from "@/lib/permissions";

interface Menu {
  id: number;
  parentId?: number;
  menuName: string;
  menuType: string;
  path?: string;
  component?: string;
  icon?: string;
  permission?: string;
  sortOrder: number;
  status: string;
  isVisible: boolean;
  isCache: boolean;
  children?: Menu[];
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
      desc: string;
      permission: string;
    }>;
  }>;
}

const menuTypeOptions = [
  { value: 'directory', label: '目录' },
  { value: 'menu', label: '菜单' },
  { value: 'button', label: '按钮' },
  { value: 'permission', label: '数据权限' },
];

// 将权限配置转换为树形结构
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
          desc: actionInfo?.desc || '',
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

export default function SystemMenuPage() {
  const [menuTree, setMenuTree] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [showPermForm, setShowPermForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [form, setForm] = useState({
    parentId: undefined as number | undefined,
    menuName: "",
    menuType: "menu",
    path: "",
    component: "",
    icon: "",
    permission: "",
    sortOrder: 0,
    status: "active",
    isVisible: true,
    isCache: false,
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const permissionTree = buildPermissionTree();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/menu", { headers });
      const data = await res.json();
      if (data.code === 200) {
        setMenuTree(data.data || []);
        const ids = new Set<number>();
        data.data?.forEach((menu: Menu) => ids.add(menu.id));
        setExpandedIds(ids);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMenus(); }, []);

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
    setExpandedIds(newExpanded);
  };

  const toggleModuleExpand = (module: string) => {
    const newExpanded = new Set(expandedModules);
    newExpanded.has(module) ? newExpanded.delete(module) : newExpanded.add(module);
    setExpandedModules(newExpanded);
  };

  const handleOpenForm = (menu?: Menu, parentId?: number) => {
    if (menu) {
      setEditingMenu(menu);
      setForm({
        parentId: menu.parentId,
        menuName: menu.menuName,
        menuType: menu.menuType,
        path: menu.path || "",
        component: menu.component || "",
        icon: menu.icon || "",
        permission: menu.permission || "",
        sortOrder: menu.sortOrder,
        status: menu.status,
        isVisible: menu.isVisible,
        isCache: menu.isCache,
      });
    } else {
      setEditingMenu(null);
      setForm({
        parentId: parentId,
        menuName: "",
        menuType: "menu",
        path: "",
        component: "",
        icon: "",
        permission: "",
        sortOrder: 0,
        status: "active",
        isVisible: true,
        isCache: false,
      });
    }
    setShowForm(true);
  };

  const handleOpenPermissionForm = (menu?: Menu) => {
    if (menu) {
      setEditingMenu(menu);
      // 解析已有的权限
      const perms = menu.permission ? menu.permission.split(',').filter(Boolean) : [];
      setSelectedPermissions(perms);
    } else {
      setEditingMenu(null);
      setSelectedPermissions([]);
    }
    setShowPermForm(true);
  };

  const handleSubmit = async () => {
    if (!form.menuName) {
      warning("请输入菜单名称");
      return;
    }
    try {
      let res;
      const url = editingMenu ? `/api/system/menu/${editingMenu.id}` : "/api/system/menu";
      const method = editingMenu ? "PUT" : "POST";
      res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.code === 200) {
        setShowForm(false);
        fetchMenus();
      } else {
        error(data.message);
      }
    } catch (e) {
      error("保存失败");
    }
  };

  const handleSubmitPermission = async () => {
    if (!editingMenu) return;
    try {
      const res = await fetch(`/api/system/menu/${editingMenu.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ permission: selectedPermissions.join(',') }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setShowPermForm(false);
        fetchMenus();
        warning("权限配置保存成功");
      } else {
        error(data.message);
      }
    } catch (e) {
      error("保存失败");
    }
  };

  const handleDelete = async (menu: Menu) => {
    if (menu.children && menu.children.length > 0) {
      warning("该菜单下有子菜单，请先删除子菜单");
      return;
    }
    if (!confirm(`确认删除菜单 "${menu.menuName}" 吗？`)) return;
    try {
      const res = await fetch(`/api/system/menu/${menu.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.code === 200) fetchMenus();
      else error(data.message);
    } catch (e) {
      error("删除失败");
    }
  };

  const handleToggleStatus = async (menu: Menu) => {
    const newStatus = menu.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/system/menu/${menu.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.code === 200) fetchMenus();
      else error(data.message);
    } catch (e) {
      error("操作失败");
    }
  };

  const handleTogglePermission = (permission: string) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const handleSelectAllInTable = (tablePermissions: string[]) => {
    const allSelected = tablePermissions.every(p => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter(p => !tablePermissions.includes(p)));
    } else {
      const newPerms = new Set([...selectedPermissions, ...tablePermissions]);
      setSelectedPermissions(Array.from(newPerms));
    }
  };

  const flattenMenus = (menus: Menu[], result: Menu[] = [], level: number = 0): Menu[] => {
    for (const menu of menus) {
      result.push({ ...menu, sortOrder: level });
      if (menu.children && menu.children.length > 0) {
        flattenMenus(menu.children, result, level + 1);
      }
    }
    return result;
  };

  const flatMenuList = flattenMenus(menuTree, []);

  const getMenuTypeIcon = (type: string) => {
    switch (type) {
      case 'directory': return "📁";
      case 'menu': return "📄";
      case 'button': return "🔘";
      case 'permission': return "🔐";
      default: return "📄";
    }
  };

  const getMenuTypeName = (type: string) => {
    switch (type) {
      case 'directory': return '目录';
      case 'menu': return '菜单';
      case 'button': return '按钮';
      case 'permission': return '数据权限';
      default: return type;
    }
  };

  const renderMenuNode = (menu: Menu, level: number = 0) => {
    const hasChildren = menu.children && menu.children.length > 0;
    const isExpanded = expandedIds.has(menu.id);

    return (
      <div key={menu.id}>
        <div
          className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 border-b border-gray-100"
          style={{ marginLeft: level * 24 }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <button onClick={() => toggleExpand(menu.id)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600">
                {isExpanded ? "−" : "+"}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span>{getMenuTypeIcon(menu.menuType)}</span>
            <span className="font-medium">{menu.menuName}</span>
            {menu.path && <span className="text-xs text-gray-400 font-mono">{menu.path}</span>}
            {menu.permission && (
              <span className="text-xs text-orange-500 truncate max-w-xs" title={menu.permission}>
                权限: {menu.permission}
              </span>
            )}
            <span className={`px-1.5 py-0.5 text-xs rounded ${
              menu.menuType === 'directory' ? 'bg-blue-100 text-blue-600' :
              menu.menuType === 'menu' ? 'bg-green-100 text-green-600' :
              menu.menuType === 'permission' ? 'bg-purple-100 text-purple-600' :
              'bg-orange-100 text-orange-600'
            }`}>
              {getMenuTypeName(menu.menuType)}
            </span>
            <span className={`px-1.5 py-0.5 text-xs rounded ${menu.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {menu.status === 'active' ? '正常' : '禁用'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {menu.menuType === 'permission' && (
              <button onClick={() => handleOpenPermissionForm(menu)} className="text-purple-600 hover:underline text-sm">
                配置权限
              </button>
            )}
            {menu.menuType !== 'button' && (
              <button onClick={() => handleOpenForm(undefined, menu.id)} className="text-blue-600 hover:underline text-sm">
                添加子菜单
              </button>
            )}
            <button onClick={() => handleOpenForm(menu)} className="text-gray-600 hover:underline text-sm">编辑</button>
            <button onClick={() => handleToggleStatus(menu)} className="text-yellow-600 hover:underline text-sm">
              {menu.status === 'active' ? '禁用' : '启用'}
            </button>
            <button onClick={() => handleDelete(menu)} className="text-red-600 hover:underline text-sm">删除</button>
          </div>
        </div>
        {hasChildren && isExpanded && menu.children!.map(child => renderMenuNode(child, level + 1))}
      </div>
    );
  };

  // 过滤权限树
  const filteredPermissionTree = filterModule
    ? permissionTree.filter(node => node.module === filterModule)
    : permissionTree;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">菜单管理</h2>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
          >
            <option value="">全部模块</option>
            {Object.entries(moduleConfig).map(([key, data]) => (
              <option key={key} value={key}>{data.name}</option>
            ))}
          </select>
          <button onClick={() => handleOpenForm()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            + 新增菜单
          </button>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
        <p className="text-blue-700">
          <strong>权限说明：</strong>权限标识细化到数据表的增删改查操作（query/create/update/delete）和文件操作（upload/download）。
          使用"数据权限"类型的菜单来管理表级权限，权限标识格式：<code className="bg-blue-100 px-1">模块:表名:操作</code>，如 <code className="bg-blue-100 px-1">system:user:query</code>。
        </p>
      </div>

      {/* 权限配置说明 */}
      <div className="bg-white rounded-lg border overflow-hidden mb-4">
        <div className="p-3 border-b bg-gray-50">
          <h3 className="font-medium text-sm">可用数据表权限清单</h3>
        </div>
        <div className="max-h-64 overflow-auto">
          {filteredPermissionTree.map(node => (
            <div key={node.module} className="border-b last:border-b-0">
              <div
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 cursor-pointer hover:bg-gray-200"
                onClick={() => toggleModuleExpand(node.module)}
              >
                <span className="text-gray-400">{expandedModules.has(node.module) ? "−" : "+"}</span>
                <span className="font-medium">{node.moduleName}</span>
                <span className="text-xs text-gray-500">({node.tables.length} 张表)</span>
              </div>
              {expandedModules.has(node.module) && (
                <div className="px-4 py-2 bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="pb-1 w-24">表名</th>
                        <th className="pb-1">可用权限</th>
                      </tr>
                    </thead>
                    <tbody>
                      {node.tables.map(table => (
                        <tr key={table.table} className="border-t">
                          <td className="py-1 font-medium">{table.tableName}</td>
                          <td className="py-1">
                            <div className="flex flex-wrap gap-1">
                              {table.permissions.map(p => (
                                <code key={p.permission} className="px-1 bg-gray-100 rounded text-orange-600">
                                  {p.permission}
                                </code>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 菜单树 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-3 border-b bg-gray-50">
          <input
            type="text"
            placeholder="搜索菜单名称..."
            className="border rounded px-3 py-1.5 text-sm w-64"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-400">加载中...</div>
        ) : menuTree.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400">暂无数据，请先添加菜单</div>
        ) : (
          <div>
            {menuTree.map(menu => renderMenuNode(menu, 0))}
          </div>
        )}
      </div>

      {/* 菜单表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editingMenu ? "编辑菜单" : "新增菜单"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">上级菜单</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.parentId || ""}
                  onChange={e => setForm({...form, parentId: e.target.value ? parseInt(e.target.value) : undefined})}
                >
                  <option value="">无（顶级菜单）</option>
                  {flatMenuList.filter(m => m.id !== editingMenu?.id).map(m => (
                    <option key={m.id} value={m.id}>
                      {"　".repeat(m.sortOrder)}{getMenuTypeIcon(m.menuType)} {m.menuName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">菜单类型 *</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form.menuType}
                    onChange={e => setForm({...form, menuType: e.target.value})}
                  >
                    {menuTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">菜单名称 *</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form.menuName}
                    onChange={e => setForm({...form, menuName: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">路由地址</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm font-mono"
                  value={form.path}
                  onChange={e => setForm({...form, path: e.target.value})}
                  placeholder={form.menuType === 'button' ? "按钮不需要路由" : "/xxx/yyy"}
                />
              </div>
              {form.menuType === 'menu' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">组件路径</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm font-mono"
                    value={form.component}
                    onChange={e => setForm({...form, component: e.target.value})}
                    placeholder="src/app/dashboard/xxx/page.tsx"
                  />
                </div>
              )}
              {form.menuType === 'button' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">权限标识 *</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm font-mono"
                    value={form.permission}
                    onChange={e => setForm({...form, permission: e.target.value})}
                    placeholder="user:query"
                  />
                  <p className="text-xs text-gray-400 mt-1">格式：模块:表名:操作，如 user:query、file:upload</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">图标</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form.icon}
                    onChange={e => setForm({...form, icon: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">排序</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form.sortOrder}
                    onChange={e => setForm({...form, sortOrder: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              {form.menuType === 'menu' && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={form.isVisible} onChange={e => setForm({...form, isVisible: e.target.checked})} />
                    <span className="text-sm">显示菜单</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={form.isCache} onChange={e => setForm({...form, isCache: e.target.checked})} />
                    <span className="text-sm">缓存页面</span>
                  </label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">取消</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 数据权限配置弹窗 */}
      {showPermForm && editingMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">数据权限配置 - {editingMenu.menuName}</h3>
              <p className="text-sm text-gray-500 mt-1">勾选该角色可访问的数据表操作权限</p>
            </div>
            <div className="flex-1 overflow-auto p-4">
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
                            const allSelected = tablePerms.every(p => selectedPermissions.includes(p));
                            const someSelected = tablePerms.some(p => selectedPermissions.includes(p));

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
                                          selectedPermissions.includes(p.permission)
                                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedPermissions.includes(p.permission)}
                                          onChange={() => handleTogglePermission(p.permission)}
                                          className="hidden"
                                        />
                                        <span>{p.label}</span>
                                        <span className="text-gray-400">({p.action})</span>
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
            </div>
            <div className="p-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-500">
                已选 {selectedPermissions.length} 个权限
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
