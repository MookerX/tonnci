// =============================================================================
// 腾曦生产管理系统 - 权限守卫组件
// 根据用户权限控制子元素的显示/隐藏
// =============================================================================

"use client";

import { useAuth } from "@/components/AuthProvider";

interface PermissionGuardProps {
  /** 需要的权限，如 "system:user:create" */
  permission?: string;
  /** 需要的权限（任一满足即可），如 ["system:user:create", "system:user:update"] */
  anyPermission?: string[];
  /** 无权限时是否显示禁用状态（默认直接隐藏） */
  fallbackDisabled?: boolean;
  /** 子元素 */
  children: React.ReactNode;
}

/**
 * 权限守卫组件
 * 
 * 用法1 - 隐藏无权限的按钮:
 * <PermissionGuard permission="system:user:create">
 *   <button>添加用户</button>
 * </PermissionGuard>
 * 
 * 用法2 - 多权限任一满足:
 * <PermissionGuard anyPermission={["system:user:update", "system:user:delete"]}>
 *   <button>操作</button>
 * </PermissionGuard>
 * 
 * 用法3 - 无权限时显示禁用按钮:
 * <PermissionGuard permission="system:user:delete" fallbackDisabled>
 *   <button>删除</button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  anyPermission,
  fallbackDisabled,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission } = useAuth();

  let authorized = false;
  if (permission) {
    authorized = hasPermission(permission);
  } else if (anyPermission) {
    authorized = hasAnyPermission(anyPermission);
  } else {
    // 没有指定权限要求，默认显示
    authorized = true;
  }

  if (authorized) {
    return <>{children}</>;
  }

  // 禁用模式：显示但添加 disabled 样式
  if (fallbackDisabled) {
    return (
      <div className="inline-block opacity-40 cursor-not-allowed pointer-events-none">
        {children}
      </div>
    );
  }

  // 默认：直接隐藏
  return null;
}
