// =============================================================================
// 腾曦生产管理系统 - 后台布局（含侧边栏菜单、认证守卫、权限过滤）
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { fetchApi } from "@/lib/utils/fetch";
import { AuthProvider, useAuth, RouteGuard } from "@/components/AuthProvider";

// 菜单配置 - 对应需求规格说明书12大功能模块
const menuConfig = [
  {
    key: "home",
    label: "工作台",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    path: "/dashboard",
  },
  {
    key: "system",
    label: "系统管理",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    children: [
      { key: "system-user", label: "用户管理", path: "/dashboard/system/user" },
      { key: "system-role", label: "角色管理", path: "/dashboard/system/role" },
      { key: "system-dept", label: "部门管理", path: "/dashboard/system/dept" },
      { key: "system-menu", label: "菜单管理", path: "/dashboard/system/menu" },
      { key: "system-log", label: "操作日志", path: "/dashboard/system/log" },
      { key: "system-database", label: "数据库配置", path: "/dashboard/system/database" },
      { key: "system-storage", label: "存储管理", path: "/dashboard/system/storage" },
      { key: "system-config", label: "系统参数", path: "/dashboard/system/config" },
    ],
  },
  {
    key: "tech",
    label: "技术管理",
    icon: "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z",
    children: [
      { key: "tech-bom", label: "BOM管理", path: "/dashboard/tech/bom" },
      { key: "tech-drawing", label: "图纸管理", path: "/dashboard/tech/drawing" },
      { key: "tech-process", label: "工艺管理", path: "/dashboard/tech/process" },
      { key: "tech-route", label: "工艺路线", path: "/dashboard/tech/route" },
      { key: "tech-manhour", label: "工时管理", path: "/dashboard/tech/manhour" },
    ],
  },
  {
    key: "order",
    label: "订单管理",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    path: "/dashboard/order",
  },
  {
    key: "tech-task",
    label: "技术任务池",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    path: "/dashboard/tech-task",
  },
  {
    key: "production",
    label: "生产管理",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    children: [
      { key: "prod-task", label: "生产任务", path: "/dashboard/production/task" },
      { key: "prod-nesting", label: "激光套料", path: "/dashboard/production/nesting" },
      { key: "prod-report", label: "生产报工", path: "/dashboard/production/report" },
      { key: "prod-instruction", label: "生产指令卡", path: "/dashboard/production/instruction" },
    ],
  },
  {
    key: "inventory",
    label: "库存管理",
    icon: "M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    path: "/dashboard/inventory",
  },
  {
    key: "quality",
    label: "质量管理",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    path: "/dashboard/quality",
  },
  {
    key: "purchase",
    label: "采购管理",
    icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
    children: [
      { key: "purchase-supplier", label: "供应商管理", path: "/dashboard/purchase/supplier" },
      { key: "purchase-demand", label: "采购需求", path: "/dashboard/purchase/demand" },
      { key: "purchase-order", label: "采购订单", path: "/dashboard/purchase/order" },
      { key: "purchase-receive", label: "到货入库", path: "/dashboard/purchase/receive" },
    ],
  },
  {
    key: "delivery",
    label: "发货管理",
    icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
    children: [
      { key: "delivery-plan", label: "发货计划", path: "/dashboard/delivery/plan" },
      { key: "delivery-ship", label: "出库发货", path: "/dashboard/delivery/ship" },
      { key: "delivery-sign", label: "签收售后", path: "/dashboard/delivery/sign" },
    ],
  },
  {
    key: "accounting",
    label: "对账开票",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    children: [
      { key: "account-recon", label: "客户对账", path: "/dashboard/accounting/reconciliation" },
      { key: "account-invoice", label: "开票管理", path: "/dashboard/accounting/invoice" },
      { key: "account-payment", label: "回款管理", path: "/dashboard/accounting/payment" },
    ],
  },
  {
    key: "wages",
    label: "工资结算",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    children: [
      { key: "wages-data", label: "报工归集", path: "/dashboard/wages/data" },
      { key: "wages-calc", label: "工资核算", path: "/dashboard/wages/calc" },
      { key: "wages-pay", label: "工资发放", path: "/dashboard/wages/pay" },
    ],
  },
  {
    key: "customer-portal",
    label: "客户进度查询",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    path: "/dashboard/customer-portal",
  },
];

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
    const currentMenu = menuConfig.find((m) =>
      m.children?.some((c) => pathname.startsWith(c.path))
    );
    if (currentMenu && !openKeys.includes(currentMenu.key)) {
      setOpenKeys((prev) => [...prev, currentMenu.key]);
    }
  }, [pathname, openKeys]);

  const toggleMenu = (key: string) => {
    setOpenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isActive = (path?: string | null) => !!path && pathname === path;
  const isParentActive = (menu: (typeof menuConfig)[0]) =>
    menu.children?.some((c) => pathname.startsWith(c.path)) || false;

  // 判断菜单是否可见（根据权限过滤）
  const isMenuVisible = (menu: { key: string; children?: { key: string }[] }) => {
    // 工作台始终可见
    if (menu.key === "home") return true;

    if (menu.children && menu.children.length > 0) {
      // 有子菜单：至少有一个子菜单可见则显示父菜单
      return menu.children.some((child) => hasMenu(child.key));
    }
    // 无子菜单：根据菜单key判断
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
              腾曦生产管理
            </span>
          )}
        </div>

        {/* 菜单区域 - 根据权限过滤 */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {menuConfig.filter(isMenuVisible).map((menu) => {
            const hasChildren = menu.children && menu.children.length > 0;
            const parentActive = isParentActive(menu);
            const isOpen = openKeys.includes(menu.key);

            // 过滤不可见的子菜单
            const visibleChildren = menu.children?.filter((child) => hasMenu(child.key));

            if (hasChildren && visibleChildren && visibleChildren.length > 0) {
              return (
                <div key={menu.key}>
                  <button
                    onClick={() => toggleMenu(menu.key)}
                    className={`w-full flex items-center px-4 h-10 text-sm transition-colors ${
                      parentActive
                        ? "text-white bg-slate-700/60"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/40"
                    }`}
                    title={collapsed ? menu.label : undefined}
                  >
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d={menu.icon}
                      />
                    </svg>
                    {!collapsed && (
                      <>
                        <span className="ml-3 flex-1 text-left">{menu.label}</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            isOpen ? "rotate-90" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                  {!collapsed && isOpen && (
                    <div>
                      {visibleChildren.map((child) => (
                        <a
                          key={child.key}
                          href={child.path}
                          className={`flex items-center pl-12 pr-4 h-9 text-sm transition-colors ${
                            isActive(child.path)
                              ? "text-blue-400 bg-blue-500/10 border-r-2 border-blue-400"
                              : "text-slate-400 hover:text-white hover:bg-slate-700/30"
                          }`}
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // 无子菜单的一级菜单
            if (!hasChildren) {
              return (
                <a
                  key={menu.key}
                  href={menu.path}
                  className={`flex items-center px-4 h-10 text-sm transition-colors ${
                    isActive(menu.path)
                      ? "text-blue-400 bg-blue-500/10 border-r-2 border-blue-400"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/40"
                  }`}
                  title={collapsed ? menu.label : undefined}
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={menu.icon}
                    />
                  </svg>
                  {!collapsed && <span className="ml-3">{menu.label}</span>}
                </a>
              );
            }

            return null;
          })}
        </nav>

        {/* 折叠按钮 */}
        <div className="border-t border-slate-700 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center h-8 text-slate-400 hover:text-white hover:bg-slate-700/40 rounded transition-colors"
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
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-base font-semibold text-gray-800">
            腾曦生产管理系统
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {user?.realName || user?.username || "--"}
              </p>
              <p className="text-xs text-gray-400">
                {user?.dept?.deptName || "系统管理员"}
              </p>
            </div>
            <div 
              onClick={() => setShowProfile(true)}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-gray-100 overflow-hidden border border-gray-200"
            >
              {user?.avatar ? (
                <img src={user.avatar.startsWith('/') ? user.avatar : user.avatar} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <img src="/logo.png" alt="默认头像" className="w-full h-full object-contain p-0.5" />
              )}
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              退出
            </button>
          </div>
        </header>

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
