import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import FormData from 'form-data'

/**
 * 保存文件响应接口
 */
export interface SaveFileResponse {
  code: number
  data: any
  status: number
  msg?: string
}

/**
 * Mock 数据 - 用于本地测试
 * 字段说明：
 * - id: ID
 * - fileId: 文件ID
 * - templateName: 模板名称
 * - temSubclass: 模板子类
 * - temStatus: 状态（启用/禁用）
 * - description: 描述
 * - createTime: 创建时间
 * - createBy: 创建人
 * - auditStatus: 审核状态
 */
const mockData = [
  {
    id: 1,
    fileId: 'file_001',
    templateName: 'adw',
    temSubclass: '编组模板',
    temStatus: '启用',
    description: '',
    createTime: '2025-11-25 12:11:01',
    createBy: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 2,
    fileId: 'file_002',
    templateName: 'adwd',
    temSubclass: '编组模板',
    temStatus: '启用',
    description: '',
    createTime: '2025-11-25 12:04:14',
    createBy: '管理员',
    auditStatus: '审核通过',
  },
  {
    id: 3,
    fileId: 'file_003',
    templateName: '1234',
    temSubclass: '编组模板',
    temStatus: '启用',
    description: '1234',
    createTime: '2025-11-19 15:06:17',
    createBy: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 4,
    fileId: 'file_004',
    templateName: '101',
    temSubclass: '编组模板',
    temStatus: '启用',
    description: '101',
    createTime: '2025-11-19 10:47:21',
    createBy: '管理员',
    auditStatus: '审核中',
  },
  {
    id: 5,
    fileId: 'file_005',
    templateName: '1234',
    temSubclass: '文档模板',
    temStatus: '启用',
    description: '1234',
    createTime: '2025-11-19 10:51:55',
    createBy: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 6,
    fileId: 'file_006',
    templateName: 'adwdw',
    temSubclass: '编组模板',
    temStatus: '启用',
    description: '',
    createTime: '2025-11-19 10:36:16',
    createBy: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 7,
    fileId: 'file_007',
    templateName: 'adw',
    temSubclass: '编组模板',
    temStatus: '启用',
    description: '',
    createTime: '2025-11-19 10:22:05',
    createBy: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 8,
    fileId: 'file_008',
    templateName: 'adwd',
    temSubclass: '编组模板',
    temStatus: '启用',
    description: '',
    createTime: '2025-11-19 10:21:06',
    createBy: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 9,
    fileId: 'file_009',
    templateName: 'adwd',
    temSubclass: '文档模板',
    temStatus: '启用',
    description: '',
    createTime: '2025-11-19 10:24:18',
    createBy: '管理员',
    auditStatus: '审核通过',
  },
  {
    id: 10,
    fileId: 'file_010',
    templateName: 'adaw',
    temSubclass: '编组模板',
    temStatus: '启用',
    description: '',
    createTime: '2025-11-19 10:14:45',
    createBy: '管理员',
    auditStatus: '待提交',
  },
]

/**
 * 模板分类数据
 */
const categories = [
  { id: '0', name: '全部' },
  { id: '1', name: '编组模板' },
  { id: '2', name: '文档模板' },
  { id: '3', name: '企图立案' },
  { id: '4', name: '作战计划' },
  { id: '5', name: '演训方案' },
  { id: '6', name: '作战文书' },
  { id: '7', name: '导调计划' },
  { id: '8', name: '作战想定' },
  { id: '9', name: '战绩战报' },
  { id: '10', name: '总结报告' },
  { id: '11', name: '评估结果' },
]

/**
 * 是否使用 Java 后端（设为 true 启用 Java 后端调用，false 使用 Mock 数据）
 */
const USE_JAVA_BACKEND = true

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name)
  private data = [...mockData]
  private httpClient: AxiosInstance
  private javaApiBase: string

  constructor(private configService: ConfigService) {
    // 从环境变量获取 Java API 地址
    this.javaApiBase =
      this.configService.get<string>('JAVA_API_URL') || 'http://192.168.8.104:8080'

    // 创建 axios 实例用于调用 Java 后端
    this.httpClient = axios.create({
      baseURL: this.javaApiBase,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.logger.log(`Java API 地址: ${this.javaApiBase}`)
    this.logger.log(`使用 Java 后端: ${USE_JAVA_BACKEND}`)
  }

  /**
   * 获取模板分类列表
   */
  getCategories() {
    this.logger.log('获取模板分类列表')
    return categories
  }

  /**
   * 获取分页列表数据
   * @param data 查询参数
   * @param data.tabType 标签页类型: 'recent' | 'review' | 'publish' | undefined
   * @param data.templateName 模板名称
   * @param data.temSubclass 模板子类
   * @param data.createTime 时间范围，格式："2025-12-10, 2025-12-11"
   */
  async getPageList(data: any) {
    this.logger.log(`获取分页列表, 参数: ${JSON.stringify(data)}`)

    const {
      pageNo = 1,
      pageSize = 10,
      tabType = 'recent',
      templateName,
      temSubclass,
      createTime,
    } = data

    // ========================================================================================
    // 【Java 后端调用】
    // ========================================================================================
    if (USE_JAVA_BACKEND) {
      const url = '/api/tbTemplate/getPageList'
      this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)

      const requestData = {
        pageNo,
        pageSize,
        tabType,
        templateName,
        temSubclass,
        createTime,
      }
      this.logger.log(`请求参数: ${JSON.stringify(requestData)}`)

      try {
        const response = await this.httpClient.post(url, requestData)
        this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

        // 根据 Java 后端返回格式进行适配
        if (response.data) {
          // 如果返回 code 字段，则按照标准格式处理
          if (response.data.code !== undefined) {
            if (response.data.code === 200 || response.data.code === 0) {
              const result = response.data.data || response.data
              return {
                list: result.list || result.records || [],
                total: result.total || 0,
              }
            } else {
              throw new Error(response.data.msg || response.data.message || '获取数据失败')
            }
          }
          // 直接返回数据格式
          return {
            list: response.data.list || response.data.records || [],
            total: response.data.total || 0,
          }
        }
        throw new Error('获取数据失败')
      } catch (error) {
        this.logger.error(`调用 Java 接口失败: ${error.message}`)
        if (error.response) {
          this.logger.error(`HTTP 状态: ${error.response.status}`)
          this.logger.error(`响应数据: ${JSON.stringify(error.response.data)}`)
          throw new Error(error.response.data?.msg || error.response.data?.message || '获取数据失败')
        }
        throw error
      }
    }

    // ========================================================================================
    // 【Mock 数据逻辑】- USE_JAVA_BACKEND 为 false 时使用
    // ========================================================================================
    let filteredData = [...this.data]

    // 根据 tabType 过滤数据
    if (tabType === 'review') {
      filteredData = filteredData.filter((item) => item.auditStatus === '审核中')
    } else if (tabType === 'publish') {
      filteredData = filteredData.filter((item) => item.auditStatus === '审核通过')
    }

    // 按模板名称过滤
    if (templateName) {
      filteredData = filteredData.filter((item) =>
        item.templateName.toLowerCase().includes(templateName.toLowerCase()),
      )
    }

    // 按模板子类过滤
    if (temSubclass && temSubclass !== '0') {
      const categoryName = categories.find((c) => c.id === temSubclass)?.name
      if (categoryName) {
        filteredData = filteredData.filter((item) => item.temSubclass === categoryName)
      }
    }

    // 按时间范围过滤（格式："2025-12-10, 2025-12-11"）
    if (createTime) {
      const [startDate, endDate] = createTime.split(', ').map((d: string) => d.trim())
      if (startDate && endDate) {
        filteredData = filteredData.filter((item) => {
          const itemDate = item.createTime.split(' ')[0]
          return itemDate >= startDate && itemDate <= endDate
        })
      }
    }

    // 分页处理
    const total = filteredData.length
    const page = parseInt(pageNo)
    const size = parseInt(pageSize)
    const start = (page - 1) * size
    const end = start + size
    const list = filteredData.slice(start, end)

    this.logger.log(`返回 Mock 数据: 总数=${total}, 当前页=${list.length}条`)
    return { list, total }
  }

  /**
   * 创建模板
   * 调用 Java 后端: POST /api/tbTemplate/savaTemplate
   * @param data.templateName 模板名称
   * @param data.temSubclass 模板子类
   * @param data.temStatus 模板状态 (启用/禁用)
   * @param data.description 描述
   * @param data.fileId 文件ID（上传文档时传递）
   */
  async savaTemplate(data: any) {
    this.logger.log(`创建模板: ${JSON.stringify(data)}`)

    // ========================================================================================
    // 【Java 后端调用】
    // ========================================================================================
    if (USE_JAVA_BACKEND) {
      const url = '/api/tbTemplate/savaTemplate'
      this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)

      // 参数直接使用新字段名
      const requestData: any = {
        templateName: data.templateName,
        temSubclass: data.temSubclass,
        temStatus: data.temStatus === '启用' ? '0' : '1',
        description: data.description || '',
      }

      // 如果有 fileId，则添加到请求参数中（上传文档模式）
      if (data.fileId) {
        requestData.fileId = data.fileId
      }

      this.logger.log(`请求参数: ${JSON.stringify(requestData)}`)

      try {
        const response = await this.httpClient.post(url, requestData)
        this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

        if (response.data) {
          if (response.data.code !== undefined) {
            if (response.data.code === 200 || response.data.code === 0) {
              return response.data.data || { success: true }
            } else {
              throw new Error(response.data.msg || response.data.message || '创建失败')
            }
          }
          return response.data
        }
        return { success: true }
      } catch (error) {
        this.logger.error(`调用 Java 接口失败: ${error.message}`)
        if (error.response) {
          this.logger.error(`HTTP 状态: ${error.response.status}`)
          this.logger.error(`响应数据: ${JSON.stringify(error.response.data)}`)
          throw new Error(error.response.data?.msg || error.response.data?.message || '创建失败')
        }
        throw error
      }
    }

    // ========================================================================================
    // 【Mock 数据逻辑】
    // ========================================================================================
    const newItem = {
      id: this.data.length + 1,
      fileId: data.fileId || `file_${String(this.data.length + 1).padStart(3, '0')}`,
      templateName: data.templateName,
      temSubclass: data.temSubclass,
      temStatus: data.temStatus || '启用',
      description: data.description || '',
      createTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      createBy: '管理员',
      auditStatus: '待提交',
    }

    this.data.unshift(newItem)
    return newItem
  }

  /**
   * 更新模板（编辑数据）
   * 调用 Java 后端: POST /api/tbTemplate/editData
   * @param data.id 模板ID
   * @param data.templateName 模板名称
   * @param data.temSubclass 模板子类
   * @param data.temStatus 模板状态 (启用/禁用)
   * @param data.description 描述
   */
  async update(data: any) {
    this.logger.log(`更新模板: ${JSON.stringify(data)}`)

    // ========================================================================================
    // 【Java 后端调用】
    // ========================================================================================
    if (USE_JAVA_BACKEND) {
      const url = '/api/tbTemplate/editData'
      this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)

      // 参数直接使用新字段名
      const requestData = {
        id: data.id,
        templateName: data.templateName,
        temSubclass: data.temSubclass,
        temStatus: data.temStatus === '启用' ? '0' : '1',
        description: data.description || '',
      }
      this.logger.log(`请求参数: ${JSON.stringify(requestData)}`)

      try {
        const response = await this.httpClient.post(url, requestData)
        this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

        if (response.data) {
          if (response.data.code !== undefined) {
            if (response.data.code === 200 || response.data.code === 0) {
              return response.data.data || { success: true }
            } else {
              throw new Error(response.data.msg || response.data.message || '更新失败')
            }
          }
          return response.data
        }
        return { success: true }
      } catch (error) {
        this.logger.error(`调用 Java 接口失败: ${error.message}`)
        if (error.response) {
          this.logger.error(`HTTP 状态: ${error.response.status}`)
          this.logger.error(`响应数据: ${JSON.stringify(error.response.data)}`)
          throw new Error(error.response.data?.msg || error.response.data?.message || '更新失败')
        }
        throw error
      }
    }

    // ========================================================================================
    // 【Mock 数据逻辑】
    // ========================================================================================
    const index = this.data.findIndex((item) => item.id === data.id)
    if (index !== -1) {
      this.data[index] = {
        ...this.data[index],
        templateName: data.templateName,
        temSubclass: data.temSubclass,
        temStatus: data.temStatus,
        description: data.description,
      }
      return this.data[index]
    }
    return null
  }

  /**
   * 删除模板（支持批量）
   * 调用 Java 后端: POST /api/tbTemplate/delList
   * @param ids ID数组，如 ["1", "2", "3"]
   */
  async delete(ids: (number | string)[]) {
    this.logger.log(`删除模板: ${JSON.stringify(ids)}`)

    // ========================================================================================
    // 【Java 后端调用】
    // ========================================================================================
    if (USE_JAVA_BACKEND) {
      const url = '/api/tbTemplate/delList'
      this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)

      // 转换为字符串数组，适配 Java 后端
      const requestData = ids.map((id) => String(id))
      this.logger.log(`请求参数: ${JSON.stringify(requestData)}`)

      try {
        const response = await this.httpClient.post(url, requestData)
        this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

        if (response.data) {
          if (response.data.code !== undefined) {
            if (response.data.code === 200 || response.data.code === 0) {
              return {
                deletedIds: ids,
                notFoundIds: [],
                success: true,
              }
            } else {
              throw new Error(response.data.msg || response.data.message || '删除失败')
            }
          }
          return {
            deletedIds: ids,
            notFoundIds: [],
            success: true,
          }
        }
        return {
          deletedIds: ids,
          notFoundIds: [],
          success: true,
        }
      } catch (error) {
        this.logger.error(`调用 Java 接口失败: ${error.message}`)
        if (error.response) {
          this.logger.error(`HTTP 状态: ${error.response.status}`)
          this.logger.error(`响应数据: ${JSON.stringify(error.response.data)}`)
          throw new Error(error.response.data?.msg || error.response.data?.message || '删除失败')
        }
        throw error
      }
    }

    // ========================================================================================
    // 【Mock 数据逻辑】
    // ========================================================================================
    const deletedIds: (number | string)[] = []
    const notFoundIds: (number | string)[] = []

    ids.forEach((id) => {
      const numId = typeof id === 'string' ? parseInt(id) : id
      const index = this.data.findIndex((item) => item.id === numId)
      if (index !== -1) {
        this.data.splice(index, 1)
        deletedIds.push(id)
      } else {
        notFoundIds.push(id)
      }
    })

    return { deletedIds, notFoundIds }
  }

  /**
   * 提交审核
   */
  async submitAudit(data: any) {
    this.logger.log(`提交审核: ${JSON.stringify(data)}`)

    const { id } = data

    // Mock 数据更新
    const index = this.data.findIndex((item) => item.id === id)
    if (index !== -1) {
      this.data[index].auditStatus = '审核中'
      return { success: true, message: '提交审核成功' }
    }

    return { success: false, message: '模板不存在' }

    // ========================================================================================
    // 【Java 后端调用】- 联调时解开此段代码
    // ========================================================================================
    // const url = '/api/template/submitAudit'
    // try {
    //   const response = await this.httpClient.post(url, data)
    //   return response.data
    // } catch (error) {
    //   this.logger.error(`提交审核失败: ${error.message}`)
    //   throw error
    // }
  }

  /**
   * 写作权限校验
   * 调用 Java 后端: POST /api/tbTemplate/getPermissionCheck
   * @param data.id 模板ID（表格中真实数据的id）
   * @param data.userId 用户ID（nanoid生成的）
   */
  async getPermissionCheck(data: { id: string; userId: string }) {
    this.logger.log(`权限校验: ${JSON.stringify(data)}`)

    // ========================================================================================
    // 【Java 后端调用】
    // ========================================================================================
    if (USE_JAVA_BACKEND) {
      const url = '/api/tbTemplate/getPermissionCheck'
      this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)

      const requestData = {
        id: data.id,
        userId: data.userId,
      }
      this.logger.log(`请求参数: ${JSON.stringify(requestData)}`)

      try {
        const response = await this.httpClient.post(url, requestData)
        this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

        // 返回原始响应，让前端处理
        return response.data
      } catch (error) {
        this.logger.error(`调用 Java 接口失败: ${error.message}`)
        if (error.response) {
          this.logger.error(`HTTP 状态: ${error.response.status}`)
          this.logger.error(`响应数据: ${JSON.stringify(error.response.data)}`)
          // 返回错误响应
          return {
            code: error.response.status,
            data: false,
            status: 500,
            msg: error.response.data?.msg || error.response.data?.message || '权限校验失败',
          }
        }
        throw error
      }
    }

    // ========================================================================================
    // 【Mock 数据逻辑】
    // ========================================================================================
    // Mock: 默认允许访问
    return {
      code: 200,
      data: true,
      status: 200,
      msg: '有权限',
    }
  }

  /**
   * 获取模板文件流
   * 调用 Java 后端: GET /api/tbTemplate/getfileStream
   * @param id 模板ID
   */
  async getFileStream(id: string) {
    this.logger.log(`获取文件流: id=${id}`)

    // ========================================================================================
    // 【Java 后端调用】
    // ========================================================================================
    if (USE_JAVA_BACKEND) {
      const url = '/api/tbTemplate/getfileStream'
      this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}?id=${id}`)

      try {
        const response = await this.httpClient.get(url, {
          params: { id },
          responseType: 'arraybuffer', // 获取二进制数据
          timeout: 60000, // 文件流超时设为 60 秒
        })

        this.logger.log(`Java 接口响应: 状态=${response.status}, 数据长度=${response.data?.length || 0}`)

        // 获取 Content-Type
        const contentType = response.headers['content-type'] || 'text/markdown'
        const contentDisposition = response.headers['content-disposition'] || ''

        // 从 Content-Disposition 提取文件名
        let filename = 'template.md'
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '')
          // 解码 URL 编码的文件名
          try {
            filename = decodeURIComponent(filename)
          } catch (e) {
            // 解码失败则使用原始文件名
          }
        }

        return {
          data: Buffer.from(response.data),
          contentType,
          filename,
          success: true,
        }
      } catch (error) {
        this.logger.error(`调用 Java 接口失败: ${error.message}`)
        if (error.response) {
          this.logger.error(`HTTP 状态: ${error.response.status}`)
          // 404 通常表示文件不存在，返回更友好的错误信息
          if (error.response.status === 404) {
            return {
              data: null,
              message: '该模板没有关联的文件或文件不存在',
              success: false,
            }
          }
          return {
            data: null,
            message: error.response.data?.msg || error.response.data?.message || '获取文件流失败',
            success: false,
          }
        }
        throw error
      }
    }

    // ========================================================================================
    // 【Mock 数据逻辑】
    // ========================================================================================
    // Mock: 返回示例 Markdown 内容
    const mockContent = `# 模板标题

## 一、背景介绍

这是一个演示模板文档。

## 二、内容要点

- 要点一
- 要点二
- 要点三

## 三、总结

以上是模板的主要内容。
`

    return {
      data: Buffer.from(mockContent, 'utf-8'),
      contentType: 'text/markdown; charset=utf-8',
      filename: 'template.md',
      success: true,
    }
  }

  /**
   * 保存模板文件
   * 调用 Java 后端: POST /api/tbTemplate/saveFile
   * @param id 模板ID
   * @param file 文件对象
   * @returns 保存结果
   */
  async saveFile(
    id: string | undefined,
    file: Express.Multer.File,
  ): Promise<SaveFileResponse> {
    const url = '/api/tbTemplate/saveFile'
    this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)

    // 解码文件名（处理中文乱码问题）
    // multer 接收到的 originalname 可能是 Latin-1 编码的，需要转换为 UTF-8
    let decodedFilename = file.originalname
    try {
      // 尝试将 Latin-1 编码的字符串转换为 UTF-8
      decodedFilename = Buffer.from(file.originalname, 'latin1').toString('utf-8')
    } catch (e) {
      // 如果转换失败，保持原始文件名
      this.logger.warn(`文件名解码失败，使用原始文件名: ${file.originalname}`)
    }

    this.logger.log(`参数: id=${id || '未提供'}, 文件名=${decodedFilename}, 大小=${file.size} bytes`)

    // ========================================================================================
    // 【Java 后端调用】
    // ========================================================================================
    if (USE_JAVA_BACKEND) {
      try {
        // 创建 FormData
        const formData = new FormData()
        // 只有在提供 id 时才添加 id 参数
        if (id) {
          formData.append('id', id)
        }
        // 使用解码后的文件名
        formData.append('file', file.buffer, {
          filename: decodedFilename,
          contentType: file.mimetype,
        })

        const response = await this.httpClient.post(url, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 60000, // 文件上传可能较大，超时设为60秒
        })

        this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

        // 直接返回 Java 后端的响应
        return response.data
      } catch (error) {
        this.logger.error(`调用 Java 保存文件接口失败: ${error.message}`)

        if (error.response) {
          this.logger.error(`HTTP 错误: ${JSON.stringify(error.response.data)}`)
          throw new Error(error.response.data?.msg || '保存文件失败')
        }

        throw error
      }
    }

    // ========================================================================================
    // 【Mock 数据逻辑】
    // ========================================================================================
    this.logger.log(`Mock 模式: 保存文件成功`)
    return {
      code: 200,
      data: { fileId: `mock_file_${Date.now()}` },
      status: 200,
      msg: '保存成功',
    }
  }
}
