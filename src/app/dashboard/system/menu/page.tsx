"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchApi } from "@/lib/utils/fetch";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PagePermission } from "@/components/AuthProvider";
// 权限相关导入已移除
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
  parentId?: number | null;
  menuName: string;
  menuType: string;
  path?: string;
  icon?: string;
  permission?: string;
  sortOrder: number;
  status: string;
  isVisible: boolean;
  isCache: boolean;
  children?: Menu[];
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

export default function SystemMenuPage() {
  const { success, error, warning } = useToast();
  const [menuTree, setMenuTree] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'tree' | 'routes'>('tree');
  const [routeList, setRouteList] = useState<any[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [form, setForm] = useState({
    parentId: null as number | null,
    menuName: "",
    menuType: "menu",
    path: "",
    icon: "",
    permission: "",
    sortOrder: 0,
    status: "active",
    isVisible: true,
    isCache: false,
  });
  const [keyword, setKeyword] = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  
  // 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // 查找菜单所在层级和同级列表
  const findMenuLevelAndSiblings = (menus: Menu[], id: number, parent: Menu | null = null): { level: number; siblings: Menu[]; parent: Menu | null } | null => {
    for (let i = 0; i < menus.length; i++) {
      const m = menus[i];
      if (m.id === id) {
        return { level: 0, siblings: menus, parent };
      }
      if (m.children && m.children.length > 0) {
        const found = findMenuLevelAndSiblings(m.children, id, m);
        if (found) {
          return { ...found, level: found.level + 1 };
        }
      }
    }
    return null;
  };

  // 替换菜单树中指定菜单
  const replaceInTree = (menus: Menu[], id: number, updater: (m: Menu) => Menu): Menu[] => {
    return menus.map(m => {
      if (m.id === id) return updater(m);
      if (m.children) return { ...m, children: replaceInTree(m.children, id, updater) };
      return m;
    });
  };

  // 获取父菜单的子菜单列表引用
  const getParentChildren = (menus: Menu[], id: number, parent: Menu | null): Menu[] | null => {
    if (!parent) return menus;
    if (parent.children) return parent.children;
    return null;
  };

  // 获取菜单列表
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

  // 拖拽结束时排序
  const handleDragEnd = useCallback(async (event: any) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as number;
    const overId = over.id as number;

    // 只允许同级拖拽
    const activeInfo = findMenuLevelAndSiblings(menuTree, activeId);
    const overInfo = findMenuLevelAndSiblings(menuTree, overId);
    
    if (!activeInfo || !overInfo) return;
    if (activeInfo.level !== overInfo.level) return; // 不同层级不允许拖拽

    const { siblings } = activeInfo;
    const oldIndex = siblings.findIndex(m => m.id === activeId);
    const newIndex = siblings.findIndex(m => m.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    // 重新排序
    const reordered = arrayMove(siblings, oldIndex, newIndex);

    // 更新树状态
    if (activeInfo.parent) {
      const newTree = replaceInTree(menuTree, activeInfo.parent.id, m => ({ ...m, children: reordered }));
      setMenuTree(newTree);
    } else {
      setMenuTree([...reordered]);
    }

    // 保存到后端
    const updates = reordered.map((m, idx) => ({ id: m.id, sortOrder: (idx + 1) * 10 }));
    const res = await fetch("/api/system/menu/sort", {
      method: "PUT",
      headers,
      body: JSON.stringify({ orders: updates }),
    }).then(r => r.json());

    if (res.code === 200) {
      success("排序已保存");
      fetchMenus();
    } else {
      error(res.message || '保存失败');
    }
  }, [menuTree, success, error, fetchMenus]);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  // 选择图标
  const handleSelectIcon = useCallback((icon: string) => {
    setForm(prev => ({ ...prev, icon }));
    setShowIconPicker(false);
  }, []);

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

  const handleOpenForm = (menu?: Menu | any, parentId?: number | null) => {
    if (menu) {
      // 可能是数据库菜单或路由列表中的路由对象
      const menuId = menu.menuId ?? menu.id;
      setEditingMenu({ ...menu, id: menuId });
      setForm({
        parentId: menu.parentId,
        menuName: menu.menuName || "",
        menuType: menu.menuType || "menu",
        path: menu.path || "",
        icon: menu.icon || "",
        permission: menu.permission || "",
        sortOrder: menu.sortOrder ?? 0,
        status: menu.status || "active",
        isVisible: menu.isVisible ?? (menu.visible === 'visible'),
        isCache: false,
      });
    } else {
      setEditingMenu(null);
      setForm({
        parentId: parentId ?? null,
        menuName: "",
        menuType: "menu",
        path: "",
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
      warning("请输入菜单名称");
      return;
    }
    try {
      const menuId = editingMenu?.id;
      const url = menuId ? `/api/system/menu/${menuId}` : "/api/system/menu";
      const method = menuId ? "PUT" : "POST";
      const token = localStorage.getItem("token");
      const reqHeaders: any = { "Content-Type": "application/json" };
      if (token) reqHeaders.Authorization = `Bearer ${token}`;

      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: JSON.stringify(form),
      });
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

    // 所有菜单都可以拖拽
    const {
      attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: menu.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging || activeDragId === menu.id ? 0.5 : 1,
    };

    // 尝试从 LucideIcons 中获取图标，找不到则显示图标名称
    const iconName = menu.icon;
    const IconComp = iconName ? (LucideIcons as any)[iconName] : null;

    return (
      <SortableContext items={hasChildren ? menu.children!.map(c => c.id) : []} strategy={verticalListSortingStrategy}>
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

            <span>{getMenuTypeIcon(menu.menuType)}</span>
            {IconComp ? (
              <IconComp size={14} className="text-gray-400" />
            ) : iconName ? (
              <span className="text-xs text-gray-400 px-1" title={iconName}>[{iconName}]</span>
            ) : null}
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
      </SortableContext>
    );
  };

  return (
    <PagePermission permission="system:menu:query">
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">菜单管理</h2>
        <div className="flex items-center gap-2">
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
                  onChange={e => setForm({...form, parentId: e.target.value ? parseInt(e.target.value) : null})}
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
                    <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm({...form, isVisible: e.target.checked})} />
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