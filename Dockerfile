# ==============================
# 第一阶段：构建应用
# ==============================
FROM node:20-alpine AS builder

# 安装 native 模块编译工具（y-leveldb 的 classic-level 需要 Python3、make、g++）
RUN apk add --no-cache python3 make g++

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY pnpm-lock.yaml ./
COPY package.json ./

# 安装所有依赖（包括 devDependencies，因为需要构建）
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

RUN pnpm -v

# 构建 TypeScript 项目
RUN npm run build:prod


# ==============================
# 第二阶段：运行时镜像
# ==============================
FROM node:20-alpine

# 安装 pnpm 和 PM2（全局安装 PM2）
RUN npm install -g pnpm pm2

# 创建应用目录
WORKDIR /app

# 复制生产依赖相关文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# 安装编译工具 -> 安装生产依赖（编译 native 模块） -> 清理编译工具
# 合并为一个 RUN 层，避免编译工具残留在镜像层中，减小镜像体积约 100-150MB
RUN apk add --no-cache python3 make g++ \
    && pnpm install --prod --frozen-lockfile \
    && apk del python3 make g++ \
    && rm -rf /tmp/* /root/.npm /root/.cache

# 创建 Y.Doc 持久化数据目录（collaboration 和 markdown 隔离存储）
# 创建非 root 用户并授权持久化目录
RUN mkdir -p /app/yjs-data/collaboration /app/yjs-data/markdown \
    && addgroup -g 1001 -S nestjs \
    && adduser -S nestjs -u 1001 \
    && chown -R nestjs:nestjs /app/yjs-data

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3001

# 使用 PM2 启动应用（--no-daemon 让 PM2 在前台运行，避免容器退出）
CMD ["pm2-runtime", "start", "dist/main.js", "--name", "nestjs-app"]
