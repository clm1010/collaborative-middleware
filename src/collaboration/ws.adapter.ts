import { WebSocketAdapter, INestApplicationContext } from '@nestjs/common'
import { MessageMappingProperties } from '@nestjs/websockets'
import { Observable, EMPTY } from 'rxjs'
import * as WebSocket from 'ws'

/**
 * 自定义 WebSocket 适配器，用于支持原生 WebSocket（非 Socket.io）
 * 
 * 注意：此适配器专为 Yjs 协议设计，不处理 JSON 消息
 * CollaborationGateway 直接处理原始二进制数据（Uint8Array）
 */
export class WsAdapter implements WebSocketAdapter {
  constructor(private app: INestApplicationContext) {}

  create(port: number, options: any = {}): any {
    const wss = new WebSocket.Server({ noServer: true, ...options })
    return wss
  }

  bindClientConnect(server: WebSocket.Server, callback: (client: WebSocket, ...args: any[]) => void) {
    // 获取底层 HTTP 服务器
    const httpServer = (this.app as any).getHttpServer()

    // 处理 WebSocket 升级请求
    httpServer.on('upgrade', (request: any, socket: any, head: any) => {
      server.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        server.emit('connection', ws, request)
      })
    })

    server.on('connection', callback)
  }

  bindMessageHandlers(
    client: WebSocket,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>,
  ) {
    // 不处理消息，因为 CollaborationGateway 直接处理原始二进制数据
    // Yjs 协议使用二进制格式，不是 JSON
  }

  bindMessageHandler(
    buffer: any,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>,
  ): Observable<any> {
    // 不处理消息，因为 CollaborationGateway 直接处理原始二进制数据
    return EMPTY
  }

  close(server: WebSocket.Server) {
    server.close()
  }
}

