// 静态路由配置（与 layout.tsx 中 menuConfig 保持一致）
// 供菜单管理页面使用：展示所有可用路由，供管理员勾选显示/隐藏

export interface StaticRoute {
  key: string;
  label: string;
  icon: string;
  path: string;
  children?: StaticRoute[];
}

export const staticRoutes: StaticRoute[] = [
  {
    key: "home",
    label: "工作台",
    icon: "LayoutDashboard",
    path: "/dashboard",
  },
  {
    key: "system",
    label: "系统管理",
    icon: "Settings",
    children: [
      { key: "system-user", label: "用户管理", icon: "Users", path: "/dashboard/system/user" },
      { key: "system-role", label: "角色管理", icon: "Shield", path: "/dashboard/system/role" },
      { key: "system-dept", label: "部门管理", icon: "Building2", path: "/dashboard/system/dept" },
      { key: "system-menu", label: "菜单管理", icon: "Menu", path: "/dashboard/system/menu" },
      { key: "system-log", label: "操作日志", icon: "ScrollText", path: "/dashboard/system/log" },
      { key: "system-database", label: "数据库配置", icon: "Database", path: "/dashboard/system/database" },
      { key: "system-storage", label: "存储管理", icon: "HardDrive", path: "/dashboard/system/storage" },
      { key: "system-config", label: "系统参数", icon: "SlidersHorizontal", path: "/dashboard/system/config" },
    ],
  },
  {
    key: "tech",
    label: "技术管理",
    icon: "Wrench",
    children: [
      { key: "tech-bom", label: "BOM管理", icon: "Package", path: "/dashboard/tech/bom" },
      { key: "tech-drawing", label: "图纸管理", icon: "FileImage", path: "/dashboard/tech/drawing" },
      { key: "tech-process", label: "工艺管理", icon: "GitBranch", path: "/dashboard/tech/process" },
      { key: "tech-route", label: "工艺路线", icon: "Route", path: "/dashboard/tech/route" },
      { key: "tech-manhour", label: "工时管理", icon: "Clock", path: "/dashboard/tech/manhour" },
    ],
  },
  {
    key: "order",
    label: "订单管理",
    icon: "ClipboardList",
    path: "/dashboard/order",
  },
  {
    key: "tech-task",
    label: "技术任务池",
    icon: "Kanban",
    path: "/dashboard/tech-task",
  },
  {
    key: "production",
    label: "生产管理",
    icon: "Factory",
    children: [
      { key: "prod-task", label: "生产任务", icon: "ListTodo", path: "/dashboard/production/task" },
      { key: "prod-nesting", label: "激光套料", icon: "Layers", path: "/dashboard/production/nesting" },
      { key: "prod-report", label: "生产报工", icon: "ClipboardCheck", path: "/dashboard/production/report" },
      { key: "prod-instruction", label: "生产指令卡", icon: "FileText", path: "/dashboard/production/instruction" },
    ],
  },
  {
    key: "inventory",
    label: "库存管理",
    icon: "Warehouse",
    path: "/dashboard/inventory",
  },
  {
    key: "quality",
    label: "质量管理",
    icon: "CheckCircle",
    path: "/dashboard/quality",
  },
  {
    key: "purchase",
    label: "采购管理",
    icon: "ShoppingCart",
    children: [
      { key: "purchase-supplier", label: "供应商管理", icon: "Truck", path: "/dashboard/purchase/supplier" },
      { key: "purchase-demand", label: "采购需求", icon: "FilePlus", path: "/dashboard/purchase/demand" },
      { key: "purchase-order", label: "采购订单", icon: "FileSignature", path: "/dashboard/purchase/order" },
      { key: "purchase-receive", label: "到货入库", icon: "PackagePlus", path: "/dashboard/purchase/receive" },
    ],
  },
];

// 将静态路由扁平化为列表
export function flattenRoutes(routes: StaticRoute[]): StaticRoute[] {
  const result: StaticRoute[] = [];
  for (const route of routes) {
    if (route.children) {
      result.push(...flattenRoutes(route.children));
    } else {
      result.push(route);
    }
  }
  return result;
}
