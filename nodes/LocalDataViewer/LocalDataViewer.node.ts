import type {
	IWebhookFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import {
	getWorkflowDataPath,
	readJsonFile,
} from '../LocalDataStorage/shared/fileUtils';
import * as fs from 'fs';
import * as path from 'path';

export class LocalDataViewer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Local Data Viewer',
		name: 'localDataViewer',
		icon: 'file:viewer.svg',
		group: ['trigger'],
		version: 1,
		description: '查看本地JSON文件数据的实时页面',
		defaults: {
			name: 'Local Data Viewer',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'data-viewer',
			},
		],
		properties: [
			{
				displayName: '数据类型',
				name: 'dataType',
				type: 'options',
				options: [
					{
						name: '执行级别数据',
						value: 'execution',
						description: '显示所有执行级别的JSON文件',
					},
					{
						name: '工作流级别数据',
						value: 'workflow',
						description: '显示工作流级别的JSON文件',
					},
					{
						name: '全部数据',
						value: 'all',
						description: '显示所有数据',
					},
				],
				default: 'all',
				description: '选择要查看的数据类型',
			},
			{
				displayName: '轮询间隔（秒）',
				name: 'pollInterval',
				type: 'number',
				default: 5,
				description: '前端页面自动刷新的间隔时间（秒）',
			},
			{
				displayName: '允许查看',
				name: 'allowView',
				type: 'boolean',
				default: true,
				description: '是否允许通过Webhook查看数据',
			},
		],
		usableAsTool: true,
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const dataType = this.getNodeParameter('dataType') as string;
		const allowView = this.getNodeParameter('allowView', true) as boolean;

		if (!allowView) {
			const errorData: INodeExecutionData[][] = [
				[
					{
						json: {
							error: '查看功能已禁用',
						},
					},
				],
			];
			return {
				workflowData: errorData,
			};
		}

		const workflow = this.getWorkflow();
		const workflowId = workflow.id || 'default';
		const DATA_BASE_DIR = process.env.N8N_DATA_DIR || path.join(process.cwd(), '.n8n-data');
		const workflowDir = path.join(DATA_BASE_DIR, 'workflows', workflowId);

		const data: any = {};

		try {
			if (dataType === 'workflow' || dataType === 'all') {
				const workflowDataPath = getWorkflowDataPath(workflowId);
				if (fs.existsSync(workflowDataPath)) {
					data.workflow = readJsonFile(workflowDataPath);
				} else {
					data.workflow = {};
				}
			}

			if (dataType === 'execution' || dataType === 'all') {
				data.executions = {};
				if (fs.existsSync(workflowDir)) {
					const files = fs.readdirSync(workflowDir);
					for (const file of files) {
						if (file.endsWith('.json') && file !== 'workflow-data.json') {
							const executionId = file.replace('.json', '');
							const executionPath = path.join(workflowDir, file);
							data.executions[executionId] = readJsonFile(executionPath);
						}
					}
				}
			}
		} catch (error) {
			const errorData: INodeExecutionData[][] = [
				[
					{
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
					},
				],
			];
			return {
				workflowData: errorData,
			};
		}

		const pollInterval = (this.getNodeParameter('pollInterval', 5) as number) || 5;

		// 返回HTML页面，包含实时数据显示和自动刷新功能
		const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Local Data Viewer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        .controls {
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        .refresh-btn:hover {
            background: #5568d3;
        }
        .status {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            color: #6c757d;
        }
        .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #28a745;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #333;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        .data-container {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            overflow-x: auto;
        }
        pre {
            margin: 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #333;
        }
        .empty {
            text-align: center;
            color: #6c757d;
            padding: 40px;
            font-style: italic;
        }
        .execution-item {
            margin-bottom: 20px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        .execution-header {
            background: #e9ecef;
            padding: 12px 15px;
            font-weight: 600;
            color: #495057;
            font-size: 14px;
        }
        .execution-content {
            padding: 15px;
            background: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Local Data Viewer</h1>
            <p>实时数据查看器 - 工作流ID: ${workflowId}</p>
        </div>
        <div class="controls">
            <button class="refresh-btn" onclick="refreshData()">🔄 立即刷新</button>
            <div class="status">
                <span class="status-indicator"></span>
                <span>自动刷新: 每 <span id="pollInterval">${pollInterval}</span> 秒</span>
                <span>|</span>
                <span>最后更新: <span id="lastUpdate">-</span></span>
            </div>
        </div>
        <div class="content" id="content">
            <div class="empty">加载中...</div>
        </div>
    </div>
    <script>
        const pollInterval = ${pollInterval * 1000};
        let refreshTimer;
        
        function formatData(data) {
            if (!data || Object.keys(data).length === 0) {
                return '<div class="empty">暂无数据</div>';
            }
            
            let html = '';
            
            if (data.workflow !== undefined) {
                html += '<div class="section">';
                html += '<div class="section-title">📁 工作流级别数据</div>';
                html += '<div class="data-container">';
                html += '<pre>' + JSON.stringify(data.workflow, null, 2) + '</pre>';
                html += '</div>';
                html += '</div>';
            }
            
            if (data.executions && Object.keys(data.executions).length > 0) {
                html += '<div class="section">';
                html += '<div class="section-title">⚡ 执行级别数据</div>';
                for (const [execId, execData] of Object.entries(data.executions)) {
                    html += '<div class="execution-item">';
                    html += '<div class="execution-header">执行ID: ' + execId + '</div>';
                    html += '<div class="execution-content">';
                    html += '<pre>' + JSON.stringify(execData, null, 2) + '</pre>';
                    html += '</div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            
            if (!html) {
                html = '<div class="empty">暂无数据</div>';
            }
            
            return html;
        }
        
        async function refreshData() {
            try {
                const response = await fetch(window.location.href, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                const data = await response.json();
                document.getElementById('content').innerHTML = formatData(data);
                document.getElementById('lastUpdate').textContent = new Date().toLocaleString('zh-CN');
            } catch (error) {
                document.getElementById('content').innerHTML = '<div class="empty">加载失败: ' + (error.message || String(error)) + '</div>';
            }
        }
        
        function startAutoRefresh() {
            refreshTimer = setInterval(refreshData, pollInterval);
        }
        
        function stopAutoRefresh() {
            if (refreshTimer) {
                clearInterval(refreshTimer);
            }
        }
        
        // 页面加载时立即刷新一次
        refreshData();
        
        // 启动自动刷新
        startAutoRefresh();
        
        // 页面可见性变化时控制刷新
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                stopAutoRefresh();
            } else {
                startAutoRefresh();
                refreshData();
            }
        });
    </script>
</body>
</html>`;

		// 检查请求路径和请求头
		const req = this.getRequestObject();
		const url = req.url || '';
		const isSSERequest = url.includes('data-viewer-sse') || url.includes('sse');
		
		let isApiRequest = false;
		let acceptHeader = '';
		try {
			acceptHeader = (req.headers?.accept || req.headers?.Accept || '') as string;
			if (typeof acceptHeader === 'string') {
				isApiRequest = acceptHeader.includes('application/json') || acceptHeader.includes('text/event-stream');
			}
		} catch {
			// 如果无法获取请求头，默认返回HTML
			isApiRequest = false;
		}
		
		// 如果是SSE请求，返回优化的实时更新页面（使用快速轮询）
		if (isSSERequest || acceptHeader.includes('text/event-stream')) {
			// 注意：n8n的webhook节点可能不支持真正的流式响应
			// 这里我们返回一个包含SSE JavaScript代码的HTML页面
			const sseHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Local Data Viewer - Real-time</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .controls {
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .status {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            color: #6c757d;
        }
        .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #28a745;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .content { padding: 30px; }
        .section { margin-bottom: 30px; }
        .section-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #333;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        .data-container {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            overflow-x: auto;
        }
        pre {
            margin: 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #333;
        }
        .empty {
            text-align: center;
            color: #6c757d;
            padding: 40px;
            font-style: italic;
        }
        .execution-item {
            margin-bottom: 20px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        .execution-header {
            background: #e9ecef;
            padding: 12px 15px;
            font-weight: 600;
            color: #495057;
            font-size: 14px;
        }
        .execution-content {
            padding: 15px;
            background: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Local Data Viewer - Real-time</h1>
            <p>实时数据查看器 - 工作流ID: ${workflowId}</p>
        </div>
        <div class="controls">
            <div class="status">
                <span class="status-indicator"></span>
                <span>实时更新模式（快速轮询）</span>
                <span>|</span>
                <span>最后更新: <span id="lastUpdate">-</span></span>
            </div>
        </div>
        <div class="content" id="content">
            <div class="empty">加载中...</div>
        </div>
    </div>
    <script>
        const pollInterval = ${Math.max(1, Math.floor(pollInterval / 2)) * 1000}; // 更快的轮询
        let refreshTimer;
        let lastDataHash = '';
        
        function formatData(data) {
            if (!data || Object.keys(data).length === 0) {
                return '<div class="empty">暂无数据</div>';
            }
            
            let html = '';
            
            if (data.workflow !== undefined) {
                html += '<div class="section">';
                html += '<div class="section-title">📁 工作流级别数据</div>';
                html += '<div class="data-container">';
                html += '<pre>' + JSON.stringify(data.workflow, null, 2) + '</pre>';
                html += '</div>';
                html += '</div>';
            }
            
            if (data.executions && Object.keys(data.executions).length > 0) {
                html += '<div class="section">';
                html += '<div class="section-title">⚡ 执行级别数据</div>';
                for (const [execId, execData] of Object.entries(data.executions)) {
                    html += '<div class="execution-item">';
                    html += '<div class="execution-header">执行ID: ' + execId + '</div>';
                    html += '<div class="execution-content">';
                    html += '<pre>' + JSON.stringify(execData, null, 2) + '</pre>';
                    html += '</div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            
            if (!html) {
                html = '<div class="empty">暂无数据</div>';
            }
            
            return html;
        }
        
        async function refreshData() {
            try {
                const response = await fetch(window.location.href.replace('-sse', '') + '?t=' + Date.now(), {
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });
                const newData = await response.json();
                const newDataHash = JSON.stringify(newData);
                
                // 只在数据变化时更新DOM
                if (newDataHash !== lastDataHash) {
                    document.getElementById('content').innerHTML = formatData(newData);
                    document.getElementById('lastUpdate').textContent = new Date().toLocaleString('zh-CN');
                    lastDataHash = newDataHash;
                }
            } catch (error) {
                document.getElementById('content').innerHTML = '<div class="empty">加载失败: ' + (error.message || String(error)) + '</div>';
            }
        }
        
        function startAutoRefresh() {
            refreshTimer = setInterval(refreshData, pollInterval);
        }
        
        function stopAutoRefresh() {
            if (refreshTimer) {
                clearInterval(refreshTimer);
            }
        }
        
        // 页面加载时立即刷新
        refreshData();
        startAutoRefresh();
        
        // 页面可见性变化时控制刷新
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                stopAutoRefresh();
            } else {
                startAutoRefresh();
                refreshData();
            }
        });
        
        // 页面卸载时清理
        window.addEventListener('beforeunload', stopAutoRefresh);
    </script>
</body>
</html>`;
			
			const sseData: INodeExecutionData[][] = [
				[
					{
						json: {
							html: sseHtml,
							data: data,
							_contentType: 'text/html',
						},
					},
				],
			];
			return {
				workflowData: sseData,
			};
		}

		// 根据请求类型返回不同的数据
		if (isApiRequest) {
			const apiData: INodeExecutionData[][] = [
				[
					{
						json: data,
					},
				],
			];
			return {
				workflowData: apiData,
			};
		} else {
			// 对于HTML请求，将HTML内容放入json中，需要后续Respond to Webhook节点返回
			const htmlData: INodeExecutionData[][] = [
				[
					{
						json: {
							html: html,
							data: data,
							_contentType: 'text/html',
						},
					},
				],
			];
			return {
				workflowData: htmlData,
			};
		}
	}
}

