import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Res,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { MarkdownService } from './markdown.service'
import { successResponse, errorResponse } from '../common/response.interface'

@Controller('markdown')
export class MarkdownController {
  private readonly logger = new Logger(MarkdownController.name)

  constructor(private readonly markdownService: MarkdownService) {}

  /**
   * 获取 Markdown 文档详情
   */
  @Get(':id')
  getMarkdown(@Param('id') id: string) {
    const doc = this.markdownService.getMarkdown(id)
    return successResponse(doc)
  }

  /**
   * 保存 Markdown 文档
   */
  @Post('save')
  saveMarkdown(@Body() body: any) {
    if (!body.id) {
      throw new HttpException(errorResponse('文档ID不能为空', 400), HttpStatus.BAD_REQUEST)
    }

    const doc = this.markdownService.saveMarkdown(body)
    return successResponse(doc, '保存成功')
  }

  /**
   * 删除 Markdown 文档
   */
  @Delete(':id')
  deleteMarkdown(@Param('id') id: string) {
    const result = this.markdownService.deleteMarkdown(id)

    if (!result) {
      throw new HttpException(errorResponse('文档不存在', 404), HttpStatus.NOT_FOUND)
    }

    return successResponse(null, '删除成功')
  }

  /**
   * 获取 Markdown 文档列表
   */
  @Get('list/all')
  getMarkdownList() {
    const list = this.markdownService.getMarkdownList()
    return successResponse(list)
  }

  /**
   * 获取参考素材
   * 代理调用 Java 后端: POST /api/users/getMaterial
   */
  @Post(':id/materials')
  async getMaterials(@Param('id') id: string) {
    this.logger.log(`获取 Markdown 素材请求: id=${id}`)

    try {
      const result = await this.markdownService.getMaterials(id)

      if (result.code === 200) {
        return successResponse(result.data)
      } else {
        throw new HttpException(
          errorResponse(result.msg || '获取素材失败', result.code),
          HttpStatus.INTERNAL_SERVER_ERROR,
        )
      }
    } catch (error) {
      this.logger.error(`获取素材失败: ${error.message}`)
      throw new HttpException(
        errorResponse('获取素材失败: ' + error.message, 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 导出 HTML
   */
  @Post('export/html')
  exportHtml(@Body() body: { title: string; content: string }, @Res() res: Response) {
    const html = this.markdownService.exportToHtml(body.title, body.content)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(body.title || '模板文档')}.html"`,
    )
    res.send(html)
  }

  /**
   * 导出 JSON
   */
  @Post('export/json')
  exportJson(
    @Body() body: { id: string; title: string; content: string },
    @Res() res: Response,
  ) {
    const exportData = this.markdownService.exportToJson(body.id, body.title, body.content)

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(body.title || '模板文档')}.json"`,
    )
    res.json(exportData)
  }

  /**
   * 保存 Markdown 文件
   * 代理调用 Java 后端: POST /api/users/saveFile
   * @param id 文档ID (可选)
   * @param file 文件流
   */
  @Post('saveDocument')
  @UseInterceptors(FileInterceptor('file'))
  async saveMarkdownFile(
    @Body('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.logger.log(
      `保存 Markdown 文件请求: id=${id || '未提供'}, 文件名=${file?.originalname}, 大小=${file?.size} bytes`,
    )

    if (!file) {
      throw new HttpException(errorResponse('缺少必要参数: file', 400), HttpStatus.BAD_REQUEST)
    }

    try {
      const result = await this.markdownService.saveMarkdownFile(id, file)
      this.logger.log(`保存 Markdown 文件结果: ${JSON.stringify(result)}`)
      // 直接返回 Java 后端响应，不再包装
      return result
    } catch (error) {
      this.logger.error(`保存 Markdown 文件失败: ${error.message}`)
      throw new HttpException(
        errorResponse('保存文件失败: ' + error.message, 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 提交审核
   */
  @Post('submitAudit')
  async submitAudit(@Body() body: { id: string; auditor: string; comment?: string }) {
    this.logger.log(`提交审核请求: ${JSON.stringify(body)}`)

    if (!body.id) {
      throw new HttpException(errorResponse('文档ID不能为空', 400), HttpStatus.BAD_REQUEST)
    }

    try {
      const result = await this.markdownService.submitAudit(body)
      return successResponse(result, '提交审核成功')
    } catch (error) {
      this.logger.error(`提交审核失败: ${error.message}`)
      throw new HttpException(
        errorResponse('提交审核失败: ' + error.message, 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}

