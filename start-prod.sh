#!/bin/bash
# 生产环境启动脚本

echo "=========================================="
echo "启动协同编辑中间件 - 生产环境"
echo "=========================================="

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "未找到 .env 文件，从 .env.prod 复制..."
    cp .env.prod .env
    echo "✅ 已创建 .env 文件"
    echo "⚠️  请检查并修改 CORS_ORIGIN 等配置！"
    read -p "按回车键继续..."
else
    echo "✅ .env 文件已存在"
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    pnpm install
fi

# 构建项目
echo ""
echo "🔨 构建项目..."
pnpm build

# 启动生产服务器
echo ""
echo "🚀 启动生产服务器..."
echo ""

pnpm start:prod

