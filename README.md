# n8n-nodes-vars-pro

Vars Pro - n8n node package for storing and reading local JSON file data, supporting both execution-level and workflow-level data management.

## Features

- 📦 **Vars Pro Storage**: Store and read local JSON file data
  - Execution Level Data: Creates independent JSON file for each execution
  - Workflow Level Data: Shared JSON file for the workflow
  - Supports Set, Get, and Delete operations
  - Supports nested key paths (e.g., `user.name`)

- 📊 **Vars Pro Viewer**: Real-time data viewer
  - Modern table UI design
  - Search and filter functions
  - Sorting function
  - Auto-refresh
  - Supports both HTML and JSON response formats

## Quick Start

### Installation

```bash
npm install n8n-nodes-vars-pro
```

### Using Workflow Templates

> **Note**: n8n community nodes cannot be directly integrated into the right-side Templates panel (which is based on n8n cloud services). Please use the following methods to import templates.

#### Method 1: Copy JSON Directly (Recommended)

Copy the following JSON code and paste it into the n8n editor using `Ctrl+V` (Windows) or `Cmd+V` (Mac):

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

#### Method 2: Import from File

1. In n8n, click **Workflows** → **Import from File**
2. Select the `node_modules/n8n-nodes-vars-pro/templates/vars-pro-viewer-template.json` file (if you have access to the server file system)
3. Or download `templates/vars-pro-viewer-template.json` from the [GitHub Repository](https://github.com/your-org/your-repo) and import it

---

## Development Guide

This repository helps you build custom integrations for [n8n](https://n8n.io). It includes example nodes, credentials, the node linter, and all the tooling you need to get started.