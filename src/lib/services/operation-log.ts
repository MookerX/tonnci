// =============================================================================
// 腾曦生产管理系统 - 操作日志服务
// 描述: 记录所有系统操作日志
// =============================================================================

import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// 业务类型枚举
// =============================================================================

export enum BusinessType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  IMPORT = 'import',
  EXPORT = 'export',
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  PERMISSION = 'permission',
  TASK_TRANSFER = 'task_transfer',
  INVENTORY_LOCK = 'inventory_lock',
  INVENTORY_UNLOCK = 'inventory_unlock',
  INVENTORY_CONSUME = 'inventory_consume',
  ORDER_SUBMIT = 'order_submit',
  ORDER_CANCEL = 'order_cancel',
  TASK_ASSIGN = 'task_assign',
  TASK_COMPLETE = 'task_complete',
  QUALITY_CHECK = 'quality_check',
  PRODUCTION_START = 'production_start',
  PRODUCTION_COMPLETE = 'production_complete',
  SHIPMENT = 'shipment',
  PAYMENT = 'payment',
}

// =============================================================================
// 操作日志数据接口
// =============================================================================

export interface LogData {
  moduleName: string;
  businessType: BusinessType | string;
  operatorType?: 'user' | 'system';
  operatorId?: number;
  operatorName?: string;
  requestMethod?: string;
  requestUrl?: string;
  requestParams?: any;
  requestBody?: any;
  responseCode?: string;
  responseMsg?: string;
  responseData?: any;
  operationDesc?: string;
  ipAddress?: string;
  userAgent?: string;
  executionTime?: number;
  status?: 'success' | 'fail' | 'warning';
  errorMsg?: string;
  oldData?: any;
  newData?: any;
}

// =============================================================================
// 操作日志服务类
// =============================================================================

class OperationLogService {
  /**
   * 记录操作日志（支持两种调用方式）
   * 方式1: log({ moduleName, businessType, ... })
   * 方式2: log(moduleName, businessType, operatorId, operatorName, params, ipAddress, status)
   */
  async log(logDataOrModule: LogData | string, businessTypeOrDesc?: BusinessType | string, operatorId?: number, operatorName?: string, requestParams?: any, ipAddress?: string, status?: 'success' | 'fail' | 'warning'): Promise<void> {
    // 兼容两种调用方式
    let logData: LogData;
    if (typeof logDataOrModule === 'string') {
      // 位置参数方式
      logData = {
        moduleName: logDataOrModule,
        businessType: (businessTypeOrDesc || '') as string,
        operatorId,
        operatorName,
        requestParams,
        ipAddress,
        status: status || 'success',
      };
    } else {
      logData = logDataOrModule;
    }

    try {
      const log = {
        uuid: uuidv4(),
        moduleName: logData.moduleName,
        businessType: logData.businessType,
        operatorType: logData.operatorType || 'user',
        operatorId: logData.operatorId || null,
        operatorName: logData.operatorName || null,
        requestMethod: logData.requestMethod || null,
        requestUrl: logData.requestUrl || null,
        requestParams: logData.requestParams ? JSON.stringify(logData.requestParams) : null,
        requestBody: logData.requestBody ? this.maskSensitiveData(JSON.stringify(logData.requestParams)) : null,
        responseCode: logData.responseCode || null,
        responseMsg: logData.responseMsg || null,
        responseData: logData.responseData ? JSON.stringify(logData.responseData) : null,
        operationDesc: logData.operationDesc || null,
        ipAddress: logData.ipAddress || null,
        userAgent: logData.userAgent || null,
        executionTime: logData.executionTime || null,
        status: logData.status || 'success',
        errorMsg: logData.errorMsg || null,
      };

      await prisma.operationLog.create({
        data: {
          moduleName: logData.moduleName,
          businessType: logData.businessType,
          operatorId: logData.operatorId || null,
          operatorName: logData.operatorName || null,
          operationDesc: logData.operationDesc || null,
          requestParams: logData.requestParams ? JSON.stringify(logData.requestParams) : null,
          ipAddress: logData.ipAddress || null,
          status: logData.status || 'success',
          errorMessage: logData.errorMsg || null,
          oldData: (logData as any).oldData ? JSON.stringify((logData as any).oldData) : null,
          newData: (logData as any).newData ? JSON.stringify((logData as any).newData) : null,
        },
      });
    } catch (error) {
      console.error('Failed to write operation log:', error);
      // 日志写入失败不影响主业务
    }
  }

  /**
   * 记录成功操作
   */
  async logSuccess(logData: Omit<LogData, 'status'>): Promise<void> {
    await this.log({
      ...logData,
      status: 'success',
    });
  }

  /**
   * 记录失败操作
   */
  async logFail(logData: Omit<LogData, 'status' | 'errorMsg'>, errorMsg: string): Promise<void> {
    await this.log({
      ...logData,
      status: 'fail',
      errorMsg,
    });
  }

  /**
   * 记录警告操作
   */
  async logWarning(logData: Omit<LogData, 'status'>, warningMsg: string): Promise<void> {
    await this.log({
      ...logData,
      status: 'warning',
      errorMsg: warningMsg,
    });
  }

  /**
   * 记录登录操作
   */
  async logLogin(
    userId: number,
    username: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    errorMsg?: string
  ): Promise<void> {
    await this.log({
      moduleName: '用户认证',
      businessType: BusinessType.LOGIN,
      operatorId: success ? userId : undefined,
      operatorName: success ? username : undefined,
      operationDesc: success ? '用户登录成功' : '用户登录失败',
      ipAddress,
      userAgent,
      status: success ? 'success' : 'fail',
      errorMsg,
    });
  }

  /**
   * 记录登出操作
   */
  async logLogout(userId: number, username: string, ipAddress: string): Promise<void> {
    await this.log({
      moduleName: '用户认证',
      businessType: BusinessType.LOGOUT,
      operatorId: userId,
      operatorName: username,
      operationDesc: '用户登出',
      ipAddress,
      status: 'success',
    });
  }

  /**
   * 记录数据创建
   */
  async logCreate(
    moduleName: string,
    operatorId: number,
    operatorName: string,
    createdData: any,
    ipAddress?: string
  ): Promise<void> {
    await this.logSuccess({
      moduleName,
      businessType: BusinessType.CREATE,
      operatorId,
      operatorName,
      operationDesc: `创建${moduleName}`,
      requestParams: createdData,
      ipAddress,
    });
  }

  /**
   * 记录数据更新
   */
  async logUpdate(
    moduleName: string,
    operatorId: number,
    operatorName: string,
    beforeData: any,
    afterData: any,
    ipAddress?: string
  ): Promise<void> {
    // 生成详细的变更描述
    const changes = this.generateChangeDescription(beforeData, afterData);
    const desc = changes ? `更新${moduleName}：${changes}` : `更新${moduleName}`;
    
    await this.logSuccess({
      moduleName,
      businessType: BusinessType.UPDATE,
      operatorId,
      operatorName,
      operationDesc: desc,
      requestParams: beforeData,
      responseData: afterData,
      oldData: beforeData,
      newData: afterData,
      ipAddress,
    });
  }

  /**
   * 生成变更描述
   */
  private generateChangeDescription(oldData: any, newData: any): string {
    if (!oldData || !newData) return '';
    
    const changes: string[] = [];
    
    for (const key of Object.keys(newData)) {
      const oldVal = oldData[key];
      const newVal = newData[key];
      
      // 跳过不需要记录的字段
      if (['id', 'createdAt', 'updatedAt', 'createdBy', 'modifiedBy', 'isDelete', 'password', 'roleIds', 'menuIds'].includes(key)) {
        continue;
      }
      
      // 比较值
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        const oldStr = this.formatValue(oldVal);
        const newStr = this.formatValue(newVal);
        changes.push(`${key}: ${oldStr || '(空)'} → ${newStr || '(空)'}`);
      }
    }
    
    return changes.join('; ');
  }

  /**
   * 格式化值为可读字符串
   */
  private formatValue(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  /**
   * 记录数据删除
   */
  async logDelete(
    moduleName: string,
    operatorId: number,
    operatorName: string,
    deletedData: any,
    ipAddress?: string
  ): Promise<void> {
    await this.logSuccess({
      moduleName,
      businessType: BusinessType.DELETE,
      operatorId,
      operatorName,
      operationDesc: `删除${moduleName}`,
      requestParams: deletedData,
      ipAddress,
    });
  }

  /**
   * 记录库存操作
   */
  async logInventoryOperation(
    operationType: BusinessType,
    operatorId: number,
    operatorName: string,
    materialId: number,
    quantity: number,
    sourceType: string,
    sourceId: number,
    remark?: string
  ): Promise<void> {
    await this.logSuccess({
      moduleName: '库存管理',
      businessType: operationType,
      operatorId,
      operatorName,
      operationDesc: `${operationType === BusinessType.INVENTORY_LOCK ? '锁定' : operationType === BusinessType.INVENTORY_UNLOCK ? '解锁' : '消耗'}库存`,
      requestParams: {
        materialId,
        quantity,
        sourceType,
        sourceId,
        remark,
      },
    });
  }

  /**
   * 记录文件上传
   */
  async logUpload(
    operatorId: number,
    operatorName: string,
    fileName: string,
    fileSize: number,
    storageType: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logSuccess({
      moduleName: '文件管理',
      businessType: BusinessType.UPLOAD,
      operatorId,
      operatorName,
      operationDesc: `上传文件: ${fileName}`,
      requestParams: {
        fileName,
        fileSize,
        storageType,
      },
      ipAddress,
    });
  }

  /**
   * 记录导入操作
   */
  async logImport(
    moduleName: string,
    operatorId: number,
    operatorName: string,
    fileName: string,
    totalRows: number,
    successRows: number,
    failRows: number,
    ipAddress?: string
  ): Promise<void> {
    await this.logSuccess({
      moduleName,
      businessType: BusinessType.IMPORT,
      operatorId,
      operatorName,
      operationDesc: `导入${moduleName}数据`,
      requestParams: {
        fileName,
        totalRows,
        successRows,
        failRows,
      },
      ipAddress,
    });
  }

  /**
   * 记录权限变更
   */
  async logPermissionChange(
    operatorId: number,
    operatorName: string,
    targetUserId: number,
    targetUsername: string,
    changeType: string,
    beforePermissions: string[],
    afterPermissions: string[],
    ipAddress?: string
  ): Promise<void> {
    await this.logSuccess({
      moduleName: '权限管理',
      businessType: BusinessType.PERMISSION,
      operatorId,
      operatorName,
      operationDesc: `修改用户[${targetUsername}]权限`,
      requestParams: {
        targetUserId,
        targetUsername,
        changeType,
        beforePermissions,
        afterPermissions,
      },
      ipAddress,
    });
  }

  /**
   * 记录任务流转
   */
  async logTaskTransfer(
    operatorId: number,
    operatorName: string,
    taskId: number,
    taskTitle: string,
    fromUserId: number,
    fromUsername: string,
    toUserId: number,
    toUsername: string,
    reason?: string
  ): Promise<void> {
    await this.logSuccess({
      moduleName: '技术任务',
      businessType: BusinessType.TASK_TRANSFER,
      operatorId,
      operatorName,
      operationDesc: `转交任务[${taskTitle}]`,
      requestParams: {
        taskId,
        taskTitle,
        fromUserId,
        fromUsername,
        toUserId,
        toUsername,
        reason,
      },
    });
  }

  /**
   * 脱敏敏感数据
   */
  private maskSensitiveData(data: string): string {
    try {
      const obj = JSON.parse(data);
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];
      
      for (const key of Object.keys(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '***';
        }
      }
      
      return JSON.stringify(obj);
    } catch {
      return data;
    }
  }
}

// 导出单例
export const operationLog = new OperationLogService();
export default operationLog;
