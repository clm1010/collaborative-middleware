import { Module } from '@nestjs/common'
import { MarkdownCollaborationGateway } from './markdown-collaboration.gateway'

@Module({
  providers: [MarkdownCollaborationGateway],
  exports: [MarkdownCollaborationGateway],
})
export class MarkdownCollaborationModule {}

