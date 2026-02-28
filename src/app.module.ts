import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CollaborationModule } from './collaboration/collaboration.module'
import { MarkdownCollaborationModule } from './markdown-collaboration/markdown-collaboration.module'

/**
 * 应用程序主模块
 *
 * 重构后只保留 WebSocket 协同编辑功能：
 * - CollaborationModule: 文档协同编辑 (Y.js + WebSocket)
 * - MarkdownCollaborationModule: Markdown 协同编辑 (Y.js + WebSocket)
 *
 * 已迁移到 yd-admin 前端的模块：
 * - PerformanceModule -> src/api/training/performance/index.ts
 * - DocumentModule -> src/views/training/document/api/documentApi.ts
 * - TemplateModule -> src/api/template/management/index.ts
 * - MarkdownModule -> src/views/template/editor/api/markdownApi.ts
 * - UsersModule -> 相关接口已迁移到各 API 文件
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.dev', '.env.prod'],
    }),
    CollaborationModule,
    MarkdownCollaborationModule,
  ],
})
export class AppModule {}
