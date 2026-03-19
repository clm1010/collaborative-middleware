import { Controller, Delete, Param, Logger } from '@nestjs/common'
import { CollaborationGateway } from './collaboration.gateway'

@Controller('collaboration')
export class CollaborationController {
  private readonly logger = new Logger(CollaborationController.name)

  constructor(private readonly gateway: CollaborationGateway) {}

  @Delete('reset/:docId')
  async resetDocument(@Param('docId') docId: string) {
    this.logger.log(`收到文档重置请求: ${docId}`)
    try {
      await this.gateway.resetDocument(docId)
      return { success: true, message: `文档 ${docId} 已重置` }
    } catch (error) {
      this.logger.error(`文档重置失败: ${docId} - ${error.message}`)
      return { success: false, message: error.message }
    }
  }
}
