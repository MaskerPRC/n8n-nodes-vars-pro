# n8n-nodes-vars-pro

Vars Pro - n8n 节点包，用于存储和读取本地 JSON 文件数据，支持执行级别和工作流级别的数据管理。

## 功能特性

- 📦 **Vars Pro Storage**: 存储和读取本地 JSON 文件数据
  - 执行级别数据：每个执行创建独立的 JSON 文件
  - 工作流级别数据：工作流共享的 JSON 文件
  - 支持设置、读取、删除操作
  - 支持嵌套键路径（如 `user.name`）

- 📊 **Vars Pro Viewer**: 实时数据查看器
  - 现代化的表格 UI 设计
  - 搜索和筛选功能
  - 排序功能
  - 自动刷新
  - 支持 HTML 和 JSON 两种响应格式

## 快速开始

### 安装

```bash
npm install n8n-nodes-vars-pro
```

### 使用工作流模板

> **注意**: n8n 社区节点目前无法直接集成到右侧的 Templates 面板（该面板基于 n8n 云端服务）。请使用以下方式导入模板。

#### 方法 1：直接复制 JSON（推荐）

复制以下 JSON 代码，在 n8n 编辑器中按 `Ctrl+V` (Windows) 或 `Cmd+V` (Mac) 粘贴即可：

```json
{
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-vars-pro.varsProViewer",
      "typeVersion": 1,
      "position": [
        224,
        -640
      ],
      "id": "84d4385d-a646-4602-9d37-11a6af9c26ee",
      "name": "Vars Pro Viewer"
    },
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "={{ $json.html }}",
        "options": {
          "responseCode": 200,
          "responseHeaders": {
            "entries": [
              {
                "name": "Content-Type",
                "value": "text/html; charset=utf-8"
              }
            ]
          }
        }
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        832,
        -544
      ],
      "id": "ef945bda-ea0d-4e99-8656-4f407655644b",
      "name": "Respond to Webhook"
    },
    {
      "parameters": {
        "path": "data-viewer",
        "responseMode": "responseNode",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        -112,
        -640
      ],
      "id": "2f0c3e37-0de8-446a-b783-f0e67311d83b",
      "name": "Webhook"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "35e3c4ba-cd6b-4f67-ac34-418f21cb6b71",
              "leftValue": "={{ $('Webhook').item.json.headers.accept }}",
              "rightValue": "application/json",
              "operator": {
                "type": "string",
                "operation": "equals",
                "name": "filter.operator.equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        432,
        -640
      ],
      "id": "d8accef7-30a1-4636-a36b-449b984c2de4",
      "name": "If"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $('Vars Pro Viewer').item.json.data }}",
        "options": {
          "responseCode": 200,
          "responseHeaders": {
            "entries": [
              {
                "name": "Content-Type",
                "value": "application/json; charset=utf-8"
              }
            ]
          }
        }
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        832,
        -784
      ],
      "id": "3bdee0c7-2069-4c57-b7f2-75707392a992",
      "name": "Respond to Webhook1"
    }
  ],
  "connections": {
    "Vars Pro Viewer": {
      "main": [
        [
          {
            "node": "If",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Webhook": {
      "main": [
        [
          {
            "node": "Vars Pro Viewer",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If": {
      "main": [
        [
          {
            "node": "Respond to Webhook1",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

#### 方法 2：从文件导入

1. 在 n8n 中，点击 **Workflows** → **Import from File**
2. 选择 `node_modules/n8n-nodes-vars-pro/templates/vars-pro-viewer-template.json` 文件（如果能够访问服务器文件系统）
3. 或者从 [GitHub 仓库](https://github.com/your-org/your-repo) 下载 `templates/vars-pro-viewer-template.json` 并导入

---

## 开发指南

This repository helps you build custom integrations for [n8n](https://n8n.io). It includes example nodes, credentials, the node linter, and all the tooling you need to get started.