import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PerformanceModule } from './performance/performance.module'
import { DocumentModule } from './document/document.module'
import { CollaborationModule } from './collaboration/collaboration.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置在整个应用中全局可用
      envFilePath: ['.env', '.env.dev', '.env.prod'], // 按顺序加载环境文件
    }),
    PerformanceModule,
    DocumentModule,
    CollaborationModule,
  ],
})
export class AppModule {}

