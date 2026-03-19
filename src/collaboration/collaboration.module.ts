import { Module } from '@nestjs/common'
import { CollaborationGateway } from './collaboration.gateway'
import { CollaborationController } from './collaboration.controller'

@Module({
  controllers: [CollaborationController],
  providers: [CollaborationGateway],
})
export class CollaborationModule {}

