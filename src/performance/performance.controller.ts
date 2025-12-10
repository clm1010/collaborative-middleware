import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { PerformanceService } from './performance.service'
import { successResponse, errorResponse } from '../common/response.interface'

@Controller('training/performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  /**
   * 获取演训方案分页数据
   */
  @Get('page')
  getPage(@Query() query: any) {
    const data = this.performanceService.getPage(query)
    return successResponse(data)
  }

  /**
   * 获取文档分类列表
   */
  @Get('categories')
  getCategories() {
    const data = this.performanceService.getCategories()
    return successResponse(data)
  }

  /**
   * 获取分页列表数据
   * POST /training/performance/pageList
   * @param body.tabType 标签页类型: 'review' | 'publish' | undefined(recent 查询全部)
   */
  @Post('pageList')
  async getPageList(@Body() body: any) {
    try {
      const data = await this.performanceService.getPageList(body)
      return successResponse(data)
    } catch (error) {
      throw new HttpException(
        errorResponse(error.message || '获取数据失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 创建演训方案 (Mock)
   */
  @Post('create')
  create(@Body() body: any) {
    const data = this.performanceService.create(body)
    return successResponse(data, '创建成功')
  }

  /**
   * 新建筹划方案 - 调用 Java 后端
   * 直接返回 Java 后端的响应，不再包装
   */
  @Post('newData')
  async createNewData(@Body() body: any) {
    try {
      const data = await this.performanceService.createNewData(body)
      // 直接返回 Java 后端的响应，不用 successResponse 包装
      return data
    } catch (error) {
      throw new HttpException(
        errorResponse(error.message || '创建失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 更新演训方案
   */
  @Put('update')
  update(@Body() body: any) {
    const data = this.performanceService.update(body)
    if (data) {
      return successResponse(data, '更新成功')
    } else {
      throw new HttpException(errorResponse('数据不存在', 404), HttpStatus.NOT_FOUND)
    }
  }

  /**
   * 删除演训方案（支持单个和批量删除）
   */
  @Delete('delete')
  delete(@Body() body: { ids: number[] }) {
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new HttpException(
        errorResponse('请提供要删除的ID数组', 400),
        HttpStatus.BAD_REQUEST,
      )
    }

    const result = this.performanceService.delete(ids)

    if (result.deletedIds.length > 0) {
      const msg = `成功删除 ${result.deletedIds.length} 条数据${result.notFoundIds.length > 0 ? `，${result.notFoundIds.length} 条数据不存在` : ''}`
      return successResponse(result, msg)
    } else {
      throw new HttpException(errorResponse('所有数据都不存在', 404), HttpStatus.NOT_FOUND)
    }
  }

  /**
   * 导出演训方案
   */
  @Get('export')
  export() {
    const data = this.performanceService.export()
    return successResponse(data)
  }

  /**
   * 提交审核 - 调用 Java 后端
   * 直接返回 Java 后端的响应，不再包装
   */
  @Post('audit/submit')
  async submitAudit(@Body() body: any) {
    try {
      const data = await this.performanceService.submitAudit(body)
      // 直接返回 Java 后端的响应，不用 successResponse 包装
      return data
    } catch (error) {
      throw new HttpException(
        errorResponse(error.message || '提交审核失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 发布文档 - 调用 Java 后端
   * 直接返回 Java 后端的响应，不再包装
   */
  @Post('publish')
  async publishDocument(@Body() body: any) {
    try {
      const data = await this.performanceService.publishDocument(body)
      // 直接返回 Java 后端的响应，不用 successResponse 包装
      return data
    } catch (error) {
      throw new HttpException(
        errorResponse(error.message || '发布文档失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 获取驳回历史
   */
  @Get('audit/reject/history')
  getRejectHistory(@Query('id') id: number) {
    const data = this.performanceService.getRejectHistory(id)
    return successResponse(data)
  }

  /**
   * 驳回演训方案
   */
  @Post('audit/reject')
  reject(@Body() body: any) {
    const result = this.performanceService.reject(body)
    if (result.success) {
      return successResponse(result.data, result.message)
    } else {
      throw new HttpException(errorResponse(result.message, 404), HttpStatus.NOT_FOUND)
    }
  }
}
