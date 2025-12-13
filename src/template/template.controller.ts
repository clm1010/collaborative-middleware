import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Res,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { TemplateService } from './template.service'
import { successResponse, errorResponse } from '../common/response.interface'

@Controller('template/management')
export class TemplateController {
  private readonly logger = new Logger(TemplateController.name)

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
   * 调用 Java 后端: POST /api/tbTemplate/savaTemplate
   */
  @Post('savaTemplate')
  async savaTemplate(@Body() body: any) {
    try {
      const data = await this.templateService.savaTemplate(body)
      return successResponse(data, '创建成功')
    } catch (error) {
      throw new HttpException(
        errorResponse(error.message || '创建失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 更新模板（编辑数据）
   * 调用 Java 后端: POST /api/tbTemplate/editData
   */
  @Put('update')
  async update(@Body() body: any) {
    try {
      const data = await this.templateService.update(body)
      if (data) {
        return successResponse(data, '更新成功')
      } else {
        throw new HttpException(errorResponse('模板不存在', 404), HttpStatus.NOT_FOUND)
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        errorResponse(error.message || '更新失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 删除模板（支持单个和批量删除）
   * 调用 Java 后端: POST /api/tbTemplate/delList
   * 参数格式: ["1", "2", "3"] - 直接接收数组格式
   */
  @Delete('delete')
  async delete(@Body() ids: (number | string)[]) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new HttpException(
        errorResponse('请提供要删除的ID数组', 400),
        HttpStatus.BAD_REQUEST,
      )
    }

    try {
      const result = await this.templateService.delete(ids)

      if (result.deletedIds.length > 0) {
        const msg = `成功删除 ${result.deletedIds.length} 条数据${result.notFoundIds.length > 0 ? `，${result.notFoundIds.length} 条数据不存在` : ''}`
        return successResponse(result, msg)
      } else {
        throw new HttpException(errorResponse('所有数据都不存在', 404), HttpStatus.NOT_FOUND)
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        errorResponse(error.message || '删除失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
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
   * 写作权限校验
   * 调用 Java 后端: POST /api/tbTemplate/getPermissionCheck
   * @param body.id 模板ID（表格中真实数据的id）
   * @param body.userId 用户ID（nanoid生成的）
   */
  @Post('getPermissionCheck')
  async getPermissionCheck(@Body() body: { id: string; userId: string }) {
    try {
      const result = await this.templateService.getPermissionCheck(body)
      return result
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        errorResponse(error.message || '权限校验失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 获取模板文件流
   * 调用 Java 后端: GET /api/tbTemplate/getfileStream
   * @param id 模板ID
   */
  @Get('getFileStream')
  async getFileStream(@Query('id') id: string, @Res() res: Response) {
    try {
      if (!id) {
        throw new HttpException(
          errorResponse('请提供模板ID', 400),
          HttpStatus.BAD_REQUEST,
        )
      }

      const result = await this.templateService.getFileStream(id)

      if (result.data) {
        // 设置响应头
        res.set({
          'Content-Type': result.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename || 'template.md')}"`,
        })
        // 返回文件流
        res.send(result.data)
      } else {
        throw new HttpException(
          errorResponse(result.message || '获取文件流失败', 404),
          HttpStatus.NOT_FOUND,
        )
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        errorResponse(error.message || '获取文件流失败', 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 保存模板文件
   * 代理调用 Java 后端: POST /api/tbTemplate/saveFile
   * @param id 模板ID（可选）
   * @param file 文件流
   */
  @Post('saveFile')
  @UseInterceptors(FileInterceptor('file'))
  async saveFile(
    @Body('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.logger.log(
      `保存模板文件请求: id=${id || '未提供'}, 文件名=${file?.originalname}, 大小=${file?.size} bytes`,
    )

    if (!file) {
      throw new HttpException(errorResponse('缺少必要参数: file', 400), HttpStatus.BAD_REQUEST)
    }

    try {
      const result = await this.templateService.saveFile(id, file)
      this.logger.log(`保存模板文件结果: ${JSON.stringify(result)}`)
      // 直接返回 Java 后端响应，不再包装
      return result
    } catch (error) {
      this.logger.error(`保存模板文件失败: ${error.message}`)
      throw new HttpException(
        errorResponse('保存文件失败: ' + error.message, 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}

