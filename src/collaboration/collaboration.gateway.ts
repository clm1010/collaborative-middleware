import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets'
import { Logger, OnModuleDestroy } from '@nestjs/common'
import * as WebSocket from 'ws'
import * as Y from 'yjs'
import { Server } from 'ws'
import { LeveldbPersistence } from 'y-leveldb'

// Y.js WebSocket 消息类型
const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

/**
 * WebSocket 协同编辑网关
 */
@WebSocketGateway({
  transports: ['websocket'],
  path: '/collaboration'
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(CollaborationGateway.name)

  // Y.Doc LevelDB 持久化（中间件重启后自动恢复文档状态）
  private persistence = new LeveldbPersistence('./yjs-data/collaboration')

  private docs = new Map<string, Y.Doc>()
  private docCleanupTimers = new Map<string, NodeJS.Timeout>()
  private docConnections = new Map<string, Set<any>>()
  private heartbeatInterval: NodeJS.Timeout | null = null
  // 心跳间隔 (3秒，局域网环境足够安全，可更快检测死连接)
  private readonly HEARTBEAT_INTERVAL = 3000

  /**
   * 启动心跳检测
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) return

    this.heartbeatInterval = setInterval(() => {
      this.docConnections.forEach((connections, docName) => {
        const deadConnections: any[] = []

        connections.forEach((client) => {
          if (client.isAlive === false) {
            deadConnections.push(client)
            return
          }

          client.isAlive = false
          try {
            client.ping()
          } catch (e) {
            deadConnections.push(client)
          }
        })

        deadConnections.forEach((client) => {
          this.logger.warn(`💀 心跳超时，清理连接: ${docName} (${client.userInfo?.name || '未知用户'})`)
          this.cleanupConnection(client)
          try {
            client.terminate()
          } catch (e) {}
        })
      })
    }, this.HEARTBEAT_INTERVAL)

    this.logger.log('💓 心跳检测已启动')
  }

  /**
   * 模块销毁时清理资源
   */
  onModuleDestroy() {
    this.logger.log('🛑 模块销毁，开始清理资源...')

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      this.logger.log('💔 心跳定时器已清理')
    }

    this.docCleanupTimers.forEach((timer, docName) => {
      clearTimeout(timer)
      this.logger.log(`🗑️ 取消文档清理定时器: ${docName}`)
    })
    this.docCleanupTimers.clear()

    this.docs.forEach((doc, docName) => {
      try {
        doc.destroy()
        this.logger.log(`📄 销毁文档: ${docName}`)
      } catch (e) {
        this.logger.warn(`销毁文档失败: ${docName} - ${e.message}`)
      }
    })
    this.docs.clear()

    this.docConnections.forEach((connections, _docName) => {
      connections.forEach((client) => {
        try {
          client.close(1001, 'Server shutting down')
        } catch (e) {}
      })
    })
    this.docConnections.clear()

    this.logger.log('✅ 资源清理完成')
  }

  /**
   * 清理连接
   */
  private cleanupConnection(client: any) {
    const docName = client.docName
    const awarenessClientId = client.awarenessClientId

    if (!docName) return

    const connections = this.docConnections.get(docName)
    if (connections) {
      connections.delete(client)
      this.logger.log(`📊 文档 ${docName} 当前连接数: ${connections.size}`)

      // 广播 awareness 移除消息
      if (awarenessClientId !== undefined && connections.size > 0) {
        this.broadcastAwarenessRemove(docName, awarenessClientId, connections)
      }

      // 如果没有连接了，5分钟后清理文档
      if (connections.size === 0) {
        this.logger.log(`📊 文档 ${docName} 暂无连接`)
        
        const existingTimer = this.docCleanupTimers.get(docName)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }
        
        const cleanupTimer = setTimeout(async () => {
          const currentConnections = this.docConnections.get(docName)
          if (!currentConnections || currentConnections.size === 0) {
            // 先压缩 LevelDB 历史（将所有增量 update 合并为一条快照，减小磁盘占用）
            try {
              await this.persistence.flushDocument(docName)
              this.logger.log(`📦 LevelDB 压缩完成: ${docName}`)
            } catch (e) {
              this.logger.warn(`LevelDB 压缩失败: ${docName} - ${e.message}`)
            }
            // 销毁 Y.Doc 并移除事件监听器
            const doc = this.docs.get(docName)
            if (doc) {
              doc.destroy()
            }
            this.docs.delete(docName)
            this.docConnections.delete(docName)
            this.docCleanupTimers.delete(docName)
            this.logger.log(`🗑️  清理文档: ${docName}`)
          }
        }, 2 * 60 * 1000)
        
        this.docCleanupTimers.set(docName, cleanupTimer)
      } else {
        const existingTimer = this.docCleanupTimers.get(docName)
        if (existingTimer) {
          clearTimeout(existingTimer)
          this.docCleanupTimers.delete(docName)
        }
      }
    }

    // 移除该连接上的所有 message 监听器，防止关闭握手期间残留 awareness 消息转发
    try {
      client.removeAllListeners('message')
    } catch (e) {}
  }

  /**
   * 广播 awareness 移除消息
   * 通知其他客户端某个用户已离线
   * 
   * 格式参考 y-protocols awareness 协议:
   * - MESSAGE_AWARENESS (1 byte)
   * - awareness update data:
   *   - clients length (varuint)
   *   - for each client:
   *     - clientId (varuint)
   *     - clock (varuint) 
   *     - state JSON string length + content
   */
  private broadcastAwarenessRemove(docName: string, clientId: number, connections: Set<any>) {
    try {
      // 构造符合 y-protocols awareness 协议的移除消息
      const encoder = this.createEncoder()
      this.writeVarUint(encoder, MESSAGE_AWARENESS)

      this.writeVarUint(encoder, 1)
      this.writeVarUint(encoder, clientId)
      // 写入 clock（使用最大安全值，确保覆盖客户端的任何旧状态）
      this.writeVarUint(encoder, 0xFFFFFFFF)

      // 关键修复：使用 TextEncoder 进行正确的 UTF-8 编码
      const nullJson = JSON.stringify(null) // "null"
      const nullBytes = new TextEncoder().encode(nullJson)
      this.writeVarUint(encoder, nullBytes.length)
      for (let i = 0; i < nullBytes.length; i++) {
        encoder.data.push(nullBytes[i])
      }

      const message = this.toUint8Array(encoder)

      let sentCount = 0
      connections.forEach((conn) => {
        if (conn.readyState === WebSocket.OPEN) {
          try {
            conn.send(message)
            sentCount++
          } catch (sendErr) {
            this.logger.warn(`发送 awareness 移除消息失败: ${sendErr.message}`)
          }
        }
      })

      this.logger.log(`📢 广播用户离线: clientId=${clientId}, 已发送给 ${sentCount} 个连接`)
    } catch (e) {
      this.logger.error(`广播 awareness 移除失败: ${e.message}`)
    }
  }

  /**
   * 获取或创建文档（异步：需要从 LevelDB 恢复持久化数据）
   */
  private async getYDoc(docName: string): Promise<Y.Doc> {
    let doc = this.docs.get(docName)
    if (!doc) {
      doc = new Y.Doc()
      doc['name'] = docName

      // 从 LevelDB 恢复已持久化的文档状态（中间件重启后自动恢复）
      try {
        const persistedDoc = await this.persistence.getYDoc(docName)
        const persistedUpdate = Y.encodeStateAsUpdate(persistedDoc)
        Y.applyUpdate(doc, persistedUpdate)
        persistedDoc.destroy()
        this.logger.log(`📂 从 LevelDB 恢复文档: ${docName}`)
      } catch (e) {
        this.logger.warn(`LevelDB 恢复失败（首次创建？）: ${docName} - ${e.message}`)
      }

      // 写入初始化元数据，避免首次同步为空更新
      doc.getMap('meta').set('createdAt', Date.now())

      // 监听文档更新：实时持久化到 LevelDB + 广播给所有连接
      doc.on('update', (update: Uint8Array, origin: any) => {
        this.persistence.storeUpdate(docName, update).catch((e) => {
          this.logger.error(`LevelDB 持久化失败: ${docName} - ${e.message}`)
        })

        const connections = this.docConnections.get(docName)
        if (connections) {
          const encoder = this.createEncoder()
          this.writeVarUint(encoder, MESSAGE_SYNC)
          this.writeVarUint(encoder, 2) // sync step 2 = update
          this.writeVarUint8Array(encoder, update)
          const message = this.toUint8Array(encoder)

          connections.forEach((conn) => {
            if (conn !== origin && conn.readyState === WebSocket.OPEN) {
              conn.send(message)
            }
          })
        }
      })

      this.docs.set(docName, doc)
      this.logger.log(`📄 创建新文档: ${docName}`)
    }
    return doc
  }

  /**
   * 处理连接
   */
  async handleConnection(client: any, ...args: any[]) {
    try {
      const request = args[0]

      const url = new URL(request.url, `http://${request.headers.host}`)
      let docName = url.pathname.replace(/^\/collaboration\/?/, '') || 'default'
      docName = docName.split('/').filter(Boolean)[0] || 'default'

      // 获取用户信息（包含设备ID + 标签页ID，支持同一用户多标签页/多设备共存）
      const userInfo = {
        id: url.searchParams.get('userId') || String(Date.now()),
        name: decodeURIComponent(url.searchParams.get('userName') || '匿名用户'),
        color: url.searchParams.get('userColor') || '#409EFF',
        deviceId: url.searchParams.get('deviceId') || '', // 设备唯一标识（localStorage，同一浏览器共享）
        tabId: url.searchParams.get('tabId') || '',       // 标签页唯一标识（sessionStorage，每个标签页独立）
      }

      this.logger.log(`✅ WebSocket 连接: ${docName}`)
      this.logger.log(`   用户: ${userInfo.name} (${userInfo.id})`)
      this.logger.log(`   设备ID: ${userInfo.deviceId || '未提供'}, 标签页ID: ${userInfo.tabId || '未提供'}`)

      const doc = await this.getYDoc(docName)

      if (!this.docConnections.has(docName)) {
        this.docConnections.set(docName, new Set())
      }
      const connections = this.docConnections.get(docName)

      // Google Docs 模式：允许同一用户多连接共存（多标签页、多设备）
      // 不踢旧连接，前端按 userId 去重只显示 1 个用户
      client.docName = docName
      client.userInfo = userInfo
      client.isAlive = true
      connections.add(client)

      client.on('message', (message: Buffer) => {
        this.handleMessage(client, doc, message)
      })

      client.on('close', () => {
        this.logger.log(`🔌 连接关闭: ${docName} (${userInfo.name})`)
        this.cleanupConnection(client)
      })

      client.on('error', (error: Error) => {
        this.logger.error(`❗ 连接错误: ${docName} (${userInfo.name}) - ${error.message}`)
        this.cleanupConnection(client)
      })

      client.on('pong', () => {
        client.isAlive = true
      })

      this.startHeartbeat()

      this.logger.log(`📊 当前文档 ${docName} 的连接数: ${connections.size}`)
    } catch (error) {
      this.logger.error(`连接处理错误: ${error.message}`)
    }
  }

  /**
   * 处理断开连接
   */
  handleDisconnect(client: any) {
    const docName = client.docName
    const userInfo = client.userInfo

    if (!docName) return

    this.logger.log(`❌ WebSocket 断开: ${docName} (${userInfo?.name || '未知用户'})`)
    this.cleanupConnection(client)
  }

  /**
   * 处理同步消息
   */
  private handleMessage(ws: any, doc: Y.Doc, message: Buffer) {
    try {
      // 防御性校验：如果该连接已被 cleanupConnection 移除，忽略后续消息
      const connections = this.docConnections.get(ws.docName)
      if (!connections || !connections.has(ws)) {
        return
      }

      const data = new Uint8Array(message)
      const decoder = this.createDecoder(data)
      const messageType = this.readVarUint(decoder)

      switch (messageType) {
        case MESSAGE_SYNC: {
          const syncType = this.readVarUint(decoder)

          if (syncType === 0) {
            // Sync step 1: 客户端请求文档状态向量
            const stateVector = this.readVarUint8Array(decoder)

            // 发送 sync step 2: 返回差异更新
            const update = Y.encodeStateAsUpdate(doc, stateVector)
            const encoder = this.createEncoder()
            this.writeVarUint(encoder, MESSAGE_SYNC)
            this.writeVarUint(encoder, 2) // sync step 2
            this.writeVarUint8Array(encoder, update)
            ws.send(this.toUint8Array(encoder))

            // 注意：不要在这里发送 sync step 1 给客户端
            // 这会导致无限循环的同步请求
            // 客户端收到 sync step 2 后会自己判断是否需要发送更新
          } else if (syncType === 1) {
            // Sync step 1 from server (客户端不应该收到这个，这里是服务端收到客户端的 state vector 请求)
            const stateVector = this.readVarUint8Array(decoder)
            const update = Y.encodeStateAsUpdate(doc, stateVector)
            if (update.length > 2) {
              const encoder = this.createEncoder()
              this.writeVarUint(encoder, MESSAGE_SYNC)
              this.writeVarUint(encoder, 2)
              this.writeVarUint8Array(encoder, update)
              ws.send(this.toUint8Array(encoder))
            }
          } else if (syncType === 2) {
            const update = this.readVarUint8Array(decoder)
            Y.applyUpdate(doc, update, ws)
          }
          break
        }

        case MESSAGE_AWARENESS: {
          // 解析 awareness 消息，提取客户端 ID
          try {
            const numClients = this.readVarUint(decoder)
            if (numClients > 0) {
              const clientId = this.readVarUint(decoder)
              if (ws.awarenessClientId === undefined) {
                ws.awarenessClientId = clientId
                this.logger.log(`📝 记录 awareness clientId: ${clientId} (${ws.userInfo?.name})`)
              }
            }
          } catch (e) {}

          const connections = this.docConnections.get(ws.docName)
          if (connections) {
            connections.forEach((conn) => {
              if (conn !== ws && conn.readyState === WebSocket.OPEN) {
                conn.send(data)
              }
            })
          }
          break
        }
      }
    } catch (e) {
      this.logger.error(`处理消息出错: ${e.message}`)
    }
  }

  private createEncoder() {
    return { data: [] as number[] }
  }

  private writeVarUint(encoder: { data: number[] }, num: number) {
    while (num > 127) {
      encoder.data.push((num & 127) | 128)
      num = Math.floor(num / 128)
    }
    encoder.data.push(num & 127)
  }

  private writeVarUint8Array(encoder: { data: number[] }, arr: Uint8Array) {
    this.writeVarUint(encoder, arr.length)
    for (let i = 0; i < arr.length; i++) {
      encoder.data.push(arr[i])
    }
  }

  private toUint8Array(encoder: { data: number[] }): Uint8Array {
    return new Uint8Array(encoder.data)
  }

  private createDecoder(data: Uint8Array) {
    return { data, pos: 0 }
  }

  private readVarUint(decoder: { data: Uint8Array; pos: number }): number {
    let num = 0
    let mult = 1
    while (decoder.pos < decoder.data.length) {
      const byte = decoder.data[decoder.pos++]
      num += (byte & 127) * mult
      if (byte < 128) break
      mult *= 128
    }
    return num
  }

  private readVarUint8Array(decoder: { data: Uint8Array; pos: number }): Uint8Array {
    const len = this.readVarUint(decoder)
    const arr = decoder.data.slice(decoder.pos, decoder.pos + len)
    decoder.pos += len
    return arr
  }
}
