import { Injectable, Logger } from '@nestjs/common'

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
 * 协作者接口
 */
export interface Collaborator {
  userId: number
  nickname: string
  avatar: string
  role: string
  addTime: string
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name)
  
  // 模拟数据库存储
  private documents = new Map<string, Document>()
  private documentMaterials = new Map<string, Material[]>()
  private documentCollaborators = new Map<string, Collaborator[]>()

  constructor() {
    this.initTestData()
  }

  /**
   * 初始化测试数据
   */
  private initTestData() {
    const testDoc: Document = {
      id: 'demo-doc',
      title: '协同文档示例',
      content: '<p>欢迎使用协同文档编辑器！</p><p>这是一个支持多人实时协作的文档。</p>',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      version: 'V1.0',
      tags: ['文档', '协作', '演示'],
      creatorId: 1,
      creatorName: '管理员',
    }
    this.documents.set('demo-doc', testDoc)

    // 初始化参考素材
    this.documentMaterials.set('demo-doc', [
      {
        id: 1,
        title: '文档名称1.doc',
        date: '2025-11-12 12:00',
        author: '张三/李四/王五',
        content:
          '<p>这是文档名称1的参考内容。</p><p><strong>要点：</strong></p><ul><li>用户注册登录功能</li><li>文档创建和编辑功能</li></ul>',
      },
      {
        id: 2,
        title: '需求分析报告.pdf',
        date: '2025-11-10 09:30',
        author: '李四',
        content:
          '<p>这里是需求分析报告的摘要内容。</p><ol><li>性能需求：响应时间 < 1s</li><li>安全需求：数据加密存储</li></ol>',
      },
      {
        id: 3,
        title: '竞品分析.pptx',
        date: '2025-11-08 15:45',
        author: '王五',
        content:
          '<p>竞品分析结论：</p><p>我们的优势在于<strong>协同编辑</strong>的实时性和流畅度。</p>',
      },
    ])
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
    this.documentMaterials.delete(id)
    this.documentCollaborators.delete(id)

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
   */
  getMaterials(id: string): Material[] {
    return this.documentMaterials.get(id) || []
  }

  /**
   * 添加参考素材
   */
  addMaterial(id: string, data: any): Material {
    if (!this.documentMaterials.has(id)) {
      this.documentMaterials.set(id, [])
    }

    const materials = this.documentMaterials.get(id)
    const newMaterial: Material = {
      id: Date.now(),
      title: data.title || '未命名素材',
      content: data.content || '',
      author: data.author || '未知',
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
    }

    materials.push(newMaterial)
    this.logger.log(`📎 添加素材: ${newMaterial.title} -> 文档 ${id}`)

    return newMaterial
  }

  /**
   * 删除参考素材
   */
  deleteMaterial(docId: string, materialId: number): boolean {
    const materials = this.documentMaterials.get(docId)
    if (!materials) {
      return false
    }

    const index = materials.findIndex((m) => m.id === materialId)
    if (index === -1) {
      return false
    }

    materials.splice(index, 1)
    return true
  }

  /**
   * 获取文档协作者
   */
  getCollaborators(id: string): Collaborator[] {
    return this.documentCollaborators.get(id) || []
  }

  /**
   * 添加协作者
   */
  addCollaborator(id: string, data: any): { success: boolean; data?: Collaborator; error?: string } {
    if (!this.documentCollaborators.has(id)) {
      this.documentCollaborators.set(id, [])
    }

    const collaborators = this.documentCollaborators.get(id)

    // 检查是否已存在
    const existing = collaborators.find((c) => c.userId === data.userId)
    if (existing) {
      return { success: false, error: '用户已是协作者' }
    }

    const newCollaborator: Collaborator = {
      userId: data.userId,
      nickname: data.nickname || '用户' + data.userId,
      avatar: data.avatar || '',
      role: data.role || 'editor',
      addTime: new Date().toISOString(),
    }

    collaborators.push(newCollaborator)
    this.logger.log(`👥 添加协作者: ${newCollaborator.nickname} -> 文档 ${id}`)

    return { success: true, data: newCollaborator }
  }

  /**
   * 移除协作者
   */
  removeCollaborator(docId: string, userId: number): boolean {
    const collaborators = this.documentCollaborators.get(docId)
    if (!collaborators) {
      return false
    }

    const index = collaborators.findIndex((c) => c.userId === userId)
    if (index === -1) {
      return false
    }

    collaborators.splice(index, 1)
    return true
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
}

