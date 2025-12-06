import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { WsAdapter } from './collaboration/ws.adapter'
import { networkInterfaces } from 'os'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  
  // 使用自定义 WebSocket 适配器
  app.useWebSocketAdapter(new WsAdapter(app))
  const logger = new Logger('Bootstrap')

  // 获取环境变量
  const NODE_ENV = process.env.NODE_ENV || 'development'
  const isProduction = NODE_ENV === 'production'

  // 启用 CORS
  const corsOrigin = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : '*'
  
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  })

  // 设置全局前缀
  app.setGlobalPrefix('api')

  // 启动服务
  const PORT = process.env.COLLABORATIVE_MIDDLEWARE_PORT || 3001
  Logger.log(`process.env.COLLABORATIVE_MIDDLEWARE_PORT: ${process.env.COLLABORATIVE_MIDDLEWARE_PORT}`)
  await app.listen(PORT)

  // 获取本机IP地址（用于生产环境显示）
  const nets = networkInterfaces()
  let localIp = 'localhost'
  Object.keys(nets).forEach((key) => {
    nets[key]?.forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        localIp = details.address
      }
    })
  })

  logger.log(`\n=================================`)
  logger.log(`🚀 服务已启动！`)
  logger.log(`📊 环境: ${NODE_ENV}`)
  logger.log(`📡 本地地址: http://localhost:${PORT}`)
  if (isProduction) {
    logger.log(`📡 网络地址: http://${localIp}:${PORT}`)
  }
  logger.log(`🔗 CORS配置: ${corsOrigin === '*' ? '允许所有来源' : corsOrigin}`)
  logger.log(`\n📋 演训方案 API:`)
  logger.log(`   GET    /api/training/performance/page - 获取分页数据`)
  logger.log(`   GET    /api/training/performance/categories - 获取文档分类`)
  logger.log(`   POST   /api/training/performance/create - 创建方案`)
  logger.log(`   PUT    /api/training/performance/update - 更新方案`)
  logger.log(`   DELETE /api/training/performance/delete - 删除方案`)
  logger.log(`   POST   /api/training/performance/audit/submit - 提交审核`)
  logger.log(`   POST   /api/training/performance/publish - 发布文档`)
  logger.log(`\n📄 文档协作 API:`)
  logger.log(`   GET    /api/document/:id - 获取文档详情`)
  logger.log(`   POST   /api/document/save - 保存文档`)
  logger.log(`   DELETE /api/document/:id - 删除文档`)
  logger.log(`   GET    /api/document/list/all - 获取文档列表`)
  logger.log(`   GET    /api/document/:id/materials - 获取参考素材`)
  logger.log(`   POST   /api/document/:id/materials - 添加参考素材`)
  logger.log(`   GET    /api/document/:id/collaborators - 获取协作者`)
  logger.log(`   POST   /api/document/:id/collaborators - 添加协作者`)
  logger.log(`   POST   /api/document/export/html - 导出 HTML`)
  logger.log(`\n🔌 WebSocket 协同编辑:`)
  logger.log(`   WS     ws://localhost:${PORT} - Yjs 协同编辑服务`)
  if (isProduction) {
    logger.log(`   WS     ws://${localIp}:${PORT} - Yjs 协同编辑服务（网络）`)
  }
  logger.log(`=================================\n`)
}

bootstrap()
