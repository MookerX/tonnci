/**
 * 腾曦生产管理系统 - 权限配置
 * 定义每个模块的数据表操作权限
 * 格式: 模块:表名:操作
 * 操作类型: query(查询), create(新增), update(编辑), delete(删除), upload(上传), download(下载)
 */

// 模块配置
export const moduleConfig = {
  system: {
    name: '系统管理',
    tables: {
      user: { name: '用户', permissions: ['query', 'create', 'update', 'delete'] },
      role: { name: '角色', permissions: ['query', 'create', 'update', 'delete'] },
      dept: { name: '部门', permissions: ['query', 'create', 'update', 'delete'] },
      menu: { name: '菜单', permissions: ['query', 'create', 'update', 'delete'] },
      config: { name: '系统参数', permissions: ['query', 'create', 'update', 'delete'] },
      database: { name: '数据库配置', permissions: ['query', 'create', 'update', 'delete'] },
      storage: { name: '存储配置', permissions: ['query', 'create', 'update', 'delete'] },
      log: { name: '操作日志', permissions: ['query', 'delete'] },
    },
  },
  tech: {
    name: '技术管理',
    tables: {
      customer: { name: '客户', permissions: ['query', 'create', 'update', 'delete', 'upload', 'download'] },
      material: { name: '物料', permissions: ['query', 'create', 'update', 'delete', 'upload', 'download'] },
      bom: { name: 'BOM', permissions: ['query', 'create', 'update', 'delete', 'upload', 'download'] },
      process: { name: '工序', permissions: ['query', 'create', 'update', 'delete'] },
      route: { name: '工艺路线', permissions: ['query', 'create', 'update', 'delete'] },
      drawing: { name: '图纸', permissions: ['query', 'create', 'update', 'delete', 'upload', 'download'] },
    },
  },
  order: {
    name: '订单管理',
    tables: {
      productionOrder: { name: '生产订单', permissions: ['query', 'create', 'update', 'delete'] },
    },
  },
  techTask: {
    name: '技术任务池',
    tables: {
      techTask: { name: '技术任务', permissions: ['query', 'create', 'update', 'delete'] },
      techBomItem: { name: '任务BOM', permissions: ['query', 'create', 'update', 'delete'] },
      transfer: { name: '任务转交', permissions: ['query', 'create', 'update'] },
    },
  },
  production: {
    name: '生产管理',
    tables: {
      productionTask: { name: '生产任务', permissions: ['query', 'create', 'update', 'delete'] },
      taskProcess: { name: '任务工序', permissions: ['query', 'create', 'update', 'delete'] },
      nesting: { name: '激光套料', permissions: ['query', 'create', 'update', 'delete', 'upload', 'download'] },
      workReport: { name: '报工', permissions: ['query', 'create', 'update', 'delete'] },
      worker: { name: '员工', permissions: ['query', 'create', 'update', 'delete'] },
      team: { name: '班组', permissions: ['query', 'create', 'update', 'delete'] },
    },
  },
  inventory: {
    name: '库存管理',
    tables: {
      inventory: { name: '库存', permissions: ['query', 'create', 'update', 'delete'] },
      inventoryLock: { name: '库存锁定', permissions: ['query', 'create', 'update', 'delete'] },
      inventoryLog: { name: '库存流水', permissions: ['query', 'delete'] },
    },
  },
  quality: {
    name: '质量管理',
    tables: {
      qcRecord: { name: '质检记录', permissions: ['query', 'create', 'update', 'delete'] },
      reworkPlan: { name: '重做计划', permissions: ['query', 'create', 'update', 'delete'] },
    },
  },
  purchase: {
    name: '采购管理',
    tables: {
      supplier: { name: '供应商', permissions: ['query', 'create', 'update', 'delete'] },
      purchaseRequirement: { name: '采购需求', permissions: ['query', 'create', 'update', 'delete'] },
      purchaseOrder: { name: '采购订单', permissions: ['query', 'create', 'update', 'delete'] },
      purchaseReceive: { name: '采购入库', permissions: ['query', 'create', 'update', 'delete'] },
      purchaseInvoice: { name: '采购发票', permissions: ['query', 'create', 'update', 'delete'] },
    },
  },
  delivery: {
    name: '发货管理',
    tables: {
      deliveryPlan: { name: '发货计划', permissions: ['query', 'create', 'update', 'delete'] },
      afterSalesRecord: { name: '售后记录', permissions: ['query', 'create', 'update', 'delete'] },
    },
  },
  accounting: {
    name: '财务管理',
    tables: {
      customerReconciliation: { name: '客户对账', permissions: ['query', 'create', 'update', 'delete'] },
      invoice: { name: '发票', permissions: ['query', 'create', 'update', 'delete'] },
      paymentRecord: { name: '回款记录', permissions: ['query', 'create', 'update', 'delete'] },
    },
  },
  wages: {
    name: '工资管理',
    tables: {
      wageSettlement: { name: '工资结算', permissions: ['query', 'create', 'update', 'delete'] },
      wagePaymentRecord: { name: '工资发放', permissions: ['query', 'create', 'update', 'delete'] },
    },
  },
};

// 操作权限配置
export const actionConfig = [
  { value: 'query', label: '查询', desc: '查看和检索数据' },
  { value: 'create', label: '新增', desc: '创建新数据' },
  { value: 'update', label: '编辑', desc: '修改现有数据' },
  { value: 'delete', label: '删除', desc: '删除数据' },
  { value: 'upload', label: '上传', desc: '上传文件/附件' },
  { value: 'download', label: '下载', desc: '下载文件/附件' },
];

// 生成权限标识
export function generatePermission(module: string, table: string, action: string): string {
  return `${module}:${table}:${action}`;
}

// 获取所有权限列表
export function getAllPermissions(): Array<{ module: string; table: string; action: string; permission: string; label: string }> {
  const permissions: Array<{ module: string; table: string; action: string; permission: string; label: string }> = [];

  for (const [moduleKey, moduleData] of Object.entries(moduleConfig)) {
    for (const [tableKey, tableData] of Object.entries(moduleData.tables)) {
      for (const action of tableData.permissions) {
        const actionInfo = actionConfig.find(a => a.value === action);
        permissions.push({
          module: moduleKey,
          table: tableKey,
          action,
          permission: generatePermission(moduleKey, tableKey, action),
          label: `${moduleData.name}-${tableData.name}-${actionInfo?.label || action}`,
        });
      }
    }
  }

  return permissions;
}

// 获取模块下的所有权限
export function getModulePermissions(moduleKey: string): Array<{ table: string; tableName: string; action: string; permission: string; label: string }> {
  const moduleData = moduleConfig[moduleKey as keyof typeof moduleConfig];
  if (!moduleData) return [];

  const permissions: Array<{ table: string; tableName: string; action: string; permission: string; label: string }> = [];

  for (const [tableKey, tableData] of Object.entries(moduleData.tables)) {
    for (const action of tableData.permissions) {
      const actionInfo = actionConfig.find(a => a.value === action);
      permissions.push({
        table: tableKey,
        tableName: tableData.name,
        action,
        permission: generatePermission(moduleKey, tableKey, action),
        label: `${tableData.name}-${actionInfo?.label || action}`,
      });
    }
  }

  return permissions;
}
