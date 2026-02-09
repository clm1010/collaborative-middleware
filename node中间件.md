# 中间件部署

## 1 控制台配置代理（本地电脑需要科学上网时使用）

```sh
export HTTP_PROXY=http://127.0.0.1:7897
export HTTPS_PROXY=http://127.0.0.1:7897
```

## 2 打开 DockerDesktop，构建镜像

### 2.1 构建镜像

> 2.1 和 2.2 **二选一**，无需都执行。
> 优先使用此方式，使用传统 Docker 构建引擎，简单直接，大多数情况下够用。

```sh
docker build --platform linux/arm64 -t collaborative-middleware .
```

### 2.2 使用 buildx 构建（备选）

> 2.1 和 2.2 **二选一**，无需都执行。
> 备选方案：使用 BuildKit 新一代构建工具，跨平台支持更好更稳定。当 2.1 构建失败时再使用此方式。
> `--load` 参数表示构建完成后将镜像加载到本地 Docker 镜像列表中（buildx 默认不会自动加载）。

```sh
docker buildx build --platform linux/arm64 -t collaborative-middleware:latest --load .
```

### 2.3 导出镜像为 tar 文件

```sh
docker save collaborative-middleware:latest -o collaborative-middleware.tar
```

## 3 在服务器上部署

```sh
# 加载镜像
docker load -i /tmp/collaborative-middleware.tar

# 运行容器
# -d                后台运行
# -p 3001:3001      端口映射
# -v                挂载持久化目录，确保中间件重启后 Y.Doc 数据不丢失
# --restart         容器异常退出时自动重启
docker run -d \
  -p 3001:3001 \
  -v /data/yjs-data:/app/yjs-data \
  --name collaborative-middleware \
  --restart unless-stopped \
  collaborative-middleware
```
