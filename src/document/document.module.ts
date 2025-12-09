import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MulterModule } from '@nestjs/platform-express'
import { DocumentController } from './document.controller'
import { DocumentService } from './document.service'

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 限制文件大小为 50MB
      },
    }),
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}

