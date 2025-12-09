import { Injectable, Logger } from '@nestjs/common'

/**
 * Mock 数据 - 更新为符合前端需求的状态
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
    updateTime: '2024-01-10 12:00:00',
    version: 'V1.0',
    tags: '文档,协作,演示'
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
    updateTime: '2024-01-15 16:30:00',
    version: 'V1.0',
    tags: '文档,协作,演示'
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
    updateTime: '2024-01-15 16:30:00',
    version: 'V1.0',
    tags: '文档,协作,演示'
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
    updateTime: '2024-01-25 18:45:00',
    version: 'V1.0',
    tags: '文档,协作,演示'
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
    updateTime: '2024-02-01 13:20:00',
    version: 'V1.0',
    tags: '文档,协作,演示'
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
    updateTime: '2024-02-05 15:50:00',
    version: 'V1.0',
    tags: '文档,协作,演示'
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
    updateTime: '2024-02-10 17:30:00',
    version: 'V1.0',
    tags: '文档,协作,演示'
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
    updateTime: '2024-02-15 10:40:00',
    version: 'V1.0',
    tags: '文档,协作,演示'
  },
  {
    id: 9,
    name: '联合火力打击企图立案',
    college: '学院A',
    docCategory: '企图立案',
    drillLevel: '战略级',
    drillType: 'A',
    drillTheme: '联合火力',
    author: 'admin',
    scope: '可管理',
    status: '编辑中',
    createTime: '2024-03-01 10:30:00',
    updateTime: '2024-03-01 12:30:00',
    version: 'V1.0',
    tags: '文档,协作,演示'
  },
  {
    id: 10,
    name: '防御作战想定',
    college: '学院B',
    docCategory: '作战想定',
    drillLevel: '战术级',
    drillType: 'B',
    drillTheme: '防御作战',
    author: 'admin',
    scope: '可编辑',
    status: '审核通过',
    createTime: '2024-03-05 14:20:00',
    updateTime: '2024-03-05 16:20:00',
    version: 'V1.0',
    tags: '文档,协作,演示'
  },
  {
    id: 11,
    name: '演训成果战绩战报',
    college: '学院C',
    docCategory: '战绩战报',
    drillLevel: '战略级',
    drillType: 'C',
    drillTheme: '演训总结',
    author: 'admin',
    scope: '可查看',
    status: '发布成功',
    createTime: '2024-03-10 16:00:00',
  },
  {
    id: 12,
    name: '紧急通知文件',
    college: '学院A',
    docCategory: '通知',
    drillLevel: '战略级',
    drillType: 'A',
    drillTheme: '紧急通知',
    author: 'admin',
    scope: '可编辑',
    status: '发布成功',
    createTime: '2024-03-15 09:00:00',
  },
  {
    id: 13,
    name: '演训活动公告',
    college: '学院B',
    docCategory: '通告',
    drillLevel: '战术级',
    drillType: 'B',
    drillTheme: '活动公告',
    author: 'admin',
    scope: '可查看',
    status: '待审核',
    createTime: '2024-03-20 11:30:00',
  },
  {
    id: 14,
    name: '作战效能评估结果',
    college: '学院C',
    docCategory: '评估结果',
    drillLevel: '战略级',
    drillType: 'C',
    drillTheme: '效能评估',
    author: 'admin',
    scope: '可管理',
    status: '审核通过',
    createTime: '2024-03-25 15:45:00',
  },
  {
    id: 15,
    name: '联合演习总体方案',
    college: '学院A',
    docCategory: '总体方案',
    drillLevel: '战略级',
    drillType: 'A',
    drillTheme: '联合演习',
    author: 'admin',
    scope: '可编辑',
    status: '编辑中',
    createTime: '2024-04-01 10:00:00',
  },
  {
    id: 16,
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
  {
    id: 17,
    name: '空中打击作战计划',
    college: '学院C',
    docCategory: '作战计划',
    drillLevel: '战略级',
    drillType: 'C',
    drillTheme: '空中打击',
    author: '李四',
    scope: '可编辑',
    status: '驳回',
    createTime: '2024-04-08 14:20:00',
  },
  {
    id: 18,
    name: '信息战导调计划',
    college: '学院A',
    docCategory: '导调计划',
    drillLevel: '战略级',
    drillType: 'A',
    drillTheme: '信息战',
    author: '王五',
    scope: '可编辑',
    status: '驳回',
    createTime: '2024-04-10 11:15:00',
  },
]

/**
 * 文档分类数据
 */
const categories = [
  { id: 'all', fileType: '全部' },
  { id: 'plan', fileType: '企图立案' },
  { id: 'combat', fileType: '作战计划' },
  { id: 'scheme', fileType: '演训方案' },
  { id: 'book', fileType: '作战文书' },
  { id: 'guide', fileType: '导调计划' },
  { id: 'idea', fileType: '作战想定' },
  { id: 'report', fileType: '战绩战报' },
  { id: 'summary', fileType: '总结报告' },
  { id: 'notice', fileType: '通知' },
  { id: 'announce', fileType: '通告' },
  { id: 'result', fileType: '评估结果' },
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
  private data = [...mockData]
  private rejectHistory = { ...mockRejectHistory }

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

    // 4. 左侧文档分类选择
    if (fileType && fileType !== 'all') {
      const categoryIdMap = {
        plan: '企图立案',
        combat: '作战计划',
        scheme: '演训方案',
        book: '作战文书',
        guide: '导调计划',
        idea: '作战想定',
        report: '战绩战报',
        summary: '总结报告',
        notice: '通知',
        announce: '通告',
        result: '评估结果',
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
   * 创建演训方案
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
   * 提交审核
   */
  submitAudit(data: any) {
    this.logger.log(`提交审核: ${JSON.stringify(data)}`)

    const { id, flowName, auditors, comment } = data
    const index = this.data.findIndex((item) => item.id === id)

    if (index !== -1) {
      // 更新状态为"待审核"
      this.data[index].status = '待审核'
      this.logger.log(`方案 ${id} 状态已更新为: 待审核`)
      return {
        success: true,
        message: '提交审核成功',
        data: this.data[index],
      }
    }

    return {
      success: false,
      message: '方案不存在',
    }
  }

  /**
   * 发布文档
   */
  publishDocument(data: any) {
    this.logger.log(`发布文档: ${JSON.stringify(data)}`)

    const { id, visibleScope } = data
    const index = this.data.findIndex((item) => item.id === id)

    if (index !== -1) {
      // 更新状态为"发布成功"
      this.data[index].status = '发布成功'
      this.logger.log(`方案 ${id} 状态已更新为: 发布成功`)
      return {
        success: true,
        message: '发布成功',
        data: this.data[index],
      }
    }

    return {
      success: false,
      message: '方案不存在',
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
