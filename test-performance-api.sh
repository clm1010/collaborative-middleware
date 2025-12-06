#!/bin/bash

# 演训方案管理功能 API 测试脚本

BASE_URL="http://localhost:3001/api"

echo "======================================"
echo "演训方案管理 API 测试"
echo "======================================"
echo ""

# 1. 测试获取分页数据 - 全部
echo "1. 测试获取全部数据（最近文档）"
echo "GET ${BASE_URL}/training/performance/page?pageNo=1&pageSize=10"
curl -s "${BASE_URL}/training/performance/page?pageNo=1&pageSize=10" | jq '.data.total, .data.list | length'
echo ""

# 2. 测试获取审核列表
echo "2. 测试获取审核列表（待审核 + 审核通过）"
echo "GET ${BASE_URL}/training/performance/page?pageNo=1&pageSize=10&statusList=待审核&statusList=审核通过"
curl -s -G "${BASE_URL}/training/performance/page" \
  --data-urlencode "pageNo=1" \
  --data-urlencode "pageSize=10" \
  --data-urlencode "statusList=待审核" \
  --data-urlencode "statusList=审核通过" | jq '.data.total, .data.list[].status'
echo ""

# 3. 测试获取发布列表
echo "3. 测试获取发布列表（发布成功）"
echo "GET ${BASE_URL}/training/performance/page?pageNo=1&pageSize=10&status=发布成功"
curl -s "${BASE_URL}/training/performance/page?pageNo=1&pageSize=10&status=发布成功" | jq '.data.total, .data.list[].status'
echo ""

# 4. 测试获取文档分类
echo "4. 测试获取文档分类"
echo "GET ${BASE_URL}/training/performance/categories"
curl -s "${BASE_URL}/training/performance/categories" | jq '.data | length, .data[0:3]'
echo ""

# 5. 测试创建方案
echo "5. 测试创建方案"
echo "POST ${BASE_URL}/training/performance/create"
curl -s -X POST "${BASE_URL}/training/performance/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试方案",
    "college": "学院A",
    "docCategory": "演训方案",
    "drillLevel": "战略级",
    "drillTheme": "测试主题"
  }' | jq '.message, .data.id, .data.name'
echo ""

# 6. 测试提交审核
echo "6. 测试提交审核"
echo "POST ${BASE_URL}/training/performance/audit/submit"
curl -s -X POST "${BASE_URL}/training/performance/audit/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "flowName": "flow1",
    "auditors": {
      "node1": "user1",
      "node2": ["user2", "user3"],
      "node3": "user4",
      "node4": "user5"
    },
    "comment": "请审核"
  }' | jq '.message, .data.status'
echo ""

# 7. 测试发布文档
echo "7. 测试发布文档"
echo "POST ${BASE_URL}/training/performance/publish"
curl -s -X POST "${BASE_URL}/training/performance/publish" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 3,
    "visibleScope": ["user1", "user2", "user3"]
  }' | jq '.message, .data.status'
echo ""

# 8. 测试删除方案
echo "8. 测试批量删除（注意：这会实际删除数据）"
echo "DELETE ${BASE_URL}/training/performance/delete"
echo "（跳过执行，避免删除测试数据）"
# curl -s -X DELETE "${BASE_URL}/training/performance/delete" \
#   -H "Content-Type: application/json" \
#   -d '{"ids": [999]}' | jq '.message'
echo ""

echo "======================================"
echo "测试完成！"
echo "======================================"

