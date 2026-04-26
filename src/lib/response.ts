// =============================================================================
// 腾曦生产管理系统 - 统一响应格式与错误处理
// 描述: 全局API响应格式、错误类型定义、业务异常类
// =============================================================================

import { NextResponse } from 'next/server';

// =============================================================================
// 响应码枚举
// =============================================================================
export enum ResponseCode {
  SUCCESS = 200,              // 成功
  BAD_REQUEST = 400,          // 参数错误
  UNAUTHORIZED = 401,         // 未授权/未登录
  FORBIDDEN = 403,            // 无权限/业务异常
  NOT_FOUND = 404,            // 资源不存在
  INTERNAL_ERROR = 500,      // 服务器内部错误
  SERVICE_UNAVAILABLE = 503, // 服务不可用
}

// =============================================================================
// 统一响应结构接口
// =============================================================================
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
  timestamp: number;
  requestId?: string;
}

// =============================================================================
// 分页响应结构
// =============================================================================
export interface PaginatedResponse<T = any> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// 统一响应生成函数
// =============================================================================

/**
 * 成功响应
 */
export function successResponse<T>(data?: T, message = '操作成功'): NextResponse {
  const response: ApiResponse<T> = {
    code: ResponseCode.SUCCESS,
    message,
    data: data ?? null,
    timestamp: Date.now(),
  };
  return NextResponse.json(response, { status: 200 });
}

/**
 * 分页响应
 */
export function paginatedResponse<T>(
  list: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  },
  message = '查询成功'
): NextResponse {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const response: ApiResponse<PaginatedResponse<T>> = {
    code: ResponseCode.SUCCESS,
    message,
    data: {
      list,
      pagination: {
        ...pagination,
        totalPages,
      },
    },
    timestamp: Date.now(),
  };
  return NextResponse.json(response, { status: 200 });
}

/**
 * 错误响应 - 参数错误
 */
export function badRequestResponse(message = '参数错误'): NextResponse {
  const response: ApiResponse = {
    code: ResponseCode.BAD_REQUEST,
    message,
    data: null,
    timestamp: Date.now(),
  };
  return NextResponse.json(response, { status: 400 });
}

/**
 * 错误响应 - 未授权
 */
export function unauthorizedResponse(message = '未登录或登录已过期'): NextResponse {
  const response: ApiResponse = {
    code: ResponseCode.UNAUTHORIZED,
    message,
    data: null,
    timestamp: Date.now(),
  };
  return NextResponse.json(response, { status: 401 });
}

/**
 * 错误响应 - 无权限
 */
export function forbiddenResponse(message = '无操作权限'): NextResponse {
  const response: ApiResponse = {
    code: ResponseCode.FORBIDDEN,
    message,
    data: null,
    timestamp: Date.now(),
  };
  return NextResponse.json(response, { status: 403 });
}

/**
 * 错误响应 - 资源不存在
 */
export function notFoundResponse(message = '资源不存在'): NextResponse {
  const response: ApiResponse = {
    code: ResponseCode.NOT_FOUND,
    message,
    data: null,
    timestamp: Date.now(),
  };
  return NextResponse.json(response, { status: 404 });
}

/**
 * 错误响应 - 服务器内部错误
 */
export function serverErrorResponse(message = '服务器内部错误', error?: any): NextResponse {
  console.error('Server Error:', error);
  const response: ApiResponse = {
    code: ResponseCode.INTERNAL_ERROR,
    message,
    data: process.env.NODE_ENV === 'development' ? { error: String(error) } : null,
    timestamp: Date.now(),
  };
  return NextResponse.json(response, { status: 500 });
}

/**
 * 通用错误响应
 */
export function errorResponse(statusCode: number, message = '操作失败'): NextResponse {
  const response: ApiResponse = {
    code: statusCode,
    message,
    data: null,
    timestamp: Date.now(),
  };
  return NextResponse.json(response, { status: statusCode });
}

// =============================================================================
// 自定义业务异常类
// =============================================================================

export class BusinessException extends Error {
  public code: number;
  public data: any;

  constructor(message: string, code = ResponseCode.FORBIDDEN, data?: any) {
    super(message);
    this.name = 'BusinessException';
    this.code = code;
    this.data = data;
  }
}

export class ValidationException extends Error {
  public errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ValidationException';
    this.errors = errors;
  }
}

export class UnauthorizedException extends Error {
  constructor(message = '未授权') {
    super(message);
    this.name = 'UnauthorizedException';
  }
}

export class ForbiddenException extends Error {
  constructor(message = '无权限访问') {
    super(message);
    this.name = 'ForbiddenException';
  }
}

export class NotFoundException extends Error {
  constructor(message = '资源不存在') {
    super(message);
    this.name = 'NotFoundException';
  }
}

// =============================================================================
// 异常处理函数
// =============================================================================

export function handleException(error: any): NextResponse {
  console.error('Exception:', error);

  if (error instanceof BusinessException) {
    return NextResponse.json({
      code: error.code,
      message: error.message,
      data: error.data,
      timestamp: Date.now(),
    }, { status: error.code });
  }

  if (error instanceof ValidationException) {
    return NextResponse.json({
      code: ResponseCode.BAD_REQUEST,
      message: error.message,
      data: error.errors,
      timestamp: Date.now(),
    }, { status: 400 });
  }

  if (error instanceof UnauthorizedException) {
    return unauthorizedResponse(error.message);
  }

  if (error instanceof ForbiddenException) {
    return forbiddenResponse(error.message);
  }

  if (error instanceof NotFoundException) {
    return notFoundResponse(error.message);
  }

  // Prisma错误处理
  if (error.code === 'P2002') {
    return badRequestResponse('数据已存在，违反唯一约束');
  }

  if (error.code === 'P2025') {
    return notFoundResponse('数据不存在或已被删除');
  }

  // 默认服务器错误
  return serverErrorResponse(
    process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误',
    error
  );
}
