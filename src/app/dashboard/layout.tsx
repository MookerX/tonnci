// =============================================================================
// 腾曦生产管理系统 - 后台布局（含侧边栏菜单、认证守卫、权限过滤）
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { fetchApi } from "@/lib/utils/fetch";
import { AuthProvider, useAuth, RouteGuard } from "@/components/AuthProvider";

// =============================================================================
// 递归侧边栏菜单项组件
// =============================================================================
function SidebarMenuItem({
  item,
  level,
  collapsed,
  openKeys,
  toggleMenu,
  isActive,
  renderMenuIcon,
  hasMenu,
}: {
  item: any;
  level: number;
  collapsed: boolean;
  openKeys: string[];
  toggleMenu: (key: string) => void;
  isActive: (path: string | null | undefined) => boolean;
  renderMenuIcon: (icon: string | null | undefined, size?: number) => React.ReactNode;
  hasMenu: (key: string) => boolean;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isOpen = openKeys.includes(item.key);
  const paddingLeft = level === 0 ? "px-4" : `pl-${Math.min(8 + level * 4, 20)} pr-4`;

  // 有子菜单 → 可展开目录
  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => toggleMenu(item.key)}
          className={`w-full flex items-center ${level === 0 ? "px-4" : ""} ${level > 0 ? `pr-4` : ""} h-10 text-sm transition-colors ${
            isActive(item.path)
              ? "text-white bg-slate-700/60"
              : "text-slate-300 hover:text-white hover:bg-slate-700/40"
          }`}
          style={level > 0 ? { paddingLeft: `${16 + level * 16}px` } : undefined}
          title={collapsed ? item.label : undefined}
        >
          <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
            {renderMenuIcon(item.icon)}
          </span>
          {!collapsed && (
            <>
              <span className="ml-3 flex-1 text-left">{item.label}</span>
              <svg
                className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
        {!collapsed && isOpen && (
          <div>
            {item.children.map((child: any) => (
              // 子菜单权限过滤：目录类型始终可见，其他根据 hasMenu 判断
              hasMenu(child.key) || child.dbMenu?.menuType === 'directory' ? (
              <SidebarMenuItem
                key={child.key}
                item={child}
                level={level + 1}
                collapsed={collapsed}
                openKeys={openKeys}
                toggleMenu={toggleMenu}
                isActive={isActive}
                renderMenuIcon={renderMenuIcon}
                hasMenu={hasMenu}
              />
              ) : null
            ))}
          </div>
        )}
      </div>
    );
  }

  // 无子菜单 → 链接
  return (
    <a
      href={item.path || '#'}
      className={`flex items-center ${level === 0 ? "px-4" : ""} ${level > 0 ? "pr-4" : ""} ${level === 0 ? "h-10" : "h-9"} text-sm transition-colors ${
        isActive(item.path)
          ? "text-blue-400 bg-blue-500/10 border-r-2 border-blue-400"
          : level === 0
          ? "text-slate-300 hover:text-white hover:bg-slate-700/40"
          : "text-slate-400 hover:text-white hover:bg-slate-700/30"
      }`}
      style={level > 0 ? { paddingLeft: `${28 + level * 16}px` } : undefined}
      title={collapsed ? item.label : undefined}
    >
      <span className={`${level === 0 ? "w-5 h-5" : "w-4 h-4"} flex-shrink-0 flex items-center justify-center ${level > 0 ? "mr-2" : ""}`}>
        {renderMenuIcon(item.icon)}
      </span>
      {!collapsed && <span className={level === 0 ? "ml-3" : ""}>{item.label}</span>}
    </a>
  );
}

// =============================================================================
// 内部布局组件 - 使用 useAuth
// =============================================================================
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error, warning } = useToast();
  const { user, hasMenu, loading, initialized, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [editForm, setEditForm] = useState({ realName: "", phone: "", email: "", avatar: "" });
  const [saving, setSaving] = useState(false);
  const [profileTab, setProfileTab] = useState<"info" | "password">("info");
  const [pwdForm, setPwdForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPwd, setChangingPwd] = useState(false);
  const [dbMenuTree, setDbMenuTree] = useState<any[]>([]);

  // 转换DB菜单为侧边栏格式
  const buildSidebarItems = useCallback((menus: any[]): any[] => {
    return menus
      .filter(m => m.isVisible !== false && m.menuType !== 'button')
      .map(m => {
        const key = m.menuCode || m.menuName;
        const children = m.children ? buildSidebarItems(m.children) : undefined;
        // 目录类型不需要path（仅作为容器），菜单类型需要有path
        const path = m.menuType === 'directory' ? null : (m.path || (children?.[0]?.path));
        return {
          key,
          label: m.menuName,
          icon: m.icon,
          path,
          children: children?.length ? children : undefined,
          dbMenu: m,
        };
      });
  }, []);

  // 侧边栏菜单项（从数据库加载）
  const sidebarItems = buildSidebarItems(dbMenuTree);

  // 从数据库加载菜单树
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    fetch("/api/system/menu?type=tree", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.code === 200 && data.data) {
          setDbMenuTree(data.data);
        }
      })
      .catch(() => {});
  }, [user]);

  // 未登录自动跳转
  useEffect(() => {
    if (initialized && !user && !loading) {
      router.replace("/");
    }
  }, [initialized, user, loading, router]);

  // 初始化编辑表单
  useEffect(() => {
    if (user) {
      setEditForm({
        realName: user.realName || "",
        phone: user.phone || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
    }
  }, [user]);

  // 获取当前登录用户ID
  const getCurrentUserId = useCallback(() => {
    return user?.id || null;
  }, [user]);

  // 保存个人信息
  const handleSaveProfile = async () => {
    const token = localStorage.getItem("token");
    const userId = getCurrentUserId();
    if (!token || !userId) return;

    if (editForm.phone && !/^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/.test(editForm.phone)) {
      warning("电话号码格式不正确");
      return;
    }
    if (editForm.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(editForm.email)) {
      warning("邮箱格式不正确");
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = editForm.avatar;
      if (avatarUrl && avatarUrl.startsWith("data:")) {
        const res = await fetch(avatarUrl);
        const blob = await res.blob();
        const file = new File([blob], `avatar-${userId}.png`, { type: "image/png" });
        const formData = new FormData();
        formData.append("file", file);

        const uploadData = await fetchApi("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (uploadData.code === 200) {
          avatarUrl = uploadData.data.url;
        } else {
          error(uploadData.message || "头像上传失败");
          setSaving(false);
          return;
        }
      }

      const data = await fetchApi(`/api/system/user/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          realName: editForm.realName || null,
          phone: editForm.phone || null,
          email: editForm.email || null,
          avatar: avatarUrl || null,
        }),
      });
      if (data.code === 200) {
        success("保存成功");
        setShowProfile(false);
      } else {
        error(data.message || "保存失败");
      }
    } catch (e) {
      error("保存失败");
    }
    setSaving(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setEditForm({ ...editForm, avatar: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (!pwdForm.oldPassword) { warning("请输入原密码"); return; }
    if (!pwdForm.newPassword) { warning("请输入新密码"); return; }
    if (pwdForm.newPassword.length < 6) { warning("新密码至少6位"); return; }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { warning("两次输入的新密码不一致"); return; }

    const token = localStorage.getItem("token");
    if (!token) return;

    setChangingPwd(true);
    try {
      const data = await fetchApi("/api/system/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword }),
      });
      if (data.code === 200) {
        success("密码修改成功，请重新登录");
        setPwdForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
        setShowProfile(false);
        setTimeout(() => { logout(); }, 1500);
      } else {
        error(data.message || "密码修改失败");
      }
    } catch (e) {
      error("密码修改失败");
    }
    setChangingPwd(false);
  };

  // 初始化展开当前路径对应的菜单
  useEffect(() => {
    const currentMenu = sidebarItems.find((m: any) =>
      m.children?.some((c: any) => pathname.startsWith(c.path))
    );
    if (currentMenu && !openKeys.includes(currentMenu.key)) {
      setOpenKeys((prev) => [...prev, currentMenu.key]);
    }
  }, [pathname, openKeys, sidebarItems]);

  const toggleMenu = (key: string) => {
    setOpenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isActive = (path?: string | null) => !!path && pathname === path;
  const isParentActive = (menu: (any)) =>
    menu.children?.some((c: any) => pathname.startsWith(c.path)) || false;

  // 渲染菜单图标（支持Lucide组件名或SVG路径）
  const renderMenuIcon = (iconName: string | null | undefined, size = 20) => {
    if (!iconName) return null;
    const Ic = (LucideIcons as any)[iconName];
    if (Ic) return <Ic size={size} />;
    return (
      <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconName} />
      </svg>
    );
  };

  // 判断菜单是否可见（根据权限过滤）
  const isMenuVisible = (menu: any) => {
    if (menu.key === "home" || menu.key === "首页") return true;
    // 有子菜单：检查是否至少有一个子菜单有权限
    if (menu.children && menu.children.length > 0) {
      return menu.children.some((child: any) => isMenuVisible(child));
    }
    // 无子菜单：检查自己的权限
    return hasMenu(menu.key);
  };

  // 加载中
  if (loading || !initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录
  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* 侧边栏 */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-56"
        } bg-slate-800 flex flex-col transition-all duration-200 flex-shrink-0`}
      >
        {/* Logo区域 */}
        <div className="h-14 flex items-center px-4 border-b border-slate-700">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <span className="ml-3 text-white font-bold text-sm whitespace-nowrap">
              腾曦管理系统
            </span>
          )}
        </div>

        {/* 菜单区域 - 根据权限过滤 */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {sidebarItems.filter(isMenuVisible).map((menu: any) => (
            <SidebarMenuItem
              key={menu.key}
              item={menu}
              level={0}
              collapsed={collapsed}
              openKeys={openKeys}
              toggleMenu={toggleMenu}
              isActive={isActive}
              renderMenuIcon={renderMenuIcon}
              hasMenu={hasMenu}
            />
          ))}
        </nav>

        {/* 用户信息 */}
        <div className="border-t border-slate-700 p-2">
          <div className="flex items-center gap-2">
            {/* 左侧：用户头像、姓名、部门 */}
            <div className="flex items-center flex-1 min-w-0">
              {!collapsed && (
                <>
                  <div 
                    onClick={() => setShowProfile(true)}
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-slate-700 overflow-hidden border border-slate-600 flex-shrink-0"
                  >
                    {user?.avatar ? (
                      <img src={user.avatar.startsWith('/') ? user.avatar : user.avatar} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <img src="/logo.png" alt="默认头像" className="w-full h-full object-contain p-0.5" />
                    )}
                  </div>
                  <div className="ml-2 flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.realName || user?.username || "--"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {user?.dept?.deptName || "系统管理员"}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* 右侧：收起菜单、退出按钮 */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/40 rounded transition-colors"
                title={collapsed ? "展开菜单" : "收起菜单"}
              >
                <svg
                  className={`w-5 h-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={logout}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-700/40 rounded transition-colors"
                title="退出登录"
              >
                <LucideIcons.LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 页面内容 */}
        <main className="flex-1 overflow-auto p-6"><RouteGuard>{children}</RouteGuard></main>

        {/* 个人信息弹窗 */}
        {showProfile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowProfile(false); setProfileTab("info"); }}>
            <div className="bg-white rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">个人信息</h3>

              {/* Tab 切换 */}
              <div className="flex border-b mb-4">
                <button
                  onClick={() => setProfileTab("info")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${profileTab === "info" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  基本信息
                </button>
                <button
                  onClick={() => setProfileTab("password")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${profileTab === "password" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  修改密码
                </button>
              </div>

              {/* 基本信息 Tab */}
              {profileTab === "info" && (
                <>
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden border-2 border-gray-200">
                        {editForm.avatar ? (
                          <img src={editForm.avatar} alt="头像" className="w-full h-full object-cover" />
                        ) : (
                          <img src="/logo.png" alt="默认头像" className="w-full h-full object-contain" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-600">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">用户名</label>
                      <input
                        className="w-full border rounded px-3 py-2 text-sm bg-gray-100"
                        value={user?.username || ""}
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">姓名</label>
                      <input
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={editForm.realName}
                        onChange={e => setEditForm({...editForm, realName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">电话</label>
                      <input
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={editForm.phone}
                        onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                      <input
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={editForm.email}
                        onChange={e => setEditForm({...editForm, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => { setShowProfile(false); setProfileTab("info"); }}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "保存中..." : "保存"}
                    </button>
                  </div>
                </>
              )}

              {/* 修改密码 Tab */}
              {profileTab === "password" && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">原密码</label>
                      <input
                        type="password"
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="请输入原密码"
                        value={pwdForm.oldPassword}
                        onChange={e => setPwdForm({...pwdForm, oldPassword: e.target.value})}
                        autoComplete="current-password"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">新密码</label>
                      <input
                        type="password"
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="请输入新密码（至少6位）"
                        value={pwdForm.newPassword}
                        onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})}
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">确认新密码</label>
                      <input
                        type="password"
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="请再次输入新密码"
                        value={pwdForm.confirmPassword}
                        onChange={e => setPwdForm({...pwdForm, confirmPassword: e.target.value})}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => { setShowProfile(false); setProfileTab("info"); setPwdForm({ oldPassword: "", newPassword: "", confirmPassword: "" }); }}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPwd}
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {changingPwd ? "修改中..." : "确认修改"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 导出布局 - 包裹 AuthProvider
// =============================================================================
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  );
}
