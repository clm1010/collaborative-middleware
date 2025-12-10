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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { TemplateService } from './template.service'
import { successResponse, errorResponse } from '../common/response.interface'

@Controller('template/management')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  /**
   * 获取模板分类列表
   */
  @Get('categories')
  getCategories() {
    const data = this.templateService.getCategories()
    return successResponse(data)
  }

  /**
   * 获取分页列表数据
   * POST /template/management/pageList
   * @param body.tabType 标签页类型: 'recent' | 'review' | 'publish' | undefined
   */
  @Post('pageList')
  async getPageList(@Body() body: any) {
    try {
      const data = await this.templateService.getPageList(body)
      return successResponse(data)
    } catch (error) {
      throw new HttpException(
        errorResponse(error.message || '获取数据失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 创建模板
   */
  @Post('create')
  create(@Body() body: any) {
    const data = this.templateService.create(body)
    return successResponse(data, '创建成功')
  }

  /**
   * 更新模板
   */
  @Put('update')
  update(@Body() body: any) {
    const data = this.templateService.update(body)
    if (data) {
      return successResponse(data, '更新成功')
    } else {
      throw new HttpException(errorResponse('模板不存在', 404), HttpStatus.NOT_FOUND)
    }
  }

  /**
   * 删除模板（支持单个和批量删除）
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

    const result = this.templateService.delete(ids)

    if (result.deletedIds.length > 0) {
      const msg = `成功删除 ${result.deletedIds.length} 条数据${result.notFoundIds.length > 0 ? `，${result.notFoundIds.length} 条数据不存在` : ''}`
      return successResponse(result, msg)
    } else {
      throw new HttpException(errorResponse('所有数据都不存在', 404), HttpStatus.NOT_FOUND)
    }
  }

  /**
   * 提交审核
   */
  @Post('audit/submit')
  async submitAudit(@Body() body: any) {
    try {
      const result = await this.templateService.submitAudit(body)
      if (result.success) {
        return successResponse(result, result.message)
      } else {
        throw new HttpException(errorResponse(result.message, 400), HttpStatus.BAD_REQUEST)
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        errorResponse(error.message || '提交审核失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 导入模板
   */
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importTemplate(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new HttpException(errorResponse('请上传文件', 400), HttpStatus.BAD_REQUEST)
      }

      const result = await this.templateService.importTemplate(file)
      return successResponse(result.data, result.message)
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        errorResponse(error.message || '导入失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}

