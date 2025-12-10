import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

/**
 * Mock 数据 - 用于本地测试
 * 切换到 Java 后端时，将相关方法中的 mock 逻辑注释，解开实际请求代码即可
 */
const mockData = [
  {
    id: 1,
    name: 'adw',
    subCategory: '编组模板',
    status: '启用',
    description: '',
    uploadTime: '2025-11-25 12:11:01',
    creator: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 2,
    name: 'adwd',
    subCategory: '编组模板',
    status: '启用',
    description: '',
    uploadTime: '2025-11-25 12:04:14',
    creator: '管理员',
    auditStatus: '审核通过',
  },
  {
    id: 3,
    name: '1234',
    subCategory: '编组模板',
    status: '启用',
    description: '1234',
    uploadTime: '2025-11-19 15:06:17',
    creator: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 4,
    name: '101',
    subCategory: '编组模板',
    status: '启用',
    description: '101',
    uploadTime: '2025-11-19 10:47:21',
    creator: '管理员',
    auditStatus: '审核中',
  },
  {
    id: 5,
    name: '1234',
    subCategory: '文档模板',
    status: '启用',
    description: '1234',
    uploadTime: '2025-11-19 10:51:55',
    creator: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 6,
    name: 'adwdw',
    subCategory: '编组模板',
    status: '启用',
    description: '',
    uploadTime: '2025-11-19 10:36:16',
    creator: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 7,
    name: 'adw',
    subCategory: '编组模板',
    status: '启用',
    description: '',
    uploadTime: '2025-11-19 10:22:05',
    creator: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 8,
    name: 'adwd',
    subCategory: '编组模板',
    status: '启用',
    description: '',
    uploadTime: '2025-11-19 10:21:06',
    creator: '管理员',
    auditStatus: '待提交',
  },
  {
    id: 9,
    name: 'adwd',
    subCategory: '文档模板',
    status: '启用',
    description: '',
    uploadTime: '2025-11-19 10:24:18',
    creator: '管理员',
    auditStatus: '审核通过',
  },
  {
    id: 10,
    name: 'adaw',
    subCategory: '编组模板',
    status: '启用',
    description: '',
    uploadTime: '2025-11-19 10:14:45',
    creator: '管理员',
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

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name)
  private data = [...mockData]
  private httpClient: AxiosInstance
  private javaApiBase: string

  constructor(private configService: ConfigService) {
    // 从环境变量获取 Java API 地址
    this.javaApiBase =
      this.configService.get<string>('JAVA_API_BASE') || 'http://192.168.8.104:8080'

    // 创建 axios 实例用于调用 Java 后端
    this.httpClient = axios.create({
      baseURL: this.javaApiBase,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.logger.log(`Java API Base URL: ${this.javaApiBase}`)
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
   * 当前使用 Mock 数据，切换到 Java 后端时将下方注释的代码解开即可
   * @param data 查询参数
   * @param data.tabType 标签页类型: 'recent' | 'review' | 'publish' | undefined
   */
  async getPageList(data: any) {
    this.logger.log(`获取分页列表, 参数: ${JSON.stringify(data)}`)

    const { pageNo = 1, pageSize = 10, tabType, name, category } = data

    // ========================================================================================
    // 【Mock 数据逻辑】- 联调时注释此段代码 (从这里开始)
    // ========================================================================================
    let filteredData = [...this.data]

    // 根据 tabType 过滤数据
    if (tabType === 'review') {
      // 审核列表：审核中的数据
      filteredData = filteredData.filter((item) => item.auditStatus === '审核中')
    } else if (tabType === 'publish') {
      // 文档发布：审核通过的数据
      filteredData = filteredData.filter((item) => item.auditStatus === '审核通过')
    }
    // recent 或不传 tabType：返回全部数据

    // 按名称过滤
    if (name) {
      filteredData = filteredData.filter((item) =>
        item.name.toLowerCase().includes(name.toLowerCase()),
      )
    }

    // 按分类过滤
    if (category && category !== '0') {
      const categoryName = categories.find((c) => c.id === category)?.name
      if (categoryName) {
        filteredData = filteredData.filter((item) => item.subCategory === categoryName)
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
    // ========================================================================================
    // 【Mock 数据逻辑】- 联调时注释此段代码 (到这里结束)
    // ========================================================================================

    // ========================================================================================
    // 【Java 后端调用】- 联调时解开此段代码 (从这里开始)
    // ========================================================================================
    // const url = '/api/template/getPageList'
    // this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)
    // this.logger.log(`请求参数: ${JSON.stringify(data)}`)
    //
    // try {
    //   const response = await this.httpClient.post(url, data)
    //   this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)
    //
    //   if (response.data && response.data.code === 200) {
    //     return response.data.data
    //   } else {
    //     throw new Error(response.data?.msg || '获取数据失败')
    //   }
    // } catch (error) {
    //   this.logger.error(`调用 Java 接口失败: ${error.message}`)
    //   if (error.response) {
    //     this.logger.error(`HTTP 状态: ${error.response.status}`)
    //     this.logger.error(`响应数据: ${JSON.stringify(error.response.data)}`)
    //     throw new Error(error.response.data?.msg || '获取数据失败')
    //   }
    //   throw error
    // }
    // ========================================================================================
    // 【Java 后端调用】- 联调时解开此段代码 (到这里结束)
    // ========================================================================================
  }

  /**
   * 创建模板
   */
  create(data: any) {
    this.logger.log(`创建模板: ${JSON.stringify(data)}`)

    const newItem = {
      id: this.data.length + 1,
      name: data.name,
      subCategory: data.subCategory,
      status: data.status || '启用',
      description: data.description || '',
      uploadTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      creator: '管理员',
      auditStatus: '待提交',
    }

    this.data.unshift(newItem)
    return newItem
  }

  /**
   * 更新模板
   */
  update(data: any) {
    this.logger.log(`更新模板: ${JSON.stringify(data)}`)

    const index = this.data.findIndex((item) => item.id === data.id)
    if (index !== -1) {
      this.data[index] = {
        ...this.data[index],
        name: data.name,
        subCategory: data.subCategory,
        status: data.status,
        description: data.description,
      }
      return this.data[index]
    }
    return null
  }

  /**
   * 删除模板（支持批量）
   */
  delete(ids: number[]) {
    this.logger.log(`删除模板: ${JSON.stringify(ids)}`)

    const deletedIds: number[] = []
    const notFoundIds: number[] = []

    ids.forEach((id) => {
      const index = this.data.findIndex((item) => item.id === id)
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
   * 导入模板
   */
  async importTemplate(file: any) {
    this.logger.log(`导入模板: ${file?.originalname || 'unknown'}`)

    // Mock: 创建一个新模板
    const newItem = {
      id: this.data.length + 1,
      name: file?.originalname?.replace(/\.[^/.]+$/, '') || '导入的模板',
      subCategory: '编组模板',
      status: '启用',
      description: '通过文件导入',
      uploadTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      creator: '管理员',
      auditStatus: '待提交',
    }

    this.data.unshift(newItem)
    return { success: true, message: '导入成功', data: newItem }

    // ========================================================================================
    // 【Java 后端调用】- 联调时解开此段代码
    // ========================================================================================
    // const url = '/api/template/import'
    // const formData = new FormData()
    // formData.append('file', file)
    //
    // try {
    //   const response = await this.httpClient.post(url, formData, {
    //     headers: { 'Content-Type': 'multipart/form-data' },
    //   })
    //   return response.data
    // } catch (error) {
    //   this.logger.error(`导入模板失败: ${error.message}`)
    //   throw error
    // }
  }
}

