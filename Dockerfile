# ==============================================================================
# 构建 arm64 离线部署包。目标服务器不联网，镜像需自带全部依赖和 pm2。
# 构建命令与自检步骤见 node中间件.md。
#
# pnpm 为什么从 npm registry 安装、且锁在 9.15.8：
#   1. 早先这里是从 GitHub Releases wget pnpm 静态二进制，本网络环境返回
#      502 Bad Gateway，构建必然中断（历史记录见 build.log）。npm registry 一直
#      可达，改从 registry 安装后不再依赖 GitHub。
#   2. 不要跟随本机升到 pnpm 11：它内部 require('node:sqlite')，要求
#      Node >= 22.13，在 node:20-alpine 上直接 ERR_UNKNOWN_BUILTIN_MODULE，
#      升 pnpm 就得把线上运行时一起升到 Node 22。
#   3. pnpm 9 默认执行依赖的 build script，classic-level（y-leveldb 的 native
#      LevelDB 绑定）一定会被正确安装。pnpm 10+ 默认拦截 build script，漏配放行
#      就会静默产出一个无法持久化 Y.Doc 的镜像。
#
# 锁文件的 lockfileVersion 必须是 9.0，pnpm 9.15.8 才读得懂。
# ==============================================================================

ARG PNPM_VERSION=9.15.8

# ==============================
# 阶段 1：TypeScript 编译
# 使用 $BUILDPLATFORM 在构建主机上原生运行，不经过 QEMU
# ==============================
FROM --platform=$BUILDPLATFORM node:20-alpine AS ts-builder

ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}

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

ARG PNPM_VERSION

RUN apk add --no-cache python3 make g++

RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app

COPY pnpm-lock.yaml package.json ./

RUN pnpm install --prod --frozen-lockfile


# ==============================
# 阶段 3：运行时镜像（目标平台 arm64，干净镜像）
# ==============================
FROM node:20-alpine

ARG PNPM_VERSION

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g pnpm@${PNPM_VERSION} \
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
