# ==============================
# 阶段 1：TypeScript 编译
# 使用 $BUILDPLATFORM 在构建主机上原生运行，不经过 QEMU
# ==============================
FROM --platform=$BUILDPLATFORM node:20-alpine AS ts-builder

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN NODE_ENV=production pnpm exec nest build


# ==============================
# 阶段 2：安装生产依赖（目标平台 arm64）
# 编译 native 模块需要 python3/make/g++
# 此阶段会被丢弃，编译工具不会进入最终镜像
# ==============================
FROM node:20-alpine AS deps-builder

RUN apk add --no-cache python3 make g++

RUN wget -qO /bin/pnpm "https://github.com/pnpm/pnpm/releases/download/v9.15.8/pnpm-linuxstatic-arm64" \
    && chmod +x /bin/pnpm

WORKDIR /app

COPY pnpm-lock.yaml package.json ./

RUN pnpm install --prod --frozen-lockfile


# ==============================
# 阶段 3：运行时镜像（目标平台 arm64，干净镜像）
# ==============================
FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN wget -qO /bin/pnpm "https://github.com/pnpm/pnpm/releases/download/v9.15.8/pnpm-linuxstatic-arm64" \
    && chmod +x /bin/pnpm \
    && pnpm add -g pm2 \
    && pnpm --version

WORKDIR /app

COPY --from=ts-builder /app/dist ./dist
COPY --from=deps-builder /app/node_modules ./node_modules
COPY --from=ts-builder /app/package.json ./

RUN mkdir -p /app/yjs-data/collaboration /app/yjs-data/markdown \
    && addgroup -g 1001 -S nestjs \
    && adduser -S nestjs -u 1001 -G nestjs \
    && chown -R nestjs:nestjs /app/yjs-data

USER nestjs

EXPOSE 3001

CMD ["pm2-runtime", "start", "dist/main.js", "--name", "nestjs-app"]
