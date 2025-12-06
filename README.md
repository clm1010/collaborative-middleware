# Collaborative Middleware

基于 NestJS 的协同编辑中间件，用于 yd-admin 前端的后端服务，支持演训方案管理和多人实时协同文档编辑。

## 特性

- ✨ 基于 NestJS 框架，模块化设计
- 📋 演训方案管理（CRUD、分页、搜索、过滤）
- 📄 文档协作管理（创建、编辑、保存、删除）
- 🔌 WebSocket 实时协同编辑（基于 Yjs 协议）
- 📎 参考素材管理
- 👥 协作者管理
- 📤 文档导出（HTML、JSON）
- 🔄 CORS 支持

## 技术栈

- **框架**: NestJS 10.x
- **运行时**: Node.js
- **协同编辑**: Yjs + WebSocket (ws)
- **包管理**: pnpm
- **语言**: TypeScript

## 安装依赖

使用 pnpm 安装项目依赖：

```bash
pnpm install
```

## 环境配置

项目支持开发和生产环境的独立配置。

### 环境文件

- `.env.dev` - 开发环境配置
- `.env.prod` - 生产环境配置  
- `env.example` - 环境变量示例文件

### 配置说明

#### 开发环境配置 (.env.dev)

```bash
# 服务端口
COLLABORATIVE_MIDDLEWARE_PORT=3002

# CORS 允许的来源（逗号分隔）
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://localhost:8080

# 文档清理延迟（毫秒）
DOC_CLEANUP_DELAY=300000

# 环境
NODE_ENV=development
```

#### 生产环境配置 (.env.prod)

```bash
# 服务端口
COLLABORATIVE_MIDDLEWARE_PORT=3002

# CORS 允许的来源（逗号分隔）
# ⚠️ 生产环境请配置实际的前端域名
CORS_ORIGIN=http://192.168.8.100:5173,https://your-domain.com

# 文档清理延迟（毫秒）
DOC_CLEANUP_DELAY=600000

# 环境
NODE_ENV=production
```

### 使用环境配置

#### 方式一：使用启动脚本（推荐）

```bash
# 开发环境
./start-dev.sh

# 生产环境
./start-prod.sh
```

#### 方式二：手动配置

**开发环境：**
```bash
cp .env.dev .env
pnpm start:dev
```

**生产环境：**
```bash
cp .env.prod .env
pnpm build
pnpm start:prod
```

#### 方式三：直接使用 npm scripts

```bash
# 开发环境（自动设置 NODE_ENV=development）
pnpm start:dev

# 生产环境（自动设置 NODE_ENV=production）
pnpm build
pnpm start:prod
```

## 启动服务

### 开发模式（热重载）

```bash
pnpm run start:dev
```

### 生产模式

```bash
# 构建
pnpm run build

# 启动
pnpm run start:prod
```

### 普通启动

```bash
pnpm run start
```

## 服务端口

默认端口: **3002**

可以通过环境变量 `COLLABORATIVE_MIDDLEWARE_PORT` 修改端口：

**在 .env 文件中配置：**
```bash
COLLABORATIVE_MIDDLEWARE_PORT=8080
```

**或者直接在命令行中设置：**
```bash
COLLABORATIVE_MIDDLEWARE_PORT=8080 pnpm run start:dev
```

## API 接口

### 演训方案 API

基础路径: `/api/training/performance`

#### 1. 获取演训方案分页数据

- **URL**: `GET /api/training/performance/page`
- **参数**:
  - `pageNo`: 页码（默认 1）
  - `pageSize`: 每页数量（默认 10）
  - `name`: 方案名称（模糊搜索，可选）
  - `status`: 状态（可选：editing, reviewing, published, approved, pending）
  - `docCategory`: 文档分类（可选：1-企图立案, 2-总体方案, 3-作战计划, 4-演训方案, 5-作战文书, 6-导调计划）
  - `fileType`: 左侧文档分类 ID（可选：all, plan, combat, scheme, book, guide, idea, report, summary, notice, announce, result）
  - `drillLevel`: 演训等级（可选：strategy, tactics）
  - `drillTheme`: 演训主题（模糊搜索，可选）
  - `uploadTime`: 上传时间范围（可选：['YYYY-MM-DD', 'YYYY-MM-DD']）

- **示例**:
  ```bash
  GET /api/training/performance/page?pageNo=1&pageSize=10&name=测试&status=editing
  ```

#### 2. 获取文档分类列表

- **URL**: `GET /api/training/performance/categories`

#### 3. 创建演训方案

- **URL**: `POST /api/training/performance/create`
- **Body**:
  ```json
  {
    "name": "方案名称",
    "college": "学院A",
    "docCategory": "总体方案",
    "drillLevel": "战略级",
    "author": "admin",
    "scope": "可编辑",
    "status": "编辑中"
  }
  ```

#### 4. 更新演训方案

- **URL**: `PUT /api/training/performance/update`
- **Body**:
  ```json
  {
    "id": 1,
    "name": "更新的方案名称",
    "status": "发布"
  }
  ```

#### 5. 删除演训方案

- **URL**: `DELETE /api/training/performance/delete`
- **Body**:
  ```json
  {
    "ids": [1, 2, 3]
  }
  ```

#### 6. 导出演训方案

- **URL**: `GET /api/training/performance/export`

---

### 文档协作 API

基础路径: `/api/document`

#### 1. 获取文档详情

- **URL**: `GET /api/document/:id`

#### 2. 保存文档

- **URL**: `POST /api/document/save`
- **Body**:
  ```json
  {
    "id": "document-id",
    "title": "文档标题",
    "content": "<p>文档内容</p>"
  }
  ```

#### 3. 删除文档

- **URL**: `DELETE /api/document/:id`

#### 4. 获取文档列表

- **URL**: `GET /api/document/list/all`

#### 5. 获取参考素材

- **URL**: `GET /api/document/:id/materials`

#### 6. 添加参考素材

- **URL**: `POST /api/document/:id/materials`
- **Body**:
  ```json
  {
    "title": "素材标题",
    "content": "<p>素材内容</p>",
    "author": "作者"
  }
  ```

#### 7. 删除参考素材

- **URL**: `DELETE /api/document/:docId/materials/:materialId`

#### 8. 获取协作者列表

- **URL**: `GET /api/document/:id/collaborators`

#### 9. 添加协作者

- **URL**: `POST /api/document/:id/collaborators`
- **Body**:
  ```json
  {
    "userId": 123,
    "nickname": "用户名",
    "avatar": "头像URL",
    "role": "editor"
  }
  ```

#### 10. 移除协作者

- **URL**: `DELETE /api/document/:docId/collaborators/:userId`

#### 11. 导出 HTML

- **URL**: `POST /api/document/export/html`
- **Body**:
  ```json
  {
    "title": "文档标题",
    "content": "<p>文档内容</p>"
  }
  ```

#### 12. 导出 JSON

- **URL**: `POST /api/document/export/json`
- **Body**:
  ```json
  {
    "id": "document-id",
    "title": "文档标题",
    "content": "<p>文档内容</p>"
  }
  ```

---

## WebSocket 协同编辑服务

### 连接地址

```
ws://localhost:3001
```

### 使用方法

前端连接示例（使用 y-websocket）：

```javascript
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

const ydoc = new Y.Doc()
const provider = new WebsocketProvider(
  'ws://localhost:3001', 
  'document-id',  // 文档 ID
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

### WebSocket 协议

本服务使用 Yjs 的 WebSocket 协议，支持：
- 文档状态同步（Sync Protocol）
- 用户感知（Awareness Protocol）
- 自动重连和增量更新

---

## 项目结构

```
collaborative-middleware/
├── src/
│   ├── collaboration/          # WebSocket 协同编辑模块
│   │   ├── collaboration.gateway.ts
│   │   ├── collaboration.module.ts
│   │   └── ws.adapter.ts       # 自定义 WebSocket 适配器
│   ├── document/               # 文档管理模块
│   │   ├── document.controller.ts
│   │   ├── document.service.ts
│   │   └── document.module.ts
│   ├── performance/            # 演训方案模块
│   │   ├── performance.controller.ts
│   │   ├── performance.service.ts
│   │   └── performance.module.ts
│   ├── common/                 # 公共模块
│   │   └── response.interface.ts
│   ├── app.module.ts           # 根模块
│   └── main.ts                 # 入口文件
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

## 配置

### TypeScript 配置

项目使用 TypeScript 5.3+，配置文件为 `tsconfig.json`

### ESLint 和 Prettier

- ESLint 配置: `.eslintrc.js`
- Prettier 配置: `.prettierrc`

运行 lint:

```bash
pnpm run lint
```

格式化代码:

```bash
pnpm run format
```

## 开发说明

### 添加新模块

```bash
# 使用 NestJS CLI 生成模块
nest generate module module-name
nest generate controller module-name
nest generate service module-name
```

### 数据存储

当前版本使用内存存储（Map），适合开发和测试。生产环境建议接入数据库（如 MongoDB、PostgreSQL）。

### CORS 配置

CORS 已在 `main.ts` 中全局启用，允许所有来源。生产环境请根据需要限制来源：

```typescript
app.enableCors({
  origin: ['http://localhost:5173', 'http://your-domain.com'],
  credentials: true,
})
```

## 部署

### Docker 部署

创建 `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm run build

EXPOSE 3001

CMD ["pnpm", "run", "start:prod"]
```

构建和运行:

```bash
docker build -t collaborative-middleware .
docker run -p 3001:3001 collaborative-middleware
```

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 构建项目
pnpm run build

# 启动服务
pm2 start dist/main.js --name collaborative-middleware

# 查看日志
pm2 logs collaborative-middleware

# 重启服务
pm2 restart collaborative-middleware
```

## 测试

```bash
# 单元测试
pnpm run test

# e2e 测试
pnpm run test:e2e

# 测试覆盖率
pnpm run test:cov
```

## 常见问题

### 1. WebSocket 连接失败

- 确认服务器已启动
- 检查防火墙设置
- 确认使用正确的 WebSocket 协议（ws:// 或 wss://）

### 2. CORS 错误

- 检查 `main.ts` 中的 CORS 配置
- 确认前端请求的域名在允许列表中

### 3. 端口被占用

- 修改 `PORT` 环境变量
- 或在代码中修改默认端口

## License

ISC

## 相关链接

- [NestJS 官方文档](https://nestjs.com/)
- [Yjs 文档](https://docs.yjs.dev/)
- [y-websocket 文档](https://github.com/yjs/y-websocket)

