#!/bin/bash
# ==============================================================================
# build-local.sh —— 本地离线构建中间件 Docker 镜像
# ------------------------------------------------------------------------------
# 作用：在网络受限环境下（无法稳定访问 registry.npmjs.org / github.com 等）构建
#       collaborative-middleware 的 arm64 镜像并导出为 .tar 文件。
#
# 原理：用预先下载到本地的 pnpm 静态二进制（pnpm-linuxstatic-arm64）替代
#       Dockerfile 里的 `npm install -g pnpm` 和 `wget GitHub Releases` 步骤，
#       彻底消除构建期的外网依赖。
#
# 使用：./build-local.sh
#
# 环境变量（可选覆盖默认值）：
#   PLATFORM         目标平台，默认 linux/arm64
#   IMAGE_NAME       镜像 tag，默认 collaborative-middleware:latest
#   OUTPUT_FILE      导出 tar 路径，默认 collaborative-middleware.tar
#   PNPM_VERSION     pnpm 版本，默认 v9.15.8
#   HTTP_PROXY_URL   docker 构建用的代理，默认 http://host.docker.internal:7897
#                    （若宿主机代理未开启 LAN 连接，可设为空字符串禁用）
#   NO_CACHE         设为 1 时追加 --no-cache
# ==============================================================================

set -e

# ----- 配置 -----
PLATFORM="${PLATFORM:-linux/arm64}"
IMAGE_NAME="${IMAGE_NAME:-collaborative-middleware:latest}"
OUTPUT_FILE="${OUTPUT_FILE:-collaborative-middleware.tar}"
PNPM_VERSION="${PNPM_VERSION:-v9.15.8}"
PNPM_BINARY="pnpm-linuxstatic-arm64"
HTTP_PROXY_URL="${HTTP_PROXY_URL:-http://host.docker.internal:7897}"
NO_CACHE="${NO_CACHE:-0}"

# ----- 输出辅助 -----
BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[build-local]${NC} $*"; }
ok()   { echo -e "${GREEN}[   ok   ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ warn  ]${NC} $*"; }
err()  { echo -e "${RED}[  err  ]${NC} $*" >&2; }

# 切到脚本所在目录
cd "$(dirname "$0")"

# ==============================
# 1. 检查 / 下载 pnpm 静态二进制
# ==============================
if [ -f "$PNPM_BINARY" ]; then
    SIZE=$(du -h "$PNPM_BINARY" 2>/dev/null | cut -f1)
    ok "$PNPM_BINARY 已存在（$SIZE）"
else
    warn "$PNPM_BINARY 不存在，尝试下载..."
    GH_URL="https://github.com/pnpm/pnpm/releases/download/${PNPM_VERSION}/${PNPM_BINARY}"
    PROXY_URL="https://gh-proxy.com/${GH_URL}"

    if command -v curl >/dev/null 2>&1; then
        if ! curl -L --fail --connect-timeout 15 -o "$PNPM_BINARY" "$PROXY_URL" \
             && ! curl -L --fail --connect-timeout 15 -o "$PNPM_BINARY" "$GH_URL"; then
            err "自动下载失败，请手动保存以下文件到项目根目录："
            err "  文件名: $PNPM_BINARY"
            err "  来源1:  $PROXY_URL"
            err "  来源2:  $GH_URL"
            rm -f "$PNPM_BINARY"
            exit 1
        fi
    else
        err "找不到 curl，请手动下载 $PNPM_BINARY 到项目根目录"
        exit 1
    fi
    ok "已下载 $(du -h "$PNPM_BINARY" | cut -f1)"
fi

# ==============================
# 2. 临时改写 Dockerfile（退出时自动还原）
# ==============================
if [ ! -f Dockerfile ]; then
    err "当前目录下找不到 Dockerfile"
    exit 1
fi

cp Dockerfile Dockerfile.backup
log "已备份 Dockerfile → Dockerfile.backup"

cleanup() {
    if [ -f Dockerfile.backup ]; then
        mv -f Dockerfile.backup Dockerfile
        ok "已还原 Dockerfile"
    fi
}
trap cleanup EXIT INT TERM

# 用 perl 重写 Dockerfile：
#  - 阶段 1 (ts-builder)：  `RUN npm install -g pnpm` → COPY 本地二进制
#  - 阶段 2 (deps-builder)：`RUN wget ... && chmod`   → COPY 本地二进制
#  - 阶段 3 (runtime)：      `RUN wget ... && chmod && pnpm add -g pm2 && --version`
#                            → COPY 本地二进制 + 保留 pm2 相关命令
# 原文件（可能含 CRLF）通过 Dockerfile.backup 保留，工作文件统一 LF
tr -d '\r' < Dockerfile.backup > Dockerfile

perl -0777 -i -pe '
s#^RUN npm install -g pnpm\s*$#COPY pnpm-linuxstatic-arm64 /bin/pnpm\nRUN chmod +x /bin/pnpm#m;
s#RUN wget -qO /bin/pnpm "https://github\.com/pnpm/pnpm/releases/download/[^"]*" \\\n\s+&& chmod \+x /bin/pnpm \\\n\s+&& pnpm add -g pm2 \\\n\s+&& pnpm --version#COPY pnpm-linuxstatic-arm64 /bin/pnpm\nRUN chmod +x /bin/pnpm \\\n    && pnpm add -g pm2 \\\n    && pnpm --version#g;
s#RUN wget -qO /bin/pnpm "https://github\.com/pnpm/pnpm/releases/download/[^"]*" \\\n\s+&& chmod \+x /bin/pnpm#COPY pnpm-linuxstatic-arm64 /bin/pnpm\nRUN chmod +x /bin/pnpm#g;
' Dockerfile

# 校验替换成功（Dockerfile 里不应再有 wget/ npm install -g pnpm）
if grep -qE '^RUN (npm install -g pnpm|wget -qO /bin/pnpm)' Dockerfile; then
    err "Dockerfile 替换失败，可能是 Dockerfile 结构已变化"
    err "请检查下面的 Dockerfile 后再手动调整脚本："
    grep -nE '^RUN (npm install -g pnpm|wget)' Dockerfile || true
    exit 1
fi
ok "Dockerfile 已临时改写：wget 下载 → COPY 本地二进制"

# ==============================
# 3. 执行 docker buildx build
# ==============================
log "镜像: $IMAGE_NAME"
log "平台: $PLATFORM"
log "输出: $OUTPUT_FILE"
[ -n "$HTTP_PROXY_URL" ] && log "代理: $HTTP_PROXY_URL"

BUILD_ARGS=()
if [ -n "$HTTP_PROXY_URL" ]; then
    BUILD_ARGS+=(--build-arg "HTTP_PROXY=$HTTP_PROXY_URL")
    BUILD_ARGS+=(--build-arg "HTTPS_PROXY=$HTTP_PROXY_URL")
fi
[ "$NO_CACHE" = "1" ] && BUILD_ARGS+=(--no-cache)

docker buildx build \
    --platform "$PLATFORM" \
    "${BUILD_ARGS[@]}" \
    -t "$IMAGE_NAME" \
    --output "type=docker,dest=$OUTPUT_FILE" \
    .

ok "构建完成: $OUTPUT_FILE ($(du -h "$OUTPUT_FILE" | cut -f1))"
echo ""
log "部署命令："
echo "  scp $OUTPUT_FILE user@server:/tmp/"
echo "  ssh user@server 'docker load -i /tmp/$OUTPUT_FILE'"
