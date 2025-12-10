/**
 * 统一的 API 响应格式接口
 */
export interface ApiResponse<T = any> {
  code: number
  data: T
  msg: string
}

/**
 * 创建成功响应
 * 注意：code 使用 200 与前端 axios 封装保持一致
 */
export function successResponse<T>(data: T, msg = 'success'): ApiResponse<T> {
  return {
    code: 200,
    data,
    msg,
  }
}

/**
 * 创建错误响应
 */
export function errorResponse(msg = 'error', code = 500): ApiResponse<null> {
  return {
    code,
    data: null,
    msg,
  }
}

