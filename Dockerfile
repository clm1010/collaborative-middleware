# ==============================
# 第一阶段：构建应用
# ==============================
FROM node:20-alpine AS builder

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

# 仅安装生产依赖（确保运行环境干净）
RUN pnpm install --prod --frozen-lockfile

# 创建非 root 用户
RUN addgroup -g 1001 -S nestjs && \
    adduser -S nestjs -u 1001

# 切换到非 root 用户
USER nestjs

# 暴露端口（NestJS 默认 3000）
EXPOSE 3001

# 使用 PM2 启动应用（--no-daemon 让 PM2 在前台运行，避免容器退出）
CMD ["pm2-runtime", "start", "dist/main.js", "--name", "nestjs-app"]