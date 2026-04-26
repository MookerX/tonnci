// =============================================================================
// 腾曦生产管理系统 - API路由验证器
// 描述: API路由参数校验配置
// =============================================================================

import { z } from 'zod';

// =============================================================================
// 通用校验规则
// =============================================================================

// ID参数校验
export const idSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0, {
    message: 'ID必须是大于0的整数',
  }),
});

// 分页参数校验
export const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1).refine(val => val > 0, { message: '页码必须大于0' }),
  pageSize: z.string().optional().transform(val => val ? parseInt(val, 10) : 20).refine(val => val > 0 && val <= 100, { message: '每页数量必须在1-100之间' }),
});

// =============================================================================
// 认证模块校验
// =============================================================================

// 登录参数
export const loginSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(50, '用户名最多50个字符'),
  password: z.string().min(6, '密码至少6个字符').max(100, '密码最多100个字符'),
});

// 注册参数
export const registerSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(50, '用户名最多50个字符'),
  password: z.string().min(6, '密码至少6个字符').max(100, '密码最多100个字符'),
  realName: z.string().max(50, '姓名最多50个字符').optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
});

// =============================================================================
// 用户管理校验
// =============================================================================

// 用户创建/更新参数
export const userSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(50, '用户名最多50个字符'),
  password: z.string().min(6, '密码至少6个字符').max(100, '密码最多100个字符').optional(),
  realName: z.string().max(50, '姓名最多50个字符').optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  deptId: z.number().int().positive('部门ID必须为正整数').optional().nullable(),
  roleIds: z.string().optional(),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 部门管理校验
// =============================================================================

// 部门创建/更新参数
export const deptSchema = z.object({
  parentId: z.number().int().positive().optional().nullable(),
  deptName: z.string().min(1, '部门名称不能为空').max(100, '部门名称最多100个字符'),
  deptCode: z.string().max(50).optional(),
  leaderName: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 角色管理校验
// =============================================================================

// 角色创建/更新参数
export const roleSchema = z.object({
  roleName: z.string().min(1, '角色名称不能为空').max(100, '角色名称最多100个字符'),
  roleCode: z.string().min(1, '角色编码不能为空').max(50, '角色编码最多50个字符'),
  dataScope: z.enum(['custom', 'dept', 'all']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  sortOrder: z.number().int().min(0).optional(),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 物料管理校验
// =============================================================================

// 物料创建/更新参数
export const materialSchema = z.object({
  materialName: z.string().min(1, '物料名称不能为空').max(200, '物料名称最多200个字符'),
  internalCode: z.string().max(50).optional(),
  drawingCode: z.string().max(50).optional(),
  drawingNo: z.string().max(50).optional(),
  materialType: z.enum(['part', 'component', 'raw_material', 'purchased', 'standard', 'auxiliary']).optional(),
  unit: z.string().max(20).optional(),
  spec: z.string().max(500).optional(),
  weight: z.number().positive().optional(),
  customerId: z.number().int().positive().optional().nullable(),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 客户管理校验
// =============================================================================

// 客户创建/更新参数
export const customerSchema = z.object({
  customerName: z.string().min(1, '客户名称不能为空').max(200, '客户名称最多200个字符'),
  customerType: z.enum(['enterprise', 'personal']).optional(),
  contactPerson: z.string().max(50).optional(),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  taxNo: z.string().max(50).optional(),
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  creditLevel: z.string().max(10).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 订单管理校验
// =============================================================================

// 订单创建/更新参数
export const orderSchema = z.object({
  customerId: z.number().int().positive('客户ID必须为正整数'),
  materialId: z.number().int().positive('物料ID必须为正整数'),
  quantity: z.number().int().positive('数量必须为正整数'),
  customerOrderNo: z.string().max(50).optional(),
  unitPrice: z.number().positive().optional(),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  nestingPlanDate: z.string().optional(),
  materialPlanDate: z.string().optional(),
  purchasePlanDate: z.string().optional(),
  productionPlanDate: z.string().optional(),
  deliveryAddress: z.string().max(500).optional(),
  freightBear: z.string().max(20).optional(),
  projectName: z.string().max(100).optional(),
  projectCode: z.string().max(50).optional(),
  equipmentNo: z.string().max(50).optional(),
  equipmentName: z.string().max(100).optional(),
  surfaceTreatment: z.string().max(100).optional(),
  orderStatus: z.enum(['pending', 'processing', 'completed', 'cancelled', 'paused']).optional(),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 生产任务校验
// =============================================================================

// 生产任务创建参数
export const productionTaskSchema = z.object({
  orderId: z.number().int().positive('订单ID必须为正整数'),
  materialId: z.number().int().positive('物料ID必须为正整数'),
  taskQuantity: z.number().int().positive('任务数量必须为正整数'),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 报工记录校验
// =============================================================================

// 报工记录参数
export const workReportSchema = z.object({
  taskId: z.number().int().positive('任务ID必须为正整数'),
  processId: z.number().int().positive('工序ID必须为正整数'),
  workerId: z.number().int().positive('员工ID必须为正整数').optional().nullable(),
  workType: z.enum(['piece', 'time']).optional(),
  reportDate: z.string(),
  quantity: z.number().int().min(0, '数量不能为负数'),
  actualHours: z.number().positive().optional(),
  overtimeHours: z.number().positive().optional(),
  piecePrice: z.number().positive().optional(),
  allowance: z.number().min(0).optional(),
  deduction: z.number().min(0).optional(),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 质检记录校验
// =============================================================================

// 质检记录参数
export const qcRecordSchema = z.object({
  taskId: z.number().int().positive('任务ID必须为正整数'),
  processId: z.number().int().positive('工序ID必须为正整数'),
  qcType: z.enum(['first', '巡检', 'final']),
  inspectedQty: z.number().int().min(0, '检验数量不能为负数'),
  qualifiedQty: z.number().int().min(0, '合格数量不能为负数'),
  unqualifiedQty: z.number().int().min(0, '不合格数量不能为负数'),
  unqualifiedReason: z.string().max(500).optional(),
  handlingMethod: z.enum(['rework', 'scrap', 'accept']).optional(),
  inspectionDate: z.string(),
  photos: z.string().optional(),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 采购管理校验
// =============================================================================

// 供应商参数
export const supplierSchema = z.object({
  supplierName: z.string().min(1, '供应商名称不能为空').max(200, '供应商名称最多200个字符'),
  contactPerson: z.string().max(50).optional(),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  taxNo: z.string().max(50).optional(),
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  supplyTypes: z.string().max(200).optional(),
  rating: z.string().max(10).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().max(500).optional(),
});

// 采购需求参数
export const purchaseRequirementSchema = z.object({
  materialId: z.number().int().positive('物料ID必须为正整数'),
  requirementQty: z.number().int().positive('需求数量必须为正整数'),
  unitPrice: z.number().positive().optional(),
  requiredDate: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  sourceType: z.enum(['auto', 'manual']).optional(),
  remark: z.string().max(500).optional(),
});

// 采购订单参数
export const purchaseOrderSchema = z.object({
  supplierId: z.number().int().positive('供应商ID必须为正整数'),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  items: z.array(z.object({
    materialId: z.number().int().positive('物料ID必须为正整数'),
    orderQty: z.number().int().positive('订单数量必须为正整数'),
    unitPrice: z.number().positive('单价必须为正数'),
  })).min(1, '订单明细至少一条'),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 库存管理校验
// =============================================================================

// 库存调整参数
export const inventoryAdjustSchema = z.object({
  materialId: z.number().int().positive('物料ID必须为正整数'),
  changeQty: z.number().int('变更数量必须是整数'),
  changeType: z.enum(['increase', 'decrease', 'lock', 'unlock']),
  orderId: z.number().int().positive().optional().nullable(),
  taskId: z.number().int().positive().optional().nullable(),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 工资结算校验
// =============================================================================

// 工资结算参数
export const wageSettlementSchema = z.object({
  settleMonth: z.string().regex(/^\d{4}-\d{2}$/, '结算月份格式不正确'),
  remark: z.string().max(500).optional(),
});

// =============================================================================
// 系统配置校验
// =============================================================================

// 系统初始化参数
export const systemInitSchema = z.object({
  // 数据库配置（可选，因为数据库已经配置好）
  dbHost: z.string().optional(),
  dbPort: z.number().int().min(1).max(65535).optional(),
  dbUsername: z.string().optional(),
  dbPassword: z.string().optional(),
  dbName: z.string().optional(),
  
  // 管理员信息
  adminUsername: z.string().min(2, '管理员用户名至少2个字符').max(50),
  adminPassword: z.string().min(6, '管理员密码至少6个字符').max(100),
  adminRealName: z.string().max(50).optional(),
  adminPhone: z.string().max(20).optional(),
  adminEmail: z.string().email().optional().or(z.literal('')),
  
  // 存储配置
  storagePath: z.string().optional(),
  storageType: z.enum(['local', 'nas']).optional(),
  
  // 基础参数
  companyName: z.string().optional(),
  fileTypes: z.string().optional(),
  maxFileSize: z.number().optional(),
  orderPrefix: z.string().optional(),
  materialPrefix: z.string().optional(),
});

// 字典参数
export const dictSchema = z.object({
  dictType: z.string().min(1, '字典类型不能为空').max(50),
  dictLabel: z.string().min(1, '字典标签不能为空').max(100),
  dictValue: z.string().min(1, '字典值不能为空').max(100),
  sortOrder: z.number().int().min(0).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().max(500).optional(),
});

// NAS配置参数
export const nasSchema = z.object({
  deviceName: z.string().min(1, '设备名称不能为空').max(100),
  deviceType: z.enum(['synology', 'qnap', 'local']).optional(),
  host: z.string().min(1, '主机地址不能为空').max(255),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().max(100).optional(),
  password: z.string().optional(),
  sharePath: z.string().max(500).optional(),
  storageTypes: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().max(500).optional(),
});
