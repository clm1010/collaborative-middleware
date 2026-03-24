# 中间件部署

## 1 控制台配置代理（本地电脑需要科学上网时使用）

```sh
export HTTP_PROXY=http://127.0.0.1:7897
export HTTPS_PROXY=http://127.0.0.1:7897
```

## 2 打开 DockerDesktop，构建镜像

### 2.0 首次使用：创建 buildx builder（只需执行一次）

> 创建支持跨平台导出的 BuildKit 构建器。已创建过则跳过此步。

```sh
docker buildx create --name multiplatform --driver docker-container --use
```

### 2.1 构建并导出镜像

> 使用 buildx 构建 arm64 镜像并直接导出为 tar 文件（构建 + 导出一步完成）。
> 首次构建或依赖变化时加 `--no-cache`。

```sh
# 使用缓存构建（日常使用）
docker buildx build --platform linux/arm64 -t collaborative-middleware:latest --output type=docker,dest=collaborative-middleware.tar .

# 无缓存构建（依赖变化或构建异常时使用）
docker buildx build --platform linux/arm64 --no-cache -t collaborative-middleware:latest --output type=docker,dest=collaborative-middleware.tar .
```

## 3 在服务器上部署

```sh
# 加载镜像
docker load -i /tmp/collaborative-middleware.tar

# 运行容器
# -d                后台运行
# -p 3001:3001      端口映射
# -v                挂载持久化目录，确保中间件重启后 Y.Doc 数据不丢失
# --name            是 Docker 容器名
# --restart         容器异常退出时自动重启
# collaborative-middleware 这里是镜像名 必须与 build 时的镜像名一致
docker run -d \
  -p 3001:3001 \
  -v /data/yjs-data:/app/yjs-data \
  --name app \
  --restart unless-stopped \
  collaborative-middleware
```
