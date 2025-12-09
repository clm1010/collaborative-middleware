import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

/**
 * 权限校验响应接口
 */
export interface PermissionCheckResponse {
  code: number
  data: boolean // true=有权限, false=无权限
  status: number // 200=正常, 500=异常
  msg?: string
}

/**
 * 文件流响应接口
 */
export interface FileStreamResponse {
  hasData: boolean
  data: Buffer | null
  contentType?: string
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)
  private readonly httpClient: AxiosInstance
  private readonly javaApiBase: string

  constructor(private configService: ConfigService) {
    // 从环境变量获取 Java 后端地址，默认为 192.168.8.104:8080
    this.javaApiBase =
      this.configService.get<string>('JAVA_API_URL') || 'http://192.168.8.104:8080'

    this.logger.log(`Java API 地址: ${this.javaApiBase}`)

    // 创建 axios 实例
    this.httpClient = axios.create({
      baseURL: this.javaApiBase,
      timeout: 30000, // 30秒超时
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * 权限校验
   * 调用 Java 后端: POST /api/users/getPermissionCheck
   * @param id 文档ID
   * @param userId 用户ID
   * @returns 权限校验结果
   */
  async checkPermission(
    id: string,
    userId: string,
  ): Promise<PermissionCheckResponse> {
    const url = '/api/users/getPermissionCheck'
    this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)
    this.logger.log(`参数: id=${id}, userId=${userId}`)

    try {
      const response = await this.httpClient.post(url, {
        id,
        userId,
      })

      this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

      // 直接返回 Java 后端的响应
      return {
        code: response.data.code || 200,
        data: response.data.data === true,
        status: response.data.status || response.status,
        msg: response.data.msg || 'success',
      }
    } catch (error) {
      this.logger.error(`调用 Java 权限校验接口失败: ${error.message}`)

      // 如果是 HTTP 错误，尝试获取响应数据
      if (error.response) {
        return {
          code: error.response.data?.code || 200,
          data: false,
          status: error.response.status || 500,
          msg: error.response.data?.msg || '权限校验失败',
        }
      }

      // 网络错误或其他错误
      throw error
    }
  }

  /**
   * 获取文件流
   * 调用 Java 后端: GET /api/users/getfileStream
   * @param id 文档ID
   * @returns 文件流数据
   */
  async getFileStream(id: number): Promise<FileStreamResponse> {
    const url = '/api/users/getfileStream'
    this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)
    this.logger.log(`参数: id=${id}`)

    try {
      const response = await this.httpClient.get(url, {
        params: { id },
        responseType: 'arraybuffer', // 接收二进制数据
        timeout: 60000, // 文件流可能较大，超时设为60秒
      })

      const contentType = response.headers['content-type']
      const data = response.data

      this.logger.log(`Java 接口响应 Content-Type: ${contentType}`)
      this.logger.log(`响应数据大小: ${data?.byteLength || 0} bytes`)

      // 检查是否有有效数据
      if (data && data.byteLength > 0) {
        // 检查是否是 JSON 响应（可能是空数据的 JSON 响应）
        if (contentType && contentType.includes('application/json')) {
          try {
            const jsonStr = Buffer.from(data).toString('utf-8')
            const jsonData = JSON.parse(jsonStr)
            
            // 如果 data 是 null 或空字符串，返回无数据
            if (jsonData.data === null || jsonData.data === '') {
              this.logger.log('Java 接口返回空数据 (JSON)')
              return {
                hasData: false,
                data: null,
              }
            }
          } catch (e) {
            // 不是有效的 JSON，当作二进制数据处理
          }
        }

        // 返回二进制数据
        return {
          hasData: true,
          data: Buffer.from(data),
          contentType: contentType || 'application/octet-stream',
        }
      }

      // 无数据
      return {
        hasData: false,
        data: null,
      }
    } catch (error) {
      this.logger.error(`调用 Java 文件流接口失败: ${error.message}`)

      // 如果是 HTTP 错误，检查响应
      if (error.response) {
        const status = error.response.status
        this.logger.error(`HTTP 错误状态: ${status}`)

        // 404 或其他错误，返回无数据
        if (status === 404) {
          return {
            hasData: false,
            data: null,
          }
        }
      }

      throw error
    }
  }
}
