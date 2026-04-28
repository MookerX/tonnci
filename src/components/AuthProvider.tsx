// =============================================================================
// 腾曦生产管理系统 - 全局认证与权限上下文
// 提供: 登录状态、用户信息、权限列表、权限检查函数、菜单过滤
// =============================================================================

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
        // token无效或已过期
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
      // 超级管理员拥有所有权限
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
