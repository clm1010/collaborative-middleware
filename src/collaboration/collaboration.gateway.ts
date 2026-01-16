import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import * as WebSocket from 'ws'
import * as Y from 'yjs'
import { Server } from 'ws'

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
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(CollaborationGateway.name)

  // 存储每个文档的 Y.Doc 实例
  private docs = new Map<string, Y.Doc>()
  // 存储每个文档的连接
  private docConnections = new Map<string, Set<any>>()
  // 存储用户ID到连接的映射（用于踢掉同一用户的旧连接）
  private userConnections = new Map<string, any>()
  // 心跳检测定时器
  private heartbeatInterval: NodeJS.Timeout | null = null
  // 心跳间隔 (30秒)
  private readonly HEARTBEAT_INTERVAL = 30000

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
            // 连接已死，标记为待清理
            deadConnections.push(client)
            return
          }

          // 标记为未响应，等待下次 pong
          client.isAlive = false
          try {
            client.ping()
          } catch (e) {
            deadConnections.push(client)
          }
        })

        // 清理死连接
        deadConnections.forEach((client) => {
          this.logger.warn(`💀 心跳超时，清理连接: ${docName} (${client.userInfo?.name || '未知用户'})`)
          this.cleanupConnection(client)
          try {
            client.terminate()
          } catch (e) {
            // 忽略
          }
        })
      })
    }, this.HEARTBEAT_INTERVAL)

    this.logger.log('💓 心跳检测已启动')
  }

  /**
   * 清理连接
   */
  private cleanupConnection(client: any) {
    const docName = client.docName
    const userInfo = client.userInfo
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
        setTimeout(() => {
          const currentConnections = this.docConnections.get(docName)
          if (!currentConnections || currentConnections.size === 0) {
            this.docs.delete(docName)
            this.docConnections.delete(docName)
            this.logger.log(`🗑️  清理文档: ${docName}`)
          }
        }, 5 * 60 * 1000)
      }
    }

    // 从用户连接映射中移除
    if (userInfo?.id) {
      // 使用与 handleConnection 相同的 key 生成逻辑
      const userKey = userInfo.deviceId
        ? `${docName}:${userInfo.id}:${userInfo.deviceId}`
        : `${docName}:${userInfo.id}`
      if (this.userConnections.get(userKey) === client) {
        this.userConnections.delete(userKey)
        this.logger.log(`🔑 移除用户连接映射: ${userKey}`)
      }
    }
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
      // 构造 awareness 移除消息
      const encoder = this.createEncoder()
      this.writeVarUint(encoder, MESSAGE_AWARENESS)

      // 写入客户端数量 (1个)
      this.writeVarUint(encoder, 1)
      // 写入客户端 ID
      this.writeVarUint(encoder, clientId)
      // 写入 clock (使用较大的值确保覆盖旧状态)
      this.writeVarUint(encoder, Date.now() % 0xFFFFFFFF)

      // 写入 "null" 字符串表示删除该客户端的状态
      // y-protocols 使用 JSON 字符串，null 表示删除
      const nullStr = 'null'
      this.writeVarUint(encoder, nullStr.length)
      for (let i = 0; i < nullStr.length; i++) {
        encoder.data.push(nullStr.charCodeAt(i))
      }

      const message = this.toUint8Array(encoder)

      // 广播给所有连接
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
   * 获取或创建文档
   */
  private getYDoc(docName: string): Y.Doc {
    let doc = this.docs.get(docName)
    if (!doc) {
      doc = new Y.Doc()
      doc['name'] = docName

      // 监听文档更新，广播给所有连接
      doc.on('update', (update: Uint8Array, origin: any) => {
        const connections = this.docConnections.get(docName)
        if (connections) {
          // 编码更新消息
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
  handleConnection(client: any, ...args: any[]) {
    try {
      const request = args[0]

      // 解析 URL 获取文档名称，去掉 /collaboration 前缀
      const url = new URL(request.url, `http://${request.headers.host}`)
      let docName = url.pathname.replace(/^\/collaboration\/?/, '') || 'default'
      docName = docName.split('/').filter(Boolean)[0] || 'default'

      // 获取用户信息（包含设备ID，支持同一用户多设备连接）
      const userInfo = {
        id: url.searchParams.get('userId') || String(Date.now()),
        name: decodeURIComponent(url.searchParams.get('userName') || '匿名用户'),
        color: url.searchParams.get('userColor') || '#409EFF',
        deviceId: url.searchParams.get('deviceId') || '', // 设备唯一标识
      }

      this.logger.log(`✅ WebSocket 连接: ${docName}`)
      this.logger.log(`   用户: ${userInfo.name} (${userInfo.id})`)
      this.logger.log(`   设备ID: ${userInfo.deviceId || '未提供'}`)

      // 获取或创建文档
      const doc = this.getYDoc(docName)

      // 获取或创建连接集合
      if (!this.docConnections.has(docName)) {
        this.docConnections.set(docName, new Set())
      }
      const connections = this.docConnections.get(docName)

      // 检查同一用户+同一设备是否已有连接（踢掉旧连接）
      // 使用 userId + deviceId 作为唯一标识，允许同一用户在不同设备上同时连接
      const userKey = userInfo.deviceId
        ? `${docName}:${userInfo.id}:${userInfo.deviceId}`
        : `${docName}:${userInfo.id}` // 兼容未提供 deviceId 的旧客户端
      const existingConnection = this.userConnections.get(userKey)
      if (existingConnection && existingConnection !== client) {
        this.logger.warn(`⚠️ 用户 ${userInfo.name} 在同一设备重复连接，踢掉旧连接 (key: ${userKey})`)
        this.cleanupConnection(existingConnection)
        try {
          existingConnection.close(1000, 'Replaced by new connection from same device')
        } catch (e) {
          try {
            existingConnection.terminate()
          } catch (e2) {
            // 忽略
          }
        }
      }

      client.docName = docName
      client.userInfo = userInfo
      client.isAlive = true

      // 添加到连接集合
      connections.add(client)
      // 记录用户连接映射
      this.userConnections.set(userKey, client)

      // 处理消息
      client.on('message', (message: Buffer) => {
        this.handleMessage(client, doc, message)
      })

      // 监听连接关闭
      client.on('close', () => {
        this.logger.log(`🔌 连接关闭: ${docName} (${userInfo.name})`)
        this.cleanupConnection(client)
      })

      // 监听连接错误
      client.on('error', (error: Error) => {
        this.logger.error(`❗ 连接错误: ${docName} (${userInfo.name}) - ${error.message}`)
        this.cleanupConnection(client)
      })

      // 心跳响应
      client.on('pong', () => {
        client.isAlive = true
      })

      // 启动心跳检测（首次连接时）
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
            // 返回服务器的状态更新给客户端
            const stateVector = this.readVarUint8Array(decoder)
            const update = Y.encodeStateAsUpdate(doc, stateVector)
            if (update.length > 2) {
              // 有实际更新内容
              const encoder = this.createEncoder()
              this.writeVarUint(encoder, MESSAGE_SYNC)
              this.writeVarUint(encoder, 2)
              this.writeVarUint8Array(encoder, update)
              ws.send(this.toUint8Array(encoder))
            }
          } else if (syncType === 2) {
            // Update: 应用客户端发送的更新
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
              // 记录该连接的 awareness clientId
              if (ws.awarenessClientId === undefined) {
                ws.awarenessClientId = clientId
                this.logger.log(`📝 记录 awareness clientId: ${clientId} (${ws.userInfo?.name})`)
              }
            }
          } catch (e) {
            // 解析失败时忽略
          }

          // Awareness 消息转发给其他客户端
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

  // ==================== 编码解码工具函数 ====================

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

