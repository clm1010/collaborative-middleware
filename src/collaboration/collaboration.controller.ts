import { Controller, Delete, HttpCode, Param, Logger } from '@nestjs/common'
import { CollaborationGateway } from './collaboration.gateway'

@Controller('collaboration')
export class CollaborationController {
  private readonly logger = new Logger(CollaborationController.name)

  constructor(private readonly gateway: CollaborationGateway) {}

  /**
   * 重置指定文档的协同状态（LevelDB + 内存 Y.Doc + 清理定时器）
   *
   * 响应约定：
   * - 200 { success: true, skipped: false, message }          ：已执行
   * - 200 { success: true, skipped: true, reason, size, ... } ：守门拒绝执行
   * - 200 { success: false, message }                         ：异常
   *
   * 说明：skipped 情况下业务上视为"不变"，故仍返回 200 并携带细节字段，
   *      方便运维/管理端在同一个通道区分"拒绝 vs 成功"。如需严格 HTTP 语义，
   *      改为 409 亦可，但会影响现有调用方的容错处理。
   */
  @Delete('reset/:docId')
  @HttpCode(200)
  async resetDocument(@Param('docId') docId: string) {
    this.logger.log(`收到文档重置请求: ${docId}`)
    try {
      const result = await this.gateway.resetDocument(docId)
      if (result.skipped) {
        this.logger.warn(
          `文档重置被拒绝: ${docId} - reason=${result.reason}, activeConnections=${result.size}`
        )
        return {
          success: true,
          skipped: true,
          reason: result.reason,
          activeConnections: result.size,
          message: `文档 ${docId} 仍有 ${result.size} 个在线连接，跳过重置以保护协同会话`
        }
      }
      return {
        success: true,
        skipped: false,
        message: `文档 ${docId} 已重置`
      }
    } catch (error) {
      this.logger.error(`文档重置失败: ${docId} - ${error.message}`)
      return { success: false, message: error.message }
    }
  }
}
