import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

/**
 * Mock 数据 - 用于本地测试
 * 切换到 Java 后端时，将 getPageList 中的 mock 逻辑注释，解开实际请求代码即可
 */
const mockData = [
  {
    id: 1,
    name: '2024年度联合演习筹划方案',
    college: '学院A',
    docCategory: '演训方案',
    drillLevel: '战略级',
    drillType: 'A',
    drillTheme: '联合作战',
    author: '张三',
    scope: '可编辑',
    status: '编辑中',
    createTime: '2024-01-10 10:00:00',
  },
  {
    id: 2,
    name: '跨区机动演练作战计划',
    college: '学院B',
    docCategory: '作战计划',
    drillLevel: '战术级',
    drillType: 'B',
    drillTheme: '机动演练',
    author: '李四',
    scope: '可编辑',
    status: '待审核',
    createTime: '2024-01-15 14:30:00',
  },
  {
    id: 3,
    name: '山地攻防导调计划',
    college: '学院A',
    docCategory: '导调计划',
    drillLevel: '战术级',
    drillType: 'A',
    drillTheme: '山地作战',
    author: '王五',
    scope: '可编辑',
    status: '审核通过',
    createTime: '2024-01-15 14:30:00',
  },
  {
    id: 4,
    name: '网络安全演习总结报告',
    college: '学院C',
    docCategory: '总结报告',
    drillLevel: '战略级',
    drillType: 'C',
    drillTheme: '网络安全',
    author: '赵六',
    scope: '可编辑',
    status: '发布成功',
    createTime: '2024-01-25 16:45:00',
  },
  {
    id: 5,
    name: '城市作战筹划方案',
    college: '学院B',
    docCategory: '演训方案',
    drillLevel: '战术级',
    drillType: 'B',
    drillTheme: '城市作战',
    author: '陈七',
    scope: '可编辑',
    status: '编辑中',
    createTime: '2024-02-01 11:20:00',
  },
  {
    id: 6,
    name: '联合指挥作战文书',
    college: '学院A',
    docCategory: '作战文书',
    drillLevel: '战略级',
    drillType: 'A',
    drillTheme: '联合指挥',
    author: '周八',
    scope: '可编辑',
    status: '审核通过',
    createTime: '2024-02-05 13:50:00',
  },
  {
    id: 7,
    name: '实兵对抗演练方案',
    college: '学院C',
    docCategory: '演训方案',
    drillLevel: '战术级',
    drillType: 'C',
    drillTheme: '实兵对抗',
    author: '吴九',
    scope: '可编辑',
    status: '待审核',
    createTime: '2024-02-10 15:30:00',
  },
  {
    id: 8,
    name: '后勤保障计划',
    college: '学院B',
    docCategory: '作战计划',
    drillLevel: '战术级',
    drillType: 'B',
    drillTheme: '后勤保障',
    author: '郑十',
    scope: '可编辑',
    status: '发布成功',
    createTime: '2024-02-15 08:40:00',
  },
  {
    id: 9,
    name: '海上对抗演练方案',
    college: '学院B',
    docCategory: '演训方案',
    drillLevel: '战术级',
    drillType: 'B',
    drillTheme: '海上对抗',
    author: '张三',
    scope: '可编辑',
    status: '驳回',
    createTime: '2024-04-05 09:30:00',
  },
]

/**
 * 文档分类数据
 */
const categories = [
  { id: '0', fileType: '全部' },
  { id: '1', fileType: '企图立案' },
  { id: '2', fileType: '作战计划' },
  { id: '3', fileType: '演训方案' },
  { id: '4', fileType: '作战文书' },
  { id: '5', fileType: '导调计划' },
  { id: '6', fileType: '作战想定' },
  { id: '7', fileType: '战绩战报' },
  { id: '8', fileType: '总结报告' },
  { id: '9', fileType: '通知' },
  { id: '10', fileType: '通告' },
  { id: '11', fileType: '评估结果' },
]

// 驳回历史 Mock 数据
const mockRejectHistory = {
  16: [
    {
      rejectBy: '张三',
      rejectTime: '2024-04-06 12:00:00',
      reason: '格式不对，重新写',
    },
    {
      rejectBy: '张三',
      rejectTime: '2024-04-07 10:30:00',
      reason: '内容不完整',
    },
  ],
  17: [
    {
      rejectBy: '李四',
      rejectTime: '2024-04-09 14:00:00',
      reason: '数据有误',
    },
  ],
  18: [
    {
      rejectBy: '王五',
      rejectTime: '2024-04-11 09:00:00',
      reason: '审核不通过',
    },
  ],
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name)
  private data: any[] = [] // Mock 数据已注释，使用空数组
  private rejectHistory = { ...mockRejectHistory }
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
   * 获取分页数据
   */
  getPage(query: any) {
    const {
      pageNo = 1,
      pageSize = 10,
      name,
      status,
      statusList,
      docCategory,
      fileType,
      drillLevel,
      drillType,
      drillTheme,
      docType,
      uploadTime,
    } = query

    this.logger.log(`收到查询请求: ${JSON.stringify(query)}`)

    // 过滤数据
    let filteredData = [...this.data]

    // 1. 方案名称（模糊搜索）
    if (name) {
      filteredData = filteredData.filter((item) =>
        item.name.toLowerCase().includes(name.toLowerCase()),
      )
    }

    // 2. 状态过滤 - 支持多状态查询（优先）
    if (statusList && Array.isArray(statusList) && statusList.length > 0) {
      this.logger.log(`多状态过滤: ${JSON.stringify(statusList)}`)
      filteredData = filteredData.filter((item) => statusList.includes(item.status))
    } else if (status) {
      // 单状态查询
      filteredData = filteredData.filter((item) => item.status === status)
    }

    // 3. 文档分类（顶部下拉框）
    if (docCategory) {
      filteredData = filteredData.filter((item) => item.docCategory === docCategory)
    }

    // 4. 左侧文档分类选择 (fileType 为数字字符串 1-11)
    if (fileType && fileType !== '0') {
      // 根据 id 找到对应的分类名称
      const categoryIdMap: Record<string, string> = {
        '1': '企图立案',
        '2': '作战计划',
        '3': '演训方案',
        '4': '作战文书',
        '5': '导调计划',
        '6': '作战想定',
        '7': '战绩战报',
        '8': '总结报告',
        '9': '通知',
        '10': '通告',
        '11': '评估结果',
      }
      const categoryName = categoryIdMap[fileType]
      if (categoryName) {
        filteredData = filteredData.filter((item) => item.docCategory === categoryName)
      }
    }

    // 5. 演训等级
    if (drillLevel) {
      const levelMap = {
        strategy: '战略级',
        tactics: '战术级',
      }
      const levelText = levelMap[drillLevel] || drillLevel
      filteredData = filteredData.filter((item) => item.drillLevel === levelText)
    }

    // 6. 演训主题（模糊搜索）
    if (drillTheme) {
      filteredData = filteredData.filter((item) =>
        (item.drillTheme || '').toLowerCase().includes(drillTheme.toLowerCase()),
      )
    }

    // 7. 演训类型
    if (drillType) {
      filteredData = filteredData.filter((item) => item.drillType === drillType)
    }

    // 8. 文档类型
    if (docType) {
      this.logger.log(`文档类型过滤: ${docType}`)
    }

    // 9. 上传时间范围
    if (uploadTime && Array.isArray(uploadTime) && uploadTime.length === 2) {
      const startTime = new Date(uploadTime[0] + ' 00:00:00')
      const endTime = new Date(uploadTime[1] + ' 23:59:59')
      filteredData = filteredData.filter((item) => {
        const itemTime = new Date(item.createTime)
        return itemTime >= startTime && itemTime <= endTime
      })
    }

    // 计算总数
    const total = filteredData.length

    // 分页
    const page = parseInt(pageNo)
    const size = parseInt(pageSize)
    const start = (page - 1) * size
    const end = start + size
    const list = filteredData.slice(start, end)

    this.logger.log(`返回数据: 总数=${total}, 当前页=${list.length}条`)

    return {
      list,
      total,
    }
  }

  /**
   * 获取文档分类列表
   */
  getCategories() {
    this.logger.log('获取文档分类列表')
    return categories
  }

  /**
   * 获取分页列表数据
   *
   * 【联调切换说明】
   * 当前使用: Mock 数据 (mockData)
   * 联调时: 注释 Mock 数据逻辑，解开 Java 后端调用代码
   *
   * @param data 查询参数
   * @param data.pageNo 页码
   * @param data.pageSize 每页条数
   * @param data.tabType 标签页类型: 'review'(审核列表) | 'publish'(文档发布) | undefined(最近文档-全部)
   * @returns { list: Array, total: number }
   */
  async getPageList(data: any) {
    this.logger.log(`获取分页列表, 参数: ${JSON.stringify(data)}`)

    // ========================================================================================
    // 【Mock 数据逻辑】- 联调时注释此段代码 (从这里开始)
    // ========================================================================================
    const { pageNo = 1, pageSize = 10, tabType } = data

    // 使用 mockData 数据源
    let filteredData = [...mockData]

    // 根据 tabType 过滤数据
    if (tabType === 'review') {
      // 审核列表：待审核、审核通过、驳回
      filteredData = filteredData.filter((item) =>
        ['待审核', '审核通过', '驳回'].includes(item.status),
      )
    } else if (tabType === 'publish') {
      // 文档发布：发布成功
      filteredData = filteredData.filter((item) => item.status === '发布成功')
    }
    // recent 或不传 tabType：返回全部数据

    // 本地分页处理
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
    // const url = '/api/users/getPageList'
    // this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)
    // this.logger.log(`请求参数: ${JSON.stringify(data)}`)
    //
    // try {
    //   // POST 请求 Java 后端
    //   const response = await this.httpClient.post(url, data)
    //   this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)
    //
    //   // Java 后端返回格式: { code: 200, data: { list: [], total: 0 }, msg: '...' }
    //   // 需要返回 data 部分: { list, total }
    //   if (response.data && response.data.code === 200) {
    //     return response.data.data // 返回 { list, total }
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
   * 创建演训方案 (Mock)
   */
  create(data: any) {
    this.logger.log(`创建演训方案: ${JSON.stringify(data)}`)

    const newItem = {
      id: this.data.length + 1,
      name: data.name,
      college: data.college || '学院A',
      docCategory: data.docCategory,
      drillLevel: data.drillLevel || '战略级',
      drillType: data.drillType || 'A',
      drillTheme: data.drillTheme || '',
      author: data.author || 'admin',
      scope: data.scope || '可编辑',
      status: data.status || '编辑中',
      description: data.description || '',
      editMode: data.editMode || 'standard',
      createTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
    }

    this.data.unshift(newItem)
    return newItem
  }

  /**
   * 新建筹划方案 - 调用 Java 后端
   * POST /api/users/newData
   */
  async createNewData(data: any) {
    const url = '/api/users/newData'
    this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)
    this.logger.log(`参数: ${JSON.stringify(data)}`)

    try {
      const response = await this.httpClient.post(url, data)

      this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

      // 返回 Java 后端的响应
      return response.data
    } catch (error) {
      this.logger.error(`调用 Java 新建接口失败: ${error.message}`)

      // 如果是 HTTP 错误，尝试获取响应数据
      if (error.response) {
        this.logger.error(`HTTP 错误状态: ${error.response.status}`)
        this.logger.error(`HTTP 错误数据: ${JSON.stringify(error.response.data)}`)
        throw new Error(error.response.data?.msg || '创建失败')
      }

      // 网络错误或其他错误
      throw error
    }
  }

  /**
   * 更新演训方案
   */
  update(data: any) {
    this.logger.log(`更新演训方案: ${JSON.stringify(data)}`)

    const index = this.data.findIndex((item) => item.id === data.id)
    if (index !== -1) {
      this.data[index] = { ...this.data[index], ...data }
      return this.data[index]
    }
    return null
  }

  /**
   * 删除演训方案（支持单个和批量删除）
   */
  delete(ids: number[]) {
    this.logger.log(`删除演训方案: ${JSON.stringify(ids)}`)

    const deletedIds = []
    const notFoundIds = []

    ids.forEach((id) => {
      const index = this.data.findIndex((item) => item.id === parseInt(id as any))
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
   * 导出演训方案
   */
  export() {
    this.logger.log('导出演训方案')
    return this.data
  }

  /**
   * 提交审核 - 调用 Java 后端
   * POST /api/users/submitReview
   */
  async submitAudit(data: any) {
    const url = '/api/users/submitReview'
    this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)
    this.logger.log(`参数: ${JSON.stringify(data)}`)

    try {
      const response = await this.httpClient.post(url, data)

      this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

      // 如果 Java 返回成功，同步更新本地 Mock 数据状态
      if (response.data.code === 200 || response.data.code === 0) {
        const index = this.data.findIndex((item) => item.id === data.id)
        if (index !== -1) {
          this.data[index].status = '待审核'
          this.logger.log(`方案 ${data.id} 本地状态已同步更新为: 待审核`)
        }
      }

      // 直接返回 Java 后端的响应
      return response.data
    } catch (error) {
      this.logger.error(`调用 Java 提交审核接口失败: ${error.message}`)

      // 如果是 HTTP 错误，尝试获取响应数据
      if (error.response) {
        this.logger.error(`HTTP 错误状态: ${error.response.status}`)
        this.logger.error(`HTTP 错误数据: ${JSON.stringify(error.response.data)}`)
        throw new Error(error.response.data?.msg || '提交审核失败')
      }

      // 网络错误或其他错误
      throw error
    }
  }

  /**
   * 发布文档 - 调用 Java 后端
   * POST /api/users/publishData
   */
  async publishDocument(data: any) {
    const url = '/api/users/publishData'
    this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)
    this.logger.log(`参数: ${JSON.stringify(data)}`)

    try {
      const response = await this.httpClient.post(url, data)

      this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

      // 如果 Java 返回成功，同步更新本地 Mock 数据状态
      if (response.data.code === 200 || response.data.code === 0) {
        const index = this.data.findIndex((item) => item.id === data.id)
        if (index !== -1) {
          this.data[index].status = '发布成功'
          this.logger.log(`方案 ${data.id} 本地状态已同步更新为: 发布成功`)
        }
      }

      // 直接返回 Java 后端的响应
      return response.data
    } catch (error) {
      this.logger.error(`调用 Java 发布文档接口失败: ${error.message}`)

      // 如果是 HTTP 错误，尝试获取响应数据
      if (error.response) {
        this.logger.error(`HTTP 错误状态: ${error.response.status}`)
        this.logger.error(`HTTP 错误数据: ${JSON.stringify(error.response.data)}`)
        throw new Error(error.response.data?.msg || '发布文档失败')
      }

      // 网络错误或其他错误
      throw error
    }
  }

  /**
   * 获取驳回历史
   */
  getRejectHistory(id: number) {
    this.logger.log(`获取驳回历史: ${id}`)
    return this.rejectHistory[id] || []
  }

  /**
   * 驳回演训方案
   */
  reject(data: any) {
    this.logger.log(`驳回演训方案: ${JSON.stringify(data)}`)

    const { id, reason, rejectBy } = data
    const index = this.data.findIndex((item) => item.id === id)

    if (index !== -1) {
      // 更新状态为"驳回"
      this.data[index].status = '驳回'
      
      // 添加驳回记录
      if (!this.rejectHistory[id]) {
        this.rejectHistory[id] = []
      }
      
      const newRecord = {
        rejectBy: rejectBy || 'admin',
        rejectTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
        reason: reason,
      }
      
      this.rejectHistory[id].unshift(newRecord) // 最新记录排在前面
      
      this.logger.log(`方案 ${id} 状态已更新为: 驳回`)
      return {
        success: true,
        message: '驳回成功',
        data: this.data[index],
      }
    }

    return {
      success: false,
      message: '方案不存在',
    }
  }
}
