import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { WsAdapter } from './collaboration/ws.adapter'
import { networkInterfaces } from 'os'

/**
 * 协同编辑中间件启动入口
 *
 * 重构后仅提供 WebSocket 协同编辑服务：
 * - /collaboration - 文档协同编辑 (Y.js)
 * - /markdown - Markdown 协同编辑 (Y.js)
 *
 * HTTP API 已迁移到 yd-admin 前端直接调用 Java 后端
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useWebSocketAdapter(new WsAdapter(app))
  const logger = new Logger('Bootstrap')

  const NODE_ENV = process.env.NODE_ENV || 'development'
  const isProduction = NODE_ENV === 'production'

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : '*'

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true
  })

  const PORT = process.env.COLLABORATIVE_MIDDLEWARE_PORT || 3001
  // 监听 0.0.0.0 允许外部访问（局域网内其他电脑）
  await app.listen(PORT, '0.0.0.0')

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
  logger.log(`🚀 协同编辑中间件已启动！`)
  logger.log(`📊 环境: ${NODE_ENV}`)
  logger.log(`📡 本地地址: http://localhost:${PORT}`)
  logger.log(`📡 网络地址: http://${localIp}:${PORT}`)
  logger.log(`🔗 CORS配置: ${corsOrigin === '*' ? '允许所有来源' : corsOrigin}`)
  logger.log(`\n🔌 WebSocket 协同编辑服务:`)
  logger.log(`   WS /collaboration - 文档协同编辑 (Y.js + Tiptap)`)
  logger.log(`   WS /markdown      - Markdown 协同编辑 (Y.js + Milkdown)`)
  logger.log(`\n📍 连接示例:`)
  logger.log(`   本地: ws://localhost:${PORT}/collaboration/{docId}`)
  logger.log(`   网络: ws://${localIp}:${PORT}/collaboration/{docId}`)
  logger.log(`=================================\n`)
}

bootstrap()
