"use client";

import { useState, useEffect } from "react";

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

const menuTypeOptions = [
  { value: 'directory', label: '目录' },
  { value: 'menu', label: '菜单' },
  { value: 'button', label: '按钮' },
];

const actionOptions = [
  { value: 'query', label: '查询', desc: '查看/查询数据' },
  { value: 'create', label: '新增', desc: '创建新数据' },
  { value: 'update', label: '编辑', desc: '修改数据' },
  { value: 'delete', label: '删除', desc: '删除数据' },
  { value: 'upload', label: '上传', desc: '文件上传功能' },
  { value: 'download', label: '下载', desc: '文件下载功能' },
];

export default function SystemMenuPage() {
  const [menuTree, setMenuTree] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
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
        // 默认展开第一层
        const ids = new Set<number>();
        data.data?.forEach((menu: Menu) => {
          ids.add(menu.id);
        });
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
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
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

  const handleSubmit = async () => {
    if (!form.menuName) {
      alert("请输入菜单名称");
      return;
    }
    if (form.menuType === 'menu' && !form.path) {
      alert("菜单类型为菜单时，路由地址不能为空");
      return;
    }
    try {
      let res;
      if (editingMenu) {
        res = await fetch(`/api/system/menu/${editingMenu.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch("/api/system/menu", {
          method: "POST",
          headers,
          body: JSON.stringify(form),
        });
      }
      const data = await res.json();
      if (data.code === 200) {
        setShowForm(false);
        fetchMenus();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("保存失败");
    }
  };

  const handleDelete = async (menu: Menu) => {
    if (menu.children && menu.children.length > 0) {
      alert("该菜单下有子菜单，请先删除子菜单");
      return;
    }
    if (!confirm(`确认删除菜单 "${menu.menuName}" 吗？`)) return;
    try {
      const res = await fetch(`/api/system/menu/${menu.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.code === 200) {
        fetchMenus();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("删除失败");
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
      if (data.code === 200) {
        fetchMenus();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("操作失败");
    }
  };

  // 扁平化菜单树（用于选择父菜单）
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

  // 根据菜单类型获取图标
  const getMenuTypeIcon = (type: string) => {
    switch (type) {
      case 'directory': return "📁";
      case 'menu': return "📄";
      case 'button': return "🔘";
      default: return "📄";
    }
  };

  const getMenuTypeName = (type: string) => {
    switch (type) {
      case 'directory': return '目录';
      case 'menu': return '菜单';
      case 'button': return '按钮';
      default: return type;
    }
  };

  // 渲染菜单树节点
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
            {/* 展开/收起按钮 */}
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(menu.id)}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? "−" : "+"}
              </button>
            ) : (
              <span className="w-5" />
            )}
            {/* 图标 */}
            <span>{getMenuTypeIcon(menu.menuType)}</span>
            {/* 菜单信息 */}
            <span className="font-medium">{menu.menuName}</span>
            {menu.path && <span className="text-xs text-gray-400 font-mono">{menu.path}</span>}
            {menu.permission && <span className="text-xs text-orange-500">权限: {menu.permission}</span>}
            {/* 类型标签 */}
            <span className={`px-1.5 py-0.5 text-xs rounded ${
              menu.menuType === 'directory' ? 'bg-blue-100 text-blue-600' :
              menu.menuType === 'menu' ? 'bg-green-100 text-green-600' :
              'bg-orange-100 text-orange-600'
            }`}>
              {getMenuTypeName(menu.menuType)}
            </span>
            {/* 状态 */}
            <span className={`px-1.5 py-0.5 text-xs rounded ${menu.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {menu.status === 'active' ? '正常' : '禁用'}
            </span>
            {/* 可见性 */}
            {!menu.isVisible && <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-400 rounded">隐藏</span>}
          </div>
          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            {menu.menuType !== 'button' && (
              <button
                onClick={() => handleOpenForm(undefined, menu.id)}
                className="text-blue-600 hover:underline text-sm"
              >
                添加子菜单
              </button>
            )}
            <button
              onClick={() => handleOpenForm(menu)}
              className="text-gray-600 hover:underline text-sm"
            >
              编辑
            </button>
            <button
              onClick={() => handleToggleStatus(menu)}
              className="text-yellow-600 hover:underline text-sm"
            >
              {menu.status === 'active' ? '禁用' : '启用'}
            </button>
            <button
              onClick={() => handleDelete(menu)}
              className="text-red-600 hover:underline text-sm"
            >
              删除
            </button>
          </div>
        </div>
        {/* 子菜单 */}
        {hasChildren && isExpanded && menu.children!.map(child => renderMenuNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">菜单管理</h2>
        <button
          onClick={() => handleOpenForm()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          + 新增菜单
        </button>
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
        <p className="text-blue-700">
          <strong>权限说明：</strong>权限由数据表操作（查询、新增、编辑、删除）和文件操作（上传、下载）构成。
          <span className="text-blue-600">目录</span>用于分组，
          <span className="text-green-600">菜单</span>对应具体页面，
          <span className="text-orange-600">按钮</span>用于配置操作权限。
          按钮权限标识格式：<code className="bg-blue-100 px-1">模块:操作</code>，如 <code className="bg-blue-100 px-1">user:query</code>、<code className="bg-blue-100 px-1">file:upload</code>、<code className="bg-blue-100 px-1">file:download</code>。
        </p>
      </div>

      {/* 菜单树 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-400">加载中...</div>
        ) : menuTree.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400">暂无数据</div>
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
                  <p className="text-xs text-gray-400 mt-1">格式：模块:操作，如 user:query、file:upload</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">图标</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form.icon}
                    onChange={e => setForm({...form, icon: e.target.value})}
                    placeholder="Icon name"
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
                    <input
                      type="checkbox"
                      checked={form.isVisible}
                      onChange={e => setForm({...form, isVisible: e.target.checked})}
                    />
                    <span className="text-sm">显示菜单</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={form.isCache}
                      onChange={e => setForm({...form, isCache: e.target.checked})}
                    />
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
    </div>
  );
}
