#!/bin/bash
# 开发环境启动脚本

echo "=========================================="
echo "启动协同编辑中间件 - 开发环境"
echo "=========================================="

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "未找到 .env 文件，从 .env.dev 复制..."
    cp .env.dev .env
    echo "✅ 已创建 .env 文件"
else
    echo "✅ .env 文件已存在"
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    pnpm install
fi

echo ""
echo "🚀 启动开发服务器..."
echo ""

# 启动开发服务器
pnpm start:dev

