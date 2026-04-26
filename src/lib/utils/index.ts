// =============================================================================
// 腾曦生产管理系统 - 通用工具函数
// 描述: 编码生成、日期处理、数据校验等工具函数
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';

// =============================================================================
// 编码生成器
// =============================================================================

/**
 * 生成订单号
 * 格式: DD + 年月日 + 6位序号
 */
export async function generateOrderNo(): Promise<string> {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = 'DD';
  
  // 查询当天最大的序号
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNo: {
        startsWith: `${prefix}${dateStr}`,
      },
    },
    orderBy: { orderNo: 'desc' },
    select: { orderNo: true },
  });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNo.slice(-6));
    sequence = lastSeq + 1;
  }
  
  return `${prefix}${dateStr}${sequence.toString().padStart(6, '0')}`;
}

/**
 * 生成物料编码
 * 格式: 类型首字母 + 8位序号
 */
export async function generateMaterialCode(materialType: string): Promise<string> {
  const typeMap: Record<string, string> = {
    part: 'P',
    component: 'C',
    raw_material: 'R',
    purchased: 'S',
    standard: 'B',
    auxiliary: 'A',
  };
  
  const prefix = typeMap[materialType] || 'X';
  
  // 查询当前最大序号
  const lastMaterial = await prisma.material.findFirst({
    where: {
      materialCode: {
        startsWith: prefix,
      },
    },
    orderBy: { materialCode: 'desc' },
    select: { materialCode: true },
  });
  
  let sequence = 1;
  if (lastMaterial) {
    const lastSeq = parseInt(lastMaterial.materialCode.slice(1));
    sequence = lastSeq + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(8, '0')}`;
}

/**
 * 生成客户编码
 * 格式: KH + 6位序号
 */
export async function generateCustomerCode(): Promise<string> {
  const prefix = 'KH';
  
  const lastCustomer = await prisma.customer.findFirst({
    orderBy: { customerCode: 'desc' },
    select: { customerCode: true },
  });
  
  let sequence = 1;
  if (lastCustomer) {
    const lastSeq = parseInt(lastCustomer.customerCode.slice(2));
    sequence = lastSeq + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(6, '0')}`;
}

/**
 * 生成供应商编码
 * 格式: GY + 6位序号
 */
export async function generateSupplierCode(): Promise<string> {
  const prefix = 'GY';
  
  const lastSupplier = await prisma.supplier.findFirst({
    orderBy: { supplierCode: 'desc' },
    select: { supplierCode: true },
  });
  
  let sequence = 1;
  if (lastSupplier) {
    const lastSeq = parseInt(lastSupplier.supplierCode.slice(2));
    sequence = lastSeq + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(6, '0')}`;
}

/**
 * 生成UUID
 */
export function generateUuid(): string {
  return uuidv4();
}

/**
 * 生成唯一编号（通用）
 */
export function generateUniqueNo(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}${timestamp}${random}`.toUpperCase();
}

// =============================================================================
// 日期处理函数
// =============================================================================

/**
 * 格式化日期
 */
export function formatDate(date: Date | string, format = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss');
}

/**
 * 获取日期范围
 */
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * 计算工作日
 */
export function addWorkDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // 排除周六周日
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  
  return result;
}

/**
 * 获取月第一天和最后一天
 */
export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
}

// =============================================================================
// 数据处理函数
// =============================================================================

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 移除对象中的空值
 */
export function removeEmpty<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      result[key] = value;
    }
  }
  
  return result as Partial<T>;
}

/**
 * 数组分组
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * 数组去重
 */
export function unique<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * 数组分块
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// =============================================================================
// 数字处理函数
// =============================================================================

/**
 * 四舍五入到指定小数位
 */
export function round(num: number, decimals = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * 金额格式化
 */
export function formatMoney(amount: number, decimals = 2): string {
  return amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 百分比格式化
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// =============================================================================
// 网络工具函数
// =============================================================================

/**
 * 获取客户端IP地址
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return '127.0.0.1';
}

// =============================================================================
// 字符串处理函数
// =============================================================================

/**
 * 脱敏手机号
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/**
 * 脱敏邮箱
 */
export function maskEmail(email: string): string {
  if (!email) return email;
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const maskedName = name.slice(0, 2) + '***';
  return `${maskedName}@${domain}`;
}

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 下划线转驼峰
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 驼峰转下划线
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}



export default {
  generateOrderNo,
  generateMaterialCode,
  generateCustomerCode,
  generateSupplierCode,
  generateUuid,
  generateUniqueNo,
  formatDate,
  formatDateTime,
  addWorkDays,
  getMonthRange,
  deepClone,
  removeEmpty,
  groupBy,
  unique,
  chunk,
  round,
  formatMoney,
  formatPercent,
  maskPhone,
  maskEmail,
  capitalize,
  toCamelCase,
  toSnakeCase,
  getClientIp,
};
