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
import { DocumentService } from './document.service'
import { successResponse, errorResponse } from '../common/response.interface'

@Controller('document')
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name)

  constructor(private readonly documentService: DocumentService) {}

  /**
   * 获取文档详情
   */
  @Get(':id')
  getDocument(@Param('id') id: string) {
    const doc = this.documentService.getDocument(id)
    return successResponse(doc)
  }

  /**
   * 保存文档
   */
  @Post('save')
  saveDocument(@Body() body: any) {
    if (!body.id) {
      throw new HttpException(errorResponse('文档ID不能为空', 400), HttpStatus.BAD_REQUEST)
    }

    const doc = this.documentService.saveDocument(body)
    return successResponse(doc, '保存成功')
  }

  /**
   * 删除文档
   */
  @Delete(':id')
  deleteDocument(@Param('id') id: string) {
    const result = this.documentService.deleteDocument(id)

    if (!result) {
      throw new HttpException(errorResponse('文档不存在', 404), HttpStatus.NOT_FOUND)
    }

    return successResponse(null, '删除成功')
  }

  /**
   * 获取文档列表
   */
  @Get('list/all')
  getDocumentList() {
    const list = this.documentService.getDocumentList()
    return successResponse(list)
  }

  /**
   * 获取文档参考素材
   * 代理调用 Java 后端: POST /api/users/getMaterial
   */
  @Post(':id/materials')
  async getMaterials(@Param('id') id: string) {
    this.logger.log(`获取文档素材请求: id=${id}`)
    
    try {
      const result = await this.documentService.getMaterials(id)
      // this.logger.log(`获取文档素材结果: ${JSON.stringify(result)}`)
      
      if (result.code === 200) {
        return successResponse(result.data)
      } else {
        throw new HttpException(
          errorResponse(result.msg || '获取素材失败', result.code),
          HttpStatus.INTERNAL_SERVER_ERROR,
        )
      }
    } catch (error) {
      this.logger.error(`获取文档素材失败: ${error.message}`)
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
    const html = this.documentService.exportToHtml(body.title, body.content)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(body.title || '文档')}.html"`,
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
    const exportData = this.documentService.exportToJson(body.id, body.title, body.content)

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(body.title || '文档')}.json"`,
    )
    res.json(exportData)
  }

  /**
   * 保存文档文件
   * 代理调用 Java 后端: POST /api/users/saveFile
   * @param id 文档ID
   * @param file 文件流
   */
  @Post('saveDocument')
  @UseInterceptors(FileInterceptor('file'))
  async saveDocumentFile(
    @Body('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.logger.log(
      `保存文档文件请求: id=${id}, 文件名=${file?.originalname}, 大小=${file?.size} bytes`,
    )

    if (!id) {
      throw new HttpException(errorResponse('缺少必要参数: id', 400), HttpStatus.BAD_REQUEST)
    }

    if (!file) {
      throw new HttpException(errorResponse('缺少必要参数: file', 400), HttpStatus.BAD_REQUEST)
    }

    try {
      const result = await this.documentService.saveDocumentFile(id, file)
      this.logger.log(`保存文档文件结果: ${JSON.stringify(result)}`)
      return result
    } catch (error) {
      this.logger.error(`保存文档文件失败: ${error.message}`)
      throw new HttpException(
        errorResponse('保存文档文件失败: ' + error.message, 500),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}

