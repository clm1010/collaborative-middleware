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
   * 创建演训方案
   */
  @Post('create')
  create(@Body() body: any) {
    const data = this.performanceService.create(body)
    return successResponse(data, '创建成功')
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
   * 提交审核
   */
  @Post('audit/submit')
  submitAudit(@Body() body: any) {
    const result = this.performanceService.submitAudit(body)
    if (result.success) {
      return successResponse(result.data, result.message)
    } else {
      throw new HttpException(errorResponse(result.message, 404), HttpStatus.NOT_FOUND)
    }
  }

  /**
   * 发布文档
   */
  @Post('publish')
  publishDocument(@Body() body: any) {
    const result = this.performanceService.publishDocument(body)
    if (result.success) {
      return successResponse(result.data, result.message)
    } else {
      throw new HttpException(errorResponse(result.message, 404), HttpStatus.NOT_FOUND)
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
