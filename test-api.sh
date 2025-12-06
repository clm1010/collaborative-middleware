#!/bin/bash

# API 测试脚本

BASE_URL="http://localhost:3001/api"

echo "=========================================="
echo "开始测试 collaborative-middleware API"
echo "=========================================="
echo ""

# 测试 1: 获取文档分类
echo "📋 测试 1: 获取文档分类"
curl -s "${BASE_URL}/training/performance/categories" | python -m json.tool
echo ""
echo ""

# 测试 2: 获取演训方案分页数据
echo "📄 测试 2: 获取演训方案分页数据 (第1页, 每页5条)"
curl -s "${BASE_URL}/training/performance/page?pageNo=1&pageSize=5" | python -m json.tool
echo ""
echo ""

# 测试 3: 获取文档详情
echo "📝 测试 3: 获取文档详情 (demo-doc)"
curl -s "${BASE_URL}/document/demo-doc" | python -m json.tool
echo ""
echo ""

# 测试 4: 获取文档列表
echo "📚 测试 4: 获取所有文档列表"
curl -s "${BASE_URL}/document/list/all" | python -m json.tool
echo ""
echo ""

# 测试 5: 获取参考素材
echo "📎 测试 5: 获取参考素材 (demo-doc)"
curl -s "${BASE_URL}/document/demo-doc/materials" | python -m json.tool
echo ""
echo ""

# 测试 6: 创建演训方案
echo "➕ 测试 6: 创建新的演训方案"
curl -s -X POST "${BASE_URL}/training/performance/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试方案",
    "college": "学院A",
    "docCategory": "总体方案",
    "drillLevel": "战略级",
    "author": "admin",
    "scope": "可编辑",
    "status": "编辑中"
  }' | python -m json.tool
echo ""
echo ""

echo "=========================================="
echo "✅ 所有测试完成！"
echo "=========================================="

