# Vars Pro Templates

这个目录包含了 Vars Pro 节点的工作流模板，你可以直接导入到 n8n 中使用。

## 模板列表

### vars-pro-viewer-template.json

一个完整的工作流模板，用于创建 Vars Pro 数据查看器。

**功能特性：**
- 📊 表格视图展示执行数据
- 🔍 搜索和筛选功能
- 📋 复制 JSON 数据
- 🔄 自动刷新
- 🌐 支持 HTML 和 JSON 两种响应格式

**工作流结构：**
```
[Webhook] → [Vars Pro Viewer] → [If] → [Respond to Webhook (HTML/JSON)]
```

**使用方法：**

1. 在 n8n 中，点击 "Workflows" → "Import from File"
2. 选择 `vars-pro-viewer-template.json` 文件
3. 导入后，工作流会自动创建所有必要的节点
4. 激活工作流，访问 Webhook URL 即可查看数据

**配置说明：**

- **Webhook 节点**: 接收 HTTP GET 请求
- **Vars Pro Viewer 节点**: 生成 HTML 页面和数据
- **If 节点**: 根据 Accept 头判断返回 HTML 还是 JSON
- **Respond to Webhook 节点**: 返回响应内容

**注意事项：**

- 确保已安装 `n8n-nodes-vars-pro` 包
- Webhook 路径会在导入时自动生成新的 ID
- 可以根据需要调整 Vars Pro Viewer 节点的配置（数据类型、轮询间隔等）

