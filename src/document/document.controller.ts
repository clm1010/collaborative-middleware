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
} from '@nestjs/common'
import { Response } from 'express'
import { DocumentService } from './document.service'
import { successResponse, errorResponse } from '../common/response.interface'

@Controller('document')
export class DocumentController {
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
   */
  @Get(':id/materials')
  getMaterials(@Param('id') id: string) {
    const materials = this.documentService.getMaterials(id)
    return successResponse(materials)
  }

  /**
   * 添加参考素材
   */
  @Post(':id/materials')
  addMaterial(@Param('id') id: string, @Body() body: any) {
    const material = this.documentService.addMaterial(id, body)
    return successResponse(material, '添加成功')
  }

  /**
   * 删除参考素材
   */
  @Delete(':docId/materials/:materialId')
  deleteMaterial(@Param('docId') docId: string, @Param('materialId') materialId: string) {
    const result = this.documentService.deleteMaterial(docId, parseInt(materialId))

    if (!result) {
      throw new HttpException(errorResponse('素材不存在', 404), HttpStatus.NOT_FOUND)
    }

    return successResponse(null, '删除成功')
  }

  /**
   * 获取文档协作者
   */
  @Get(':id/collaborators')
  getCollaborators(@Param('id') id: string) {
    const collaborators = this.documentService.getCollaborators(id)
    return successResponse(collaborators)
  }

  /**
   * 添加协作者
   */
  @Post(':id/collaborators')
  addCollaborator(@Param('id') id: string, @Body() body: any) {
    const result = this.documentService.addCollaborator(id, body)

    if (!result.success) {
      throw new HttpException(errorResponse(result.error, 400), HttpStatus.BAD_REQUEST)
    }

    return successResponse(result.data, '添加成功')
  }

  /**
   * 移除协作者
   */
  @Delete(':docId/collaborators/:userId')
  removeCollaborator(@Param('docId') docId: string, @Param('userId') userId: string) {
    const result = this.documentService.removeCollaborator(docId, parseInt(userId))

    if (!result) {
      throw new HttpException(errorResponse('协作者不存在', 404), HttpStatus.NOT_FOUND)
    }

    return successResponse(null, '移除成功')
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
}

