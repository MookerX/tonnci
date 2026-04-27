// =============================================================================
// 腾曦生产管理系统 - 安全API请求工具
// 描述: 封装fetch请求，处理HTML响应、网络错误、认证失效等异常情况
// =============================================================================

/**
 * API 响应格式
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
  timestamp?: number;
}

/**
 * 安全的 API 请求函数
 * 
 * 解决的问题：
 * - API 返回 HTML（如 Next.js 错误页、404页）时 .json() 报错 "Unexpected token '<'"
 * - 网络错误时无法获取有意义的信息
 * - 统一错误处理格式
 * 
 * 使用方式：
 * ```ts
 * // 替换前
 * const res = await fetch("/api/xxx");
 * const data = await res.json();
 * 
 * // 替换后
 * const data = await fetchApi("/api/xxx");
 * ```
 */
export async function fetchApi<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options);

    // 检查响应类型，如果是 HTML 则说明 API 路由异常
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      // API 返回了非 JSON 内容（通常是 HTML 错误页）
      console.error(
        `[fetchApi] API返回非JSON响应: ${url}, status=${res.status}, contentType=${contentType}`
      );

      // 根据状态码返回有意义的错误信息
      if (res.status === 404) {
        return {
          code: 404,
          message: "API接口不存在，请检查服务是否正常启动",
          data: null,
        };
      }
      if (res.status === 500) {
        return {
          code: 500,
          message: "服务器内部错误，请检查数据库连接和服务配置",
          data: null,
        };
      }
      if (res.status === 401) {
        return {
          code: 401,
          message: "登录已过期，请重新登录",
          data: null,
        };
      }
      return {
        code: res.status || 500,
        message: `服务异常（HTTP ${res.status}），请检查后端服务和数据库是否正常运行`,
        data: null,
      };
    }

    // 安全解析 JSON
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error(`[fetchApi] JSON解析失败: ${url}`, text.substring(0, 200));
      return {
        code: 500,
        message: "响应数据格式错误，请检查服务是否正常",
        data: null,
      };
    }
  } catch (error: any) {
    // 网络错误（服务未启动、DNS解析失败等）
    console.error(`[fetchApi] 请求失败: ${url}`, error);
    return {
      code: 0,
      message: error.message?.includes("Failed to fetch")
        ? "无法连接到服务器，请检查服务是否启动"
        : `网络请求失败: ${error.message || "未知错误"}`,
      data: null,
    };
  }
}

/**
 * 带认证的 API 请求
 * 自动从 localStorage 读取 token 并添加到请求头
 */
export async function fetchApiWithAuth<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetchApi<T>(url, {
    ...options,
    headers,
  });
}
