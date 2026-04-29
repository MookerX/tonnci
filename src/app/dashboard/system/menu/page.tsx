"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchApi } from "@/lib/utils/fetch";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PagePermission } from "@/components/AuthProvider";
import { moduleConfig, actionConfig, getModulePermissions, getAllPermissions, generatePermission } from "@/lib/permissions";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";

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

// 获取所有 Lucide 图标名称（排除内部/特殊属性）
function getLucideIconList(): string[] {
  return Object.keys(LucideIcons).filter(
    (name) =>
      name !== "LucideProps" &&
      name !== "createLucideIcon" &&
      name !== "default" &&
      typeof (LucideIcons as any)[name] === "object"
  );
}

function IconPickerModal({
  open,
  onClose,
  onSelect,
  currentIcon,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (icon: string) => void;
  currentIcon?: string;
}) {
  const [search, setSearch] = useState("");
  const icons = getLucideIconList();
  const filtered = icons.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg border shadow-xl w-[560px] max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-base font-medium">选择图标</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <LucideIcons.X size={18} />
          </button>
        </div>
        <div className="p-3 border-b">
          <Input
            placeholder="搜索图标..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="overflow-y-auto flex-1 p-3">
          <div className="grid grid-cols-8 gap-1">
            {filtered.slice(0, 200).map((name) => {
              const Icon = (LucideIcons as any)[name] as any;
              if (!Icon) return null;
              const isActive = currentIcon === name;
              return (
                <button
                  key={name}
                  onClick={() => { onSelect(name); onClose(); }}
                  title={name}
                  className={`flex items-center justify-center h-10 rounded border transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent hover:border-border hover:bg-muted"
                  }`}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
          {filtered.length > 200 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              显示前 200 个匹配结果，请缩小搜索范围
            </p>
          )}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              未找到匹配的图标
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const menuTypeOptions = [
  { value: 'directory', label: '目录' },
  { value: 'menu', label: '菜单' },
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
  const { success, error, warning } = useToast();
  const [menuTree, setMenuTree] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'tree' | 'routes'>('tree');
  const [routeList, setRouteList] = useState<any[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
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
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // 根据 id 查找菜单
  const findMenuById = (menus: Menu[], id: number): Menu | null => {
    for (const m of menus) {
      if (m.id === id) return m;
      if (m.children) {
        const found = findMenuById(m.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 根据 id 查找父菜单
  const findParentMenu = (menus: Menu[], id: number, parent: Menu | null = null): Menu | null => {
    for (const m of menus) {
      if (m.id === id) return parent;
      if (m.children) {
        const found = findParentMenu(m.children, id, m);
        if (found !== undefined) return found;
      }
    }
    return null;
  };

  // 更新菜单树中指定 id 的菜单
  const updateMenuInTree = (menus: Menu[], id: number, updater: (m: Menu) => Menu): Menu[] => {
    return menus.map(m => {
      if (m.id === id) return updater(m);
      if (m.children) return { ...m, children: updateMenuInTree(m.children, id, updater) };
      return m;
    });
  };

  // 拖拽结束时排序
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as number;
    const overId = over.id as number;

    // 找 active 和 over 的父菜单（确定同层级）
    const activeParent = findParentMenu(menuTree, activeId);
    const overParent = findParentMenu(menuTree, overId);

    if (activeParent?.id !== overParent?.id) return;

    // 获取同级列表
    const siblingList = activeParent ? (activeParent.children || []) : menuTree;
    const oldIndex = siblingList.findIndex(m => m.id === activeId);
    const newIndex = siblingList.findIndex(m => m.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(siblingList, oldIndex, newIndex);

    // 更新树
    if (activeParent) {
      setMenuTree(prev => updateMenuInTree(prev, activeParent.id, m => ({ ...m, children: reordered })));
    } else {
      setMenuTree(reordered);
    }

    // 批量更新 sortOrder 到后端
    const updates = reordered.map((m, idx) => ({ id: m.id, sortOrder: idx }));
    await fetchApi("/api/system/menu/sort", {
      method: "PUT",
      body: JSON.stringify({ orders: updates }),
    });
  }, [menuTree]);

  // 切换菜单可见性
  const handleToggleVisible = useCallback(async (menu: Menu) => {
    const newVisible = !menu.isVisible;
    setMenuTree(prev => updateMenuInTree(prev, menu.id, m => ({ ...m, isVisible: newVisible })));
    await fetchApi(`/api/system/menu/${menu.id}`, {
      method: "PUT",
      body: JSON.stringify({ isVisible: newVisible }),
    });
    success(newVisible ? "菜单已显示" : "菜单已隐藏");
  }, [success]);

  // 选择图标
  const handleSelectIcon = useCallback((icon: string) => {
    setForm(prev => ({ ...prev, icon }));
    setShowIconPicker(false);
  }, []);
  const permissionTree = buildPermissionTree();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/api/system/menu?type=tree", { headers });
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

  // 获取文件系统路由列表
  const fetchRoutes = useCallback(async () => {
    setRouteLoading(true);
    try {
      const token = localStorage.getItem("token");
      const authHeaders: any = { "Content-Type": "application/json" };
      if (token) authHeaders.Authorization = `Bearer ${token}`;
      const data = await fetchApi("/api/system/menu/routes", { headers: authHeaders });
      if (data.code === 200) {
        setRouteList(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
    setRouteLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'routes') {
      fetchRoutes();
    }
  }, [activeTab, fetchRoutes]);

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
        isCache: false,
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
      const data = await fetchApi(url, { method, headers, body: JSON.stringify(form) });
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
      const data = await fetchApi(`/api/system/menu/${editingMenu.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ permission: selectedPermissions.join(',') }),
      });
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
      const data = await fetchApi(`/api/system/menu/${menu.id}`, { method: "DELETE", headers });
      if (data.code === 200) fetchMenus();
      else error(data.message);
    } catch (e) {
      error("删除失败");
    }
  };

  const handleToggleStatus = async (menu: Menu) => {
    const newStatus = menu.status === 'active' ? 'disabled' : 'active';
    try {
      const data = await fetchApi(`/api/system/menu/${menu.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
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
      default: return "📄";
    }
  };

  const getMenuTypeName = (type: string) => {
    switch (type) {
      case 'directory': return '目录';
      case 'menu': return '菜单';
      default: return type;
    }
  };

  // 可排序的菜单节点组件
  const SortableMenuNode = ({ menu, level = 0 }: { menu: Menu; level?: number }) => {
    const hasChildren = menu.children && menu.children.length > 0;
    const isExpanded = expandedIds.has(menu.id);
    const {
      attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: menu.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging || activeDragId === menu.id ? 0.5 : 1,
    };
    const IconComp = menu.icon ? (LucideIcons as any)[menu.icon] : null;

    return (
      <div ref={setNodeRef} style={style}>
        <div
          className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 border-b border-gray-100 group"
          style={{ marginLeft: level * 24 }}
        >
          <div className="flex items-center gap-2 flex-1">
            {/* 拖拽把手 */}
            <button {...attributes} {...listeners} className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
              <LucideIcons.GripVertical size={14} />
            </button>

            {/* 展开/折叠 */}
            {hasChildren ? (
              <button onClick={() => toggleExpand(menu.id)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600">
                {isExpanded ? "−" : "+"}
              </button>
            ) : (
              <span className="w-5" />
            )}

            {/* 可见性 */}
            <button
              onClick={() => handleToggleVisible(menu)}
              className={`w-5 h-5 flex items-center justify-center rounded ${menu.isVisible ? "text-green-500" : "text-gray-300"}`}
              title={menu.isVisible ? "隐藏" : "显示"}
            >
              {menu.isVisible ? <LucideIcons.Eye size={14} /> : <LucideIcons.EyeOff size={14} />}
            </button>

            <span>{getMenuTypeIcon(menu.menuType)}</span>
            {IconComp && <IconComp size={14} className="text-gray-400" />}
            <span className="font-medium">{menu.menuName}</span>
            {menu.path && <span className="text-xs text-gray-400 font-mono">{menu.path}</span>}
            {menu.permission && (
              <span className="text-xs text-orange-500 truncate max-w-xs" title={menu.permission}>
                权限: {menu.permission}
              </span>
            )}
            <span className={`px-1.5 py-0.5 text-xs rounded ${
              menu.menuType === 'directory' ? 'bg-blue-100 text-blue-600' :
              'bg-green-100 text-green-600'
            }`}>
              {getMenuTypeName(menu.menuType)}
            </span>
            <span className={`px-1.5 py-0.5 text-xs rounded ${menu.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {menu.status === 'active' ? '正常' : '禁用'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGuard permission="system:menu:create"><button onClick={() => handleOpenForm(undefined, menu.id)} className="text-blue-600 hover:underline text-sm">
              添加子菜单
            </button></PermissionGuard>
            <PermissionGuard permission="system:menu:update"><button onClick={() => handleOpenForm(menu)} className="text-gray-600 hover:underline text-sm">编辑</button></PermissionGuard>
            <PermissionGuard permission="system:menu:update"><button onClick={() => handleToggleStatus(menu)} className="text-yellow-600 hover:underline text-sm">
              {menu.status === 'active' ? '禁用' : '启用'}
            </button></PermissionGuard>
            <PermissionGuard permission="system:menu:delete"><button onClick={() => handleDelete(menu)} className="text-red-600 hover:underline text-sm">删除</button></PermissionGuard>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {menu.children!.map(child => (
              <SortableMenuNode key={child.id} menu={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // 过滤权限树
  const filteredPermissionTree = filterModule
    ? permissionTree.filter(node => node.module === filterModule)
    : permissionTree;

  return (
    <PagePermission permission="system:menu:query">
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
          <PermissionGuard permission="system:menu:create">
          <button onClick={() => handleOpenForm()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            + 新增菜单
          </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('tree')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tree'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          菜单树
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'routes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          路由列表
        </button>
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
      {activeTab === 'tree' && (
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({ active }) => setActiveDragId(active.id as number)} onDragEnd={handleDragEnd}>
            <SortableContext items={menuTree.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <div>
                {menuTree.map(menu => <SortableMenuNode key={menu.id} menu={menu} level={0} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
      )}

      {/* 路由列表 */}
      {activeTab === 'routes' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4">
            <div className="text-sm text-gray-500 mb-3">
              路由列表显示所有已存在的文件系统路由。绿色标签表示已入库，可直接在侧边栏显示。
              灰色标签表示未入库，点击「入库」按钮可将其添加到菜单。
            </div>
            {routeLoading ? (
              <div className="text-center text-gray-400 py-8">加载中...</div>
            ) : routeList.length === 0 ? (
              <div className="text-center text-gray-400 py-8">暂无路由数据</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-3 py-2 text-left font-medium text-gray-600">状态</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">路由路径</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">菜单名称</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">菜单类型</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">排序</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeList.map(route => (
                      <tr key={route.path} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="px-3 py-2">
                          {route.inDb ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              已入库
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                              未入库
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-800 font-mono text-xs">{route.path}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {route.menuName || '-'}
                        </td>
                        <td className="px-3 py-2">
                          {route.menuType ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              route.menuType === 'directory' ? 'bg-blue-100 text-blue-700' :
                              route.menuType === 'menu' ? 'bg-green-100 text-green-700' :
                              route.menuType === 'directory' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {getMenuTypeName(route.menuType)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{route.sortOrder ?? '-'}</td>
                        <td className="px-3 py-2">
                          {route.inDb ? (
                            <>
                              <PermissionGuard permission="system:menu:update">
                                <button
                                  onClick={() => handleOpenForm(route)}
                                  className="text-blue-600 hover:text-blue-800 text-xs mr-2"
                                >
                                  编辑
                                </button>
                              </PermissionGuard>
                              <button
                                onClick={async () => {
                                  try {
                                    await fetch(`/api/system/menu/${route.menuId}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                      body: JSON.stringify({ isDelete: true }),
                                    });
                                    fetchRoutes();
                                    fetchMenus();
                                  } catch (err) {
                                    console.error('删除失败', err);
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                移除
                              </button>
                            </>
                          ) : (
                            <PermissionGuard permission="system:menu:add">
                              <button
                                onClick={async () => {
                                  // 提取路由名称
                                  const parts = route.path.split('/');
                                  const name = parts[parts.length - 1] || parts[parts.length - 2] || route.path;
                                  // 转换为中文
                                  const nameMap: Record<string, string> = {
                                    'accounting': '财务对账', 'invoice': '发票管理', 'payment': '回款管理', 'reconciliation': '对账单',
                                    'customer-portal': '客户查询', 'delivery': '发货管理', 'plan': '发货计划', 'ship': '发货出库', 'sign': '签收管理',
                                    'inventory': '库房管理', 'order': '生产订单', 'production': '生产管理', 'instruction': '工序卡', 'nesting': '激光套料', 'report': '报工', 'task': '生产任务',
                                    'purchase': '采购管理', 'demand': '采购需求', 'receive': '到货入库', 'supplier': '供应商管理',
                                    'quality': '质量检验', 'system': '系统管理', 'config': '参数配置', 'database': '数据库', 'dept': '部门管理', 'log': '日志管理', 'menu': '菜单管理', 'role': '角色管理', 'storage': '存储配置', 'user': '用户管理',
                                    'tech-task': '技术任务', 'tech': '工艺管理', 'bom': 'BOM管理', 'drawing': '图纸管理',
                                  };
                                  const displayName = nameMap[name] || name.replace(/-/g, '');
                                  try {
                                    await fetch('/api/system/menu', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                      body: JSON.stringify({
                                        menuName: displayName,
                                        path: route.path,
                                        menuType: 'menu',
                                        component: route.path.replace('/dashboard', ''),
                                        sortOrder: 99,
                                        status: 'active',
                                        visible: 'visible',
                                      }),
                                    });
                                    fetchRoutes();
                                    fetchMenus();
                                  } catch (err) {
                                    console.error('入库失败', err);
                                  }
                                }}
                                className="text-green-600 hover:text-green-800 text-xs font-medium"
                              >
                                入库
                              </button>
                            </PermissionGuard>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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
                  placeholder="/xxx/yyy"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">图标</label>
                  <div className="flex gap-2">
                    {form.icon && (() => {
                      const Ic = (LucideIcons as any)[form.icon];
                      return Ic ? <Ic size={18} className="text-gray-600 mt-1" /> : null;
                    })()}
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(true)}
                      className="flex-1 border rounded px-3 py-2 text-sm text-left text-gray-500 hover:border-primary hover:bg-primary/5"
                    >
                      {form.icon || "选择图标..."}
                    </button>
                  </div>
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
      {/* 图标选择器 */}
      <IconPickerModal
        open={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={handleSelectIcon}
        currentIcon={form.icon}
      />
    </div>
    </PagePermission>
  );
}