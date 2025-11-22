# Vars Pro Templates

This directory contains workflow templates for Vars Pro nodes, which you can import directly into n8n.

## Templates List

### vars-pro-viewer-template.json

A complete workflow template for creating a Vars Pro Data Viewer.

**Features:**
- 📊 Table view displaying execution data
- 🔍 Search and filter functionality
- 📋 Copy JSON data
- 🔄 Auto-refresh
- 🌐 Supports both HTML and JSON response formats

**Workflow Structure:**
```
[Webhook] → [Vars Pro Viewer] → [If] → [Respond to Webhook (HTML/JSON)]
```

**How to Use:**

1. In n8n, click "Workflows" → "Import from File"
2. Select the `vars-pro-viewer-template.json` file
3. After import, the workflow will automatically create all necessary nodes
4. Activate the workflow and visit the Webhook URL to view the data

**Configuration:**

- **Webhook Node**: Receives HTTP GET requests
- **Vars Pro Viewer Node**: Generates HTML page and data
- **If Node**: Determines whether to return HTML or JSON based on the Accept header
- **Respond to Webhook Node**: Returns the response content

**Notes:**

- Ensure the `n8n-nodes-vars-pro` package is installed
- The Webhook path will automatically generate a new ID upon import
- You can adjust the configuration of the Vars Pro Viewer node (data type, poll interval, etc.) as needed

