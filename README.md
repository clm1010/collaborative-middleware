# Collaborative Middleware

基于 NestJS 的协同编辑中间件，专注于提供 WebSocket 实时协同编辑服务。

> **v2.0 架构重构说明**
>
> 本项目已重构为纯 WebSocket 协同编辑服务。HTTP API（演训方案、模板管理、文档操作等）已迁移到 yd-admin 前端直接调用 Java 后端。

## 特性

- 🔌 WebSocket 实时协同编辑（基于 Y.js 协议）
- 📄 文档协同编辑（Tiptap 富文本）
- 📝 Markdown 协同编辑（Milkdown）
- 👥 多人实时协作
- 🔄 自动重连和增量同步
- 💓 心跳检测和连接管理

## 技术栈

- **框架**: NestJS 10.x
- **运行时**: Node.js
- **协同编辑**: Y.js + WebSocket (ws)
- **包管理**: pnpm
- **语言**: TypeScript

## 安装依赖

```bash
pnpm install
```

## 环境配置

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `COLLABORATIVE_MIDDLEWARE_PORT` | 服务端口 | 3001 |
| `CORS_ORIGIN` | CORS 允许的来源 | * |
| `NODE_ENV` | 运行环境 | development |

### 配置示例

```bash
# .env
COLLABORATIVE_MIDDLEWARE_PORT=3001
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
NODE_ENV=development
```

## 启动服务

### 开发模式（热重载）

```bash
pnpm start:dev
```

### 生产模式

```bash
pnpm build
pnpm start:prod
```

## WebSocket 协同编辑服务

### 服务端点

| 路径 | 说明 |
|------|------|
| `ws://host:port/collaboration/{docId}` | 文档协同编辑 |
| `ws://host:port/markdown/{docId}` | Markdown 协同编辑 |

### 连接参数

| 参数 | 说明 | 必填 |
|------|------|------|
| `userId` | 用户唯一标识 | 是 |
| `userName` | 用户显示名称 | 否 |
| `userColor` | 用户光标颜色 | 否 |

### 连接示例

```javascript
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

const ydoc = new Y.Doc()
const provider = new WebsocketProvider(
  'ws://localhost:3001/collaboration',
  'document-id',
  ydoc,
  {
    params: {
      userId: '123',
      userName: '用户名',
      userColor: '#409EFF'
    }
  }
)

// 获取共享类型
const ytext = ydoc.getText('content')

// 监听变化
ytext.observe((event) => {
  console.log('文档更新:', ytext.toString())
})
```

### 协议说明

本服务使用 Y.js 的 WebSocket 协议，支持：
- **Sync Protocol**: 文档状态同步
- **Awareness Protocol**: 用户感知（光标位置、选区等）
- **自动重连**: 断线自动重连
- **增量更新**: 只传输变更内容

## 项目结构

```
collaborative-middleware/
├── src/
│   ├── collaboration/              # 文档协同编辑模块
│   │   ├── collaboration.gateway.ts    # WebSocket 网关
│   │   ├── collaboration.module.ts     # 模块定义
│   │   └── ws.adapter.ts               # 自定义适配器
│   ├── markdown-collaboration/     # Markdown 协同编辑模块
│   │   ├── markdown-collaboration.gateway.ts
│   │   └── markdown-collaboration.module.ts
│   ├── app.module.ts               # 根模块
│   └── main.ts                     # 入口文件
├── package.json
├── tsconfig.json
└── README.md
```

## 部署

### Docker 部署

```bash
docker build -t collaborative-middleware .
docker run -p 3001:3001 collaborative-middleware
```

### PM2 部署

```bash
pnpm build
pm2 start dist/main.js --name collaborative-middleware
```

## 架构说明

### 重构后架构

```
┌─────────────────────────────────────────────────────────────┐
│                      yd-admin 前端                          │
├─────────────────────────────┬───────────────────────────────┤
│         HTTP 请求           │        WebSocket 连接          │
│                             │                               │
│  ┌───────────────────────┐  │  ┌─────────────────────────┐  │
│  │     Java 后端         │  │  │ collaborative-middleware│  │
│  │                       │  │  │                         │  │
│  │  - 演训方案 API       │  │  │  - /collaboration       │  │
│  │  - 模板管理 API       │  │  │  - /markdown            │  │
│  │  - 文件上传/下载      │  │  │                         │  │
│  │  - 权限校验           │  │  │  Y.js 协同编辑协议      │  │
│  └───────────────────────┘  │  └─────────────────────────┘  │
└─────────────────────────────┴───────────────────────────────┘
```

### 已迁移到前端的功能

| 原模块 | 迁移位置 |
|--------|----------|
| PerformanceModule | `yd-admin/src/api/training/performance/` |
| TemplateModule | `yd-admin/src/api/template/management/` |
| DocumentModule | `yd-admin/src/views/training/document/api/` |
| MarkdownModule | `yd-admin/src/views/template/editor/api/` |
| UsersModule | 相关接口已分散到各 API 文件 |

## 常见问题

### 1. WebSocket 连接失败

- 确认服务器已启动
- 检查防火墙设置
- 确认使用正确的 WebSocket 协议（ws:// 或 wss://）
- 检查 CORS 配置

### 2. 同一用户重复连接

服务会自动踢掉同一文档中同一用户的旧连接，保证每个用户只有一个活跃连接。

### 3. 心跳超时

默认心跳间隔为 30 秒，如果连续两次心跳无响应，连接将被自动清理。

## License

ISC

## 相关链接

- [NestJS 官方文档](https://nestjs.com/)
- [Y.js 文档](https://docs.yjs.dev/)
- [y-websocket 文档](https://github.com/yjs/y-websocket)
- [Tiptap 文档](https://tiptap.dev/)
- [Milkdown 文档](https://milkdown.dev/)
