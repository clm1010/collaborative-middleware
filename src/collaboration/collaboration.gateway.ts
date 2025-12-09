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
@WebSocketGateway({ transports: ['websocket'] })
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
      const userKey = `${docName}:${userInfo.id}`
      if (this.userConnections.get(userKey) === client) {
        this.userConnections.delete(userKey)
      }
    }
  }

  /**
   * 广播 awareness 移除消息
   * 通知其他客户端某个用户已离线
   */
  private broadcastAwarenessRemove(docName: string, clientId: number, connections: Set<any>) {
    try {
      // 构造 awareness 移除消息
      // 格式: [MESSAGE_AWARENESS, length, clientId, clock, "null"]
      const encoder = this.createEncoder()
      this.writeVarUint(encoder, MESSAGE_AWARENESS)

      // awareness 更新数据
      const awarenessEncoder = this.createEncoder()
      this.writeVarUint(awarenessEncoder, 1) // 1 个客户端更新
      this.writeVarUint(awarenessEncoder, clientId) // 客户端 ID
      this.writeVarUint(awarenessEncoder, 1) // clock (递增值)

      // 写入 "null" 字符串表示删除该客户端的状态
      const nullStr = 'null'
      this.writeVarUint(awarenessEncoder, nullStr.length)
      for (let i = 0; i < nullStr.length; i++) {
        awarenessEncoder.data.push(nullStr.charCodeAt(i))
      }

      // 将 awareness 数据作为数组写入
      const awarenessData = this.toUint8Array(awarenessEncoder)
      for (let i = 0; i < awarenessData.length; i++) {
        encoder.data.push(awarenessData[i])
      }

      const message = this.toUint8Array(encoder)

      // 广播给所有连接
      connections.forEach((conn) => {
        if (conn.readyState === WebSocket.OPEN) {
          conn.send(message)
        }
      })

      this.logger.log(`📢 广播用户离线: clientId=${clientId}`)
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

      // 解析 URL 获取文档名称
      const url = new URL(request.url, `http://${request.headers.host}`)
      const docName = url.pathname.slice(1) || 'default'

      // 获取用户信息
      const userInfo = {
        id: url.searchParams.get('userId') || String(Date.now()),
        name: decodeURIComponent(url.searchParams.get('userName') || '匿名用户'),
        color: url.searchParams.get('userColor') || '#409EFF',
      }

      this.logger.log(`✅ WebSocket 连接: ${docName}`)
      this.logger.log(`   用户: ${userInfo.name} (${userInfo.id})`)

      // 获取或创建文档
      const doc = this.getYDoc(docName)

      // 获取或创建连接集合
      if (!this.docConnections.has(docName)) {
        this.docConnections.set(docName, new Set())
      }
      const connections = this.docConnections.get(docName)

      // 检查同一用户是否已有连接（踢掉旧连接）
      const userKey = `${docName}:${userInfo.id}`
      const existingConnection = this.userConnections.get(userKey)
      if (existingConnection && existingConnection !== client) {
        this.logger.warn(`⚠️ 用户 ${userInfo.name} 重复连接，踢掉旧连接`)
        this.cleanupConnection(existingConnection)
        try {
          existingConnection.close(1000, 'Replaced by new connection')
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

            // 发送 sync step 1: 请求客户端的状态
            const sv = Y.encodeStateVector(doc)
            const encoder2 = this.createEncoder()
            this.writeVarUint(encoder2, MESSAGE_SYNC)
            this.writeVarUint(encoder2, 0) // sync step 1
            this.writeVarUint8Array(encoder2, sv)
            ws.send(this.toUint8Array(encoder2))
          } else if (syncType === 1) {
            // Sync step 2: 接收到状态向量，返回更新
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

