// =============================================================================
// 腾曦生产管理系统 - 全局认证与权限上下文
// 提供: 登录状态、用户信息、权限列表、权限检查函数、菜单过滤、路由守卫
// =============================================================================

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchApi } from "@/lib/utils/fetch";

// 权限字符串格式: "module:table:action"，如 "system:user:create"
// 超级管理员拥有权限 "*"

interface UserInfo {
  id: number;
  username: string;
  realName: string;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  deptId: number | null;
  dept: { id: number; deptName: string } | null;
  roles: number[];
  isSuperAdmin: boolean;
}

interface AuthContextType {
  // 状态
  user: UserInfo | null;
  permissions: string[];
  menus: string[];
  loading: boolean;
  initialized: boolean;

  // 权限检查函数
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasMenu: (menuKey: string) => boolean;

  // 操作
  logout: () => void;
  refreshPermissions: () => Promise<void>;
}

// ========== 路径 → 菜单key 映射 ==========
const pathMenuMap: Record<string, string> = {
  "/dashboard/system/user": "system-user",
  "/dashboard/system/role": "system-role",
  "/dashboard/system/dept": "system-dept",
  "/dashboard/system/menu": "system-menu",
  "/dashboard/system/log": "system-log",
  "/dashboard/system/database": "system-database",
  "/dashboard/system/storage": "system-storage",
  "/dashboard/system/config": "system-config",
  "/dashboard/tech/bom": "tech-bom",
  "/dashboard/tech/drawing": "tech-drawing",
  "/dashboard/tech/process": "tech-process",
  "/dashboard/tech/route": "tech-route",
  "/dashboard/tech/manhour": "tech-manhour",
  "/dashboard/order": "order",
  "/dashboard/tech-task": "tech-task",
  "/dashboard/production/task": "prod-task",
  "/dashboard/production/nesting": "prod-nesting",
  "/dashboard/production/report": "prod-report",
  "/dashboard/production/instruction": "prod-instruction",
  "/dashboard/inventory": "inventory",
  "/dashboard/quality": "quality",
  "/dashboard/purchase/supplier": "purchase-supplier",
  "/dashboard/purchase/demand": "purchase-demand",
  "/dashboard/purchase/order": "purchase-order",
  "/dashboard/purchase/receive": "purchase-receive",
  "/dashboard/delivery/plan": "delivery-plan",
  "/dashboard/delivery/ship": "delivery-ship",
  "/dashboard/delivery/sign": "delivery-sign",
  "/dashboard/accounting/reconciliation": "account-recon",
  "/dashboard/accounting/invoice": "account-invoice",
  "/dashboard/accounting/payment": "account-payment",
  "/dashboard/wages/data": "wages-data",
  "/dashboard/wages/calc": "wages-calc",
  "/dashboard/wages/pay": "wages-pay",
  "/dashboard/customer-portal": "customer-portal",
};

/** 根据路径获取对应的菜单key */
export function getMenuKeyByPath(pathname: string): string | null {
  // 精确匹配
  if (pathMenuMap[pathname]) return pathMenuMap[pathname];
  // 前缀匹配（处理子路由）
  const matched = Object.entries(pathMenuMap)
    .filter(([p]) => pathname.startsWith(p))
    .sort((a, b) => b[0].length - a[0].length);
  return matched.length > 0 ? matched[0][1] : null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [menus, setMenus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // 从API获取权限信息
  const refreshPermissions = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setUser(null);
      setPermissions([]);
      setMenus([]);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      const data = await fetchApi("/api/auth/permissions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.code === 200 && data.data) {
        const { user: userData, permissions: perms, menus: menuKeys } = data.data;
        setUser(userData);
        setPermissions(perms);
        setMenus(menuKeys);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setPermissions([]);
        setMenus([]);
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setPermissions([]);
      setMenus([]);
    }

    setLoading(false);
    setInitialized(true);
  }, []);

  // 初始化时加载权限
  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // 检查单个权限
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!permissions.length) return false;
      if (permissions.includes("*")) return true;
      return permissions.includes(permission);
    },
    [permissions]
  );

  // 检查是否拥有任意一个权限
  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => {
      if (!permissions.length) return false;
      if (permissions.includes("*")) return true;
      return perms.some((p) => permissions.includes(p));
    },
    [permissions]
  );

  // 检查菜单权限
  const hasMenu = useCallback(
    (menuKey: string): boolean => {
      if (!menus.length) return false;
      if (permissions.includes("*")) return true;
      return menus.includes(menuKey);
    },
    [menus, permissions]
  );

  // 退出登录
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setPermissions([]);
    setMenus([]);
    router.replace("/");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        menus,
        loading,
        initialized,
        hasPermission,
        hasAnyPermission,
        hasMenu,
        logout,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// =============================================================================
// 路由守卫 - 在 dashboard layout 中使用，拦截无权限的页面访问
// =============================================================================
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasMenu, loading, initialized, user, permissions } = useAuth();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (loading || !initialized) return;

    // 未登录
    if (!user) {
      router.replace("/");
      return;
    }

    // 工作台首页不需要权限检查
    if (pathname === "/dashboard") {
      setBlocked(false);
      return;
    }

    // 查找当前路径对应的菜单key
    const menuKey = getMenuKeyByPath(pathname);
    if (!menuKey) {
      // 路径不在映射表中，允许访问（如未配置的页面）
      setBlocked(false);
      return;
    }

    // 检查菜单权限
    if (!hasMenu(menuKey)) {
      setBlocked(true);
      // 延迟跳转，让用户看到提示
      const timer = setTimeout(() => {
        router.replace("/dashboard");
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setBlocked(false);
    }
  }, [pathname, loading, initialized, user, hasMenu, router, permissions]);

  if (blocked) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">无访问权限</h2>
          <p className="text-gray-400 text-sm">您没有权限访问此页面，即将返回工作台</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// =============================================================================
// 页面权限检查 - 用于检查页面级的查询权限
// 无查询权限时显示无权限提示而非列表
// =============================================================================
export function PagePermission({ 
  permission, 
  children 
}: { 
  permission: string; // 查询权限，如 "system:user:query"
  children: React.ReactNode; 
}) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">无查看权限</h2>
          <p className="text-gray-400 text-sm">您没有权限查看此页面数据，请联系管理员</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
