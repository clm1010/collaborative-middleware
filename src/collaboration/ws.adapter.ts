import { WebSocketAdapter, INestApplicationContext, Logger } from '@nestjs/common'
import { MessageMappingProperties } from '@nestjs/websockets'
import { Observable, EMPTY } from 'rxjs'
import * as WebSocket from 'ws'

// 用于标记 request 是否已被某个网关处理
const WS_UPGRADE_HANDLED = Symbol('__wsUpgradeHandled')

/**
 * 自定义 WebSocket 适配器，用于支持原生 WebSocket（非 Socket.io）
 * 
 * 注意：此适配器专为 Yjs 协议设计，不处理 JSON 消息
 * CollaborationGateway 直接处理原始二进制数据（Uint8Array）
 * 
 * 关键修复：
 * 1. 只传递 ws 库支持的选项，避免无效选项导致 handleUpgrade 回调不执行
 * 2. 使用 Symbol 标记防止多个网关 handler 重复处理同一个 upgrade 请求
 */
export class WsAdapter implements WebSocketAdapter {
  private logger = new Logger('WsAdapter')

  constructor(private app: INestApplicationContext) {}

  create(port: number, options: any = {}): any {
    // 保留网关路径，后续在 upgrade 时进行路由匹配
    const path = options?.path || '/'
    this.logger.log(`创建 WebSocket Server, path=${path}`)
    
    // 只提取 ws 库支持的选项，避免传递无效选项（如 transports）导致问题
    const wsOptions: WebSocket.ServerOptions = {
      noServer: true,
      ...(options.perMessageDeflate !== undefined && { perMessageDeflate: options.perMessageDeflate }),
      ...(options.maxPayload !== undefined && { maxPayload: options.maxPayload }),
      ...(options.clientTracking !== undefined && { clientTracking: options.clientTracking }),
    }
    
    const wss = new WebSocket.Server(wsOptions)
    ;(wss as any).__path = path
    return wss
  }

  bindClientConnect(server: WebSocket.Server, callback: (client: WebSocket, ...args: any[]) => void) {
    const httpServer = (this.app as any).getHttpServer()
    const serverPath: string = (server as any).__path || '/'

    const normalizePath = (path?: string) => {
      if (!path) return '/'
      const trimmed = path.trim()
      if (!trimmed) return '/'
      if (trimmed === '/') return '/'
      return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
    }

    const normalizedServerPath = normalizePath(serverPath)

    httpServer.on('upgrade', (request: any, socket: any, head: any) => {
      // 防止多个网关 handler 重复处理同一个 upgrade 请求
      if (request[WS_UPGRADE_HANDLED]) {
        return
      }

      const { pathname } = new URL(request.url, `http://${request.headers.host}`)
      const normalizedRequestPath = normalizePath(pathname)

      // 仅当路径匹配当前网关时才处理升级
      const isMatch =
        normalizedRequestPath === normalizedServerPath ||
        normalizedRequestPath.startsWith(`${normalizedServerPath}/`)

      if (!isMatch) return

      // 标记该 request 已被处理，阻止其他网关 handler 重复处理
      request[WS_UPGRADE_HANDLED] = true

      server.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        server.emit('connection', ws, request)
      })
    })

    server.on('connection', callback)
  }

  bindMessageHandlers(
    _client: WebSocket,
    _handlers: MessageMappingProperties[],
    _process: (data: any) => Observable<any>,
  ) {
    // 不处理消息，因为 CollaborationGateway 直接处理原始二进制数据
    // Yjs 协议使用二进制格式，不是 JSON
  }

  bindMessageHandler(
    _buffer: any,
    _handlers: MessageMappingProperties[],
    _process: (data: any) => Observable<any>,
  ): Observable<any> {
    // 不处理消息，因为 CollaborationGateway 直接处理原始二进制数据
    return EMPTY
  }

  close(server: WebSocket.Server) {
    server.close()
  }
}
