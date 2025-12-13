import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import FormData from 'form-data'

/**
 * 保存文件响应接口
 */
export interface SaveDocumentFileResponse {
  code: number
  data: any
  status: number
  msg?: string
}

/**
 * 文档接口
 */
export interface Document {
  id: string
  title: string
  content: string
  createTime: string
  updateTime: string
  version: string
  tags: string[]
  creatorId: number
  creatorName: string
}

/**
 * 素材接口
 */
export interface Material {
  id: number
  title: string
  content: string
  author: string
  date: string
}

/**
 * 获取素材响应接口
 */
export interface GetMaterialResponse {
  code: number
  data: Material[]
  status: number
  msg?: string
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name)
  private readonly httpClient: AxiosInstance
  private readonly javaApiBase: string

  // 文档数据存储（用于协同编辑）
  private documents = new Map<string, Document>()

  constructor(private configService: ConfigService) {
    // 从环境变量获取 Java 后端地址
    this.javaApiBase = this.configService.get<string>('JAVA_API_URL') || 'http://192.168.8.104:8080'

    this.logger.log(`Java API 地址: ${this.javaApiBase}`)

    // 创建 axios 实例
    this.httpClient = axios.create({
      baseURL: this.javaApiBase,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * 获取文档详情
   */
  getDocument(id: string): Document {
    let doc = this.documents.get(id)

    // 如果文档不存在，自动创建一个新文档
    if (!doc) {
      doc = {
        id,
        title: '新文档',
        content: '<p></p>',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        version: 'V1.0',
        tags: [],
        creatorId: 1,
        creatorName: '系统',
      }
      this.documents.set(id, doc)
      this.logger.log(`📄 创建新文档: ${id}`)
    }

    return doc
  }

  /**
   * 保存文档
   */
  saveDocument(data: any): Document {
    const { id, title, content } = data

    let doc = this.documents.get(id)

    if (doc) {
      // 更新现有文档
      doc.title = title || doc.title
      doc.content = content !== undefined ? content : doc.content
      doc.updateTime = new Date().toISOString()
      // 增加版本号
      const versionNum = parseInt(doc.version.replace('V', '').replace('.0', '')) || 1
      doc.version = `V${versionNum + 1}.0`
    } else {
      // 创建新文档
      doc = {
        id,
        title: title || '未命名文档',
        content: content || '<p></p>',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        version: 'V1.0',
        tags: [],
        creatorId: data.creatorId || 1,
        creatorName: data.creatorName || '用户',
      }
    }

    this.documents.set(id, doc)
    this.logger.log(`💾 保存文档: ${id} (${doc.title})`)

    return doc
  }

  /**
   * 删除文档
   */
  deleteDocument(id: string): boolean {
    if (!this.documents.has(id)) {
      return false
    }

    this.documents.delete(id)

    this.logger.log(`🗑️  删除文档: ${id}`)
    return true
  }

  /**
   * 获取文档列表
   */
  getDocumentList() {
    return Array.from(this.documents.values()).map((doc) => ({
      id: doc.id,
      title: doc.title,
      createTime: doc.createTime,
      updateTime: doc.updateTime,
      version: doc.version,
      tags: doc.tags,
      creatorName: doc.creatorName,
    }))
  }

  /**
   * 获取文档参考素材
   * 调用 Java 后端: POST /api/getPlan/getMaterial
   * @param id 文档ID
   * @returns 素材列表
   */
  async getMaterials(id: string): Promise<GetMaterialResponse> {
    const url = '/api/getPlan/getMaterial'
    this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)
    this.logger.log(`参数: id=${id}`)

    try {
      const response = await this.httpClient.post(url, { id })

      this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

      return {
        code: response.data.code || 200,
        data: response.data.data || [],
        status: response.data.status || response.status,
        msg: response.data.msg || 'success',
      }
    } catch (error) {
      this.logger.error(`调用 Java 获取素材接口失败: ${error.message}`)

      if (error.response) {
        return {
          code: error.response.data?.code || 500,
          data: [],
          status: error.response.status || 500,
          msg: error.response.data?.msg || '获取素材失败',
        }
      }

      return {
        code: 500,
        data: [],
        status: 500,
        msg: '获取素材失败: ' + error.message,
      }
    }
  }

  /**
   * 导出为 HTML
   */
  exportToHtml(title: string, content: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || '文档'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.8;
      color: #333;
    }
    h1 { font-size: 2em; color: #1a1a1a; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; color: #2a2a2a; margin-top: 1.5em; }
    h3 { font-size: 1.25em; color: #3a3a3a; margin-top: 1.2em; }
    p { margin: 1em 0; }
    ul, ol { padding-left: 2em; }
    li { margin: 0.3em 0; }
    blockquote {
      border-left: 4px solid #2563eb;
      padding-left: 1em;
      margin: 1em 0;
      color: #666;
      font-style: italic;
    }
    code {
      background: #f3f4f6;
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
    }
    pre code { background: transparent; color: inherit; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    th { background: #f5f5f5; font-weight: 600; }
    a { color: #2563eb; text-decoration: underline; }
    img { max-width: 100%; height: auto; }
    mark { background: #fef08a; padding: 0 2px; }
    .header {
      text-align: center;
      border-bottom: 2px solid #eee;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title || '文档'}</h1>
    <p style="color: #666; font-size: 14px;">导出时间: ${new Date().toLocaleString('zh-CN')}</p>
  </div>
  <div class="content">
    ${content || ''}
  </div>
  <div class="footer">
    <p>本文档由协同编辑系统导出</p>
  </div>
</body>
</html>`
  }

  /**
   * 导出为 JSON
   */
  exportToJson(id: string, title: string, content: string) {
    const doc = this.documents.get(id)
    return {
      ...doc,
      title: title || doc?.title || '文档',
      content: content || doc?.content || '',
      exportTime: new Date().toISOString(),
    }
  }

  /**
   * 保存文档文件
   * 调用 Java 后端: POST /api/getPlan/saveFile
   * @param id 文档ID (可选)
   * @param file 文件对象
   * @returns 保存结果
   */
  async saveDocumentFile(
    id: string | undefined,
    file: Express.Multer.File,
  ): Promise<SaveDocumentFileResponse> {
    const url = '/api/getPlan/saveFile'
    this.logger.log(`调用 Java 接口: ${this.javaApiBase}${url}`)

    // 解码文件名(处理中文乱码问题)
    //multer 接收到的 originalname 可能是 Latin-1 编码的,需要转换为 UTF-8
    let decodedFilename = file.originalname
    try {
      // 尝试将 Latin-1 编码的字符串转换为 UTF-8
      decodedFilename = Buffer.from(file.originalname, 'latin1').toString('utf-8')
    } catch (e) {
      // 如果转换失败,保持原始文件名
      this.logger.warn(`文件名解码失败,使用原始文件名: ${file.originalname}`)
    }

    this.logger.log(`参数:id=${id || '未提供'},文件名=${decodedFilename},大小=${file.size}bytes`)

    try {
      // 创建 FormData
      const formData = new FormData()
      // 只有在提供 id 时才添加 id 参数
      if (id) {
        formData.append('id', id)
      }
      formData.append('file', file.buffer, {
        filename: decodedFilename,
        contentType: file.mimetype,
      })

      const response = await this.httpClient.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000, // 文件上传可能较大，超时设为60秒
      })

      this.logger.log(`Java 接口响应: ${JSON.stringify(response.data)}`)

      // 直接返回 Java 后端的响应
      return response.data
    } catch (error) {
      this.logger.error(`调用 Java 保存文件接口失败: ${error.message}`)

      if (error.response) {
        this.logger.error(`HTTP 错误: ${JSON.stringify(error.response.data)}`)
        throw new Error(error.response.data?.msg || '保存文件失败')
      }

      throw error
    }
  }
}
