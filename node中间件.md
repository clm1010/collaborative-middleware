# 中间件打包与部署

目标服务器是 arm64 且**不联网**，所以镜像必须在本机联网环境里完整构建好，导出成
tar 带过去。镜像会把全部依赖和 pm2 打进去，服务器上 `docker load` 之后即可直接运行。

本机是 amd64，构建 arm64 镜像靠 Docker Desktop 的 QEMU 模拟，全程约两分钟。

## 1 首次使用：创建 buildx builder（只需执行一次）

跨平台导出 tar 需要 `docker-container` driver，默认的 `docker` driver 不支持。

```sh
docker buildx create --name multiplatform --driver docker-container --use
```

用 `docker buildx ls` 确认它在列表里。builder 丢了（比如清理过 Docker）就重新执行一次。

## 2 构建并导出镜像

构建和导出一步完成。`--output type=docker,dest=...` 只写文件，**不会**把镜像放进本地
镜像列表，所以构建完 `docker images` 里看不到它是正常的。

```sh
# 建议先备份上一版产物，构建会覆盖它
cp collaborative-middleware.tar collaborative-middleware.tar.bak

# 使用缓存构建（日常使用）
docker buildx build \
  --builder multiplatform \
  --platform linux/arm64 \
  -t collaborative-middleware:latest \
  --output type=docker,dest=collaborative-middleware.tar \
  --progress plain \
  .

# 无缓存构建（依赖变化或构建异常时使用）
# 在上面的命令里追加 --no-cache
```

### 前置条件

`package.json` 和 `pnpm-lock.yaml` 必须同时存在且内容一致 —— Dockerfile 用的是
`pnpm install --frozen-lockfile`，锁文件缺失或与 `package.json` 不同步都会直接失败。

锁文件的 `lockfileVersion` 必须是 `9.0`。镜像内用的是 pnpm 9.15.8，本机 pnpm 11
生成的更高版本格式它读不了。原因见 `Dockerfile` 顶部注释。

### 关于网络

构建过程需要联网，但只依赖 npm registry，**不依赖 GitHub**。早先 Dockerfile 从
GitHub Releases `wget` pnpm 静态二进制，本网络环境返回 502 Bad Gateway，构建必然
中断（历史记录见 `build.log`），现已改为从 registry 安装。

## 3 构建后自检

服务器不联网、出问题不好查，所以每次构建完建议在本地过一遍。本机是 amd64，需要
`--platform linux/arm64` 让 Docker Desktop 用 QEMU 模拟运行。

```sh
# 3.1 架构与入口（应输出 arm64 / linux / nestjs / pm2-runtime）
docker load -i collaborative-middleware.tar
docker image inspect collaborative-middleware:latest \
  --format 'Arch={{.Architecture}} OS={{.Os}} User={{.Config.User}} Cmd={{.Config.Cmd}}'

# 3.2 native 绑定能否真的加载
# Alpine 是 musl，而 classic-level 的 prebuilds/linux-arm64 下只有 node.napi.armv8.node
# 没有 musl 专用变体，这一步验证它确实兼容
docker run --rm --platform linux/arm64 collaborative-middleware:latest sh -c \
  "node -e \"import('/app/node_modules/y-leveldb/src/y-leveldb.js').then(m=>console.log('OK',Object.keys(m).length)).catch(e=>{console.error('FAIL',e.message);process.exit(1)})\""

# 3.3 起容器，确认两个网关都注册成功
docker run -d --name mw-smoke --platform linux/arm64 -p 3001:3001 \
  -e NODE_ENV=production -e COLLABORATIVE_MIDDLEWARE_PORT=3001 \
  collaborative-middleware:latest
sleep 25 && docker logs mw-smoke
# 期望看到：创建 WebSocket Server, path=/collaboration 与 path=/markdown

# 3.4 连一个 WebSocket，确认 LevelDB 真的落盘
docker exec mw-smoke node -e "
const WebSocket = require('/app/node_modules/ws');
const ws = new WebSocket('ws://127.0.0.1:3001/collaboration/smoke-test-doc');
ws.on('open', () => { console.log('WS 连接成功'); setTimeout(() => process.exit(0), 4000); });
ws.on('error', e => { console.error('失败:', e.message); process.exit(1); });
"
docker exec mw-smoke ls -la /app/yjs-data/collaboration
# 期望出现 CURRENT / MANIFEST-* / LOCK / *.log

# 3.5 清理
docker rm -f mw-smoke
docker rmi collaborative-middleware:latest
```

## 4 在服务器上部署

```sh
scp collaborative-middleware.tar user@server:/tmp/
```

```sh
# 服务器上执行，无需联网

# 加载镜像
docker load -i /tmp/collaborative-middleware.tar

# 停止并删除旧容器（首次部署可跳过）
docker stop app && docker rm app

# 运行容器
# -d                后台运行
# -p 3001:3001      端口映射
# -v                挂载持久化目录，确保中间件重启后 Y.Doc 数据不丢失
# --name            容器名
# --restart         容器异常退出时自动重启
# collaborative-middleware 是镜像名，必须与 build 时的 -t 一致
docker run -d \
  -p 3001:3001 \
  -v /data/yjs-data:/app/yjs-data \
  --name app \
  --restart unless-stopped \
  collaborative-middleware
```

镜像内以 uid 1001（`nestjs`）运行，宿主机的 `/data/yjs-data` 需要该用户可写。

### 环境变量

`.env` 被 `.dockerignore` 排除，没有打进镜像，需要用 `-e` 注入或挂载。代码实际读取
的变量只有这四个（详见 `.env` 内的注释）：

| 变量                            | 说明                          | 默认    |
| ------------------------------- | ----------------------------- | ------- |
| `COLLABORATIVE_MIDDLEWARE_PORT` | 监听端口                      | 3001    |
| `CORS_ORIGIN`                   | 允许的跨域来源，留空为全部    | 全部    |
| `NODE_ENV`                      | `development` / `production`   | —       |
| `DOC_IDLE_CLEANUP_MINUTES`      | 空闲清理窗口（分钟）          | 1       |
