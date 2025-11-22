import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	getWorkflowDataPath,
	readJsonFile,
} from '../LocalDataStorage/shared/fileUtils';
import * as fs from 'fs';
import * as path from 'path';

export class LocalDataViewer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vars Pro Viewer',
		name: 'varsProViewer',
		icon: 'file:viewer.svg',
		group: ['transform'],
		version: 1,
		description: 'Vars Pro - 生成查看本地JSON文件数据的HTML页面（支持轮询刷新）。配合Webhook节点使用，在HTTP Response节点中返回 $json.html',
		defaults: {
			name: 'Vars Pro Viewer',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const dataType = this.getNodeParameter('dataType', itemIndex) as string;
				const allowView = this.getNodeParameter('allowView', itemIndex, true) as boolean;

				if (!allowView) {
					returnData.push({
						json: {
							error: '查看功能已禁用',
						},
						pairedItem: { item: itemIndex },
					});
					continue;
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
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				const pollInterval = (this.getNodeParameter('pollInterval', itemIndex, 5) as number) || 5;

				// 生成HTML页面，使用新的表格设计
				const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vars Pro Data Monitor</title>
    <style>
        :root {
            --primary: #2563eb;
            --header-bg: #f8fafc;
            --border: #e2e8f0;
            --text-main: #1e293b;
            --text-sub: #64748b;
            --hover-bg: #f1f5f9;
            --code-bg: #1e293b; /* 深色代码块 */
            --code-text: #e2e8f0;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f3f4f6;
            color: var(--text-main);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Header */
        header {
            background: #fff;
            border-bottom: 1px solid var(--border);
            padding: 0.75rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 60px;
            flex-shrink: 0;
        }

        .brand {
            font-size: 1.2rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .brand span { color: var(--text-sub); font-weight: 400; font-size: 0.9em; }
        .tag { background: #e0e7ff; color: var(--primary); padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; font-family: monospace; }

        /* Toolbar */
        .toolbar {
            background: #fff;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            gap: 1rem;
            align-items: center;
            flex-wrap: wrap;
        }

        .search-wrapper {
            position: relative;
            flex-grow: 1;
            max-width: 400px;
        }

        .search-wrapper input {
            width: 100%;
            padding: 8px 12px 8px 35px;
            border: 1px solid var(--border);
            border-radius: 6px;
            outline: none;
            font-size: 14px;
            transition: border 0.2s;
        }

        .search-wrapper input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-sub); font-size: 14px; }

        .btn {
            padding: 8px 16px;
            border-radius: 6px;
            border: 1px solid var(--border);
            background: #fff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .btn:hover { background: var(--hover-bg); }
        .btn-primary { background: var(--primary); color: #fff; border: none; }
        .btn-primary:hover { background: #1d4ed8; }

        .status-bar {
            font-size: 13px;
            color: var(--text-sub);
            margin-left: auto;
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .live-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 0 2px rgba(16,185,129,0.2); animation: pulse 2s infinite; }

        /* Workflow Vars (Header Data) */
        .workflow-vars {
            padding: 10px 1.5rem;
            background: #f8fafc;
            border-bottom: 1px solid var(--border);
            font-size: 13px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .wf-var-item {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            background: #fff;
            padding: 2px 8px;
            display: flex;
            gap: 6px;
        }
        .wf-key { color: var(--text-sub); font-weight: 500; }
        .wf-val { color: var(--text-main); font-family: monospace; font-weight: 600; }

        /* Main Table Container */
        .table-container {
            flex-grow: 1;
            overflow: auto;
            position: relative;
            background: #fff;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            text-align: left;
            min-width: 800px; /* Prevent squishing */
        }

        thead {
            position: sticky;
            top: 0;
            background: var(--header-bg);
            z-index: 10;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        th {
            padding: 12px 16px;
            font-weight: 600;
            color: var(--text-sub);
            border-bottom: 1px solid var(--border);
            white-space: nowrap;
            cursor: pointer;
            user-select: none;
        }
        
        th:hover { color: var(--text-main); background: #f1f5f9; }

        td {
            padding: 10px 16px;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
            color: var(--text-main);
        }

        tr:hover td { background: #f8fafc; }
        tr:last-child td { border-bottom: none; }

        /* Column Specifics */
        .col-id {
            font-family: monospace;
            font-weight: 600;
            color: var(--primary);
            width: 100px;
        }

        /* JSON/Data styling within cells */
        .cell-json {
            font-family: 'Menlo', 'Monaco', monospace;
            font-size: 12px;
            background: var(--code-bg);
            color: var(--code-text);
            padding: 6px 10px;
            border-radius: 4px;
            display: inline-block;
            max-width: 400px;
            max-height: 150px;
            overflow: auto;
            white-space: pre-wrap;
        }
        
        .cell-text {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Scrollbars */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        .empty-state {
            padding: 4rem;
            text-align: center;
            color: var(--text-sub);
        }

        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

    </style>
</head>
<body>
    <header>
        <div class="brand">
            📊 Vars Pro <span>Data Table</span>
            <span class="tag">${workflowId}</span>
        </div>
        <div class="status-bar">
            <div style="display:flex; align-items:center; gap:6px;">
                <div class="live-dot"></div>
                <span>自动刷新 (${pollInterval}s)</span>
            </div>
            <span style="color:#cbd5e1">|</span>
            <span id="lastUpdate">--:--:--</span>
        </div>
    </header>

    <!-- Workflow Level Global Vars (Top Bar) -->
    <div id="workflowVarsContainer" class="workflow-vars" style="display:none;">
        <!-- Injected via JS -->
    </div>

    <div class="toolbar">
        <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchInput" placeholder="筛选执行 ID 或 变量内容..." onkeyup="applyFilter()">
        </div>
        <button class="btn" onclick="copyAllData()">📋 复制 JSON</button>
        <button class="btn btn-primary" onclick="manualRefresh()">🔄 刷新</button>
    </div>

    <div class="table-container">
        <table id="dataTable">
            <thead>
                <!-- Dynamic Headers -->
            </thead>
            <tbody>
                <!-- Dynamic Rows -->
            </tbody>
        </table>
        <div id="emptyMsg" class="empty-state" style="display:none;">暂无数据或无匹配结果</div>
    </div>

    <script>
        // --- Config ---
        const initialData = ${JSON.stringify(data)};
        const pollIntervalMs = ${pollInterval * 1000};
        let currentData = initialData;
        let refreshInterval;
        let sortCol = 'execId'; // default sort
        let sortAsc = false; // default desc (newest first)

        // --- Core Logic ---

        function getUniqueKeys(executions) {
            const keys = new Set();
            Object.values(executions).forEach(exec => {
                if(exec && typeof exec === 'object') {
                    Object.keys(exec).forEach(k => keys.add(k));
                }
            });
            return Array.from(keys).sort();
        }

        function formatValue(val) {
            if (val === null) return '<span style="color:#94a3b8">null</span>';
            if (val === undefined) return '';
            
            const type = typeof val;
            
            if (type === 'object') {
                // Formatting JSON with basic syntax coloring
                const str = JSON.stringify(val, null, 2);
                return '<div class="cell-json">' + str + '</div>';
            }
            
            if (type === 'boolean') {
                return val ? '<span style="color:#10b981; font-weight:bold">true</span>' : '<span style="color:#ef4444; font-weight:bold">false</span>';
            }
            
            return '<div class="cell-text" title="' + val + '">' + val + '</div>';
        }

        function renderWorkflowVars(wfData) {
            const container = document.getElementById('workflowVarsContainer');
            if (!wfData || Object.keys(wfData).length === 0) {
                container.style.display = 'none';
                return;
            }
            
            let html = '<span style="font-weight:600; margin-right:10px;">Global:</span>';
            for (const [k, v] of Object.entries(wfData)) {
                let displayVal = (typeof v === 'object') ? '{...}' : v;
                html += '<div class="wf-var-item"><span class="wf-key">' + k + ':</span><span class="wf-val">' + displayVal + '</span></div>';
            }
            container.innerHTML = html;
            container.style.display = 'flex';
        }

        function renderTable(data, filterText = '') {
            const table = document.getElementById('dataTable');
            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');
            const emptyMsg = document.getElementById('emptyMsg');

            if (!data.executions || Object.keys(data.executions).length === 0) {
                thead.innerHTML = '';
                tbody.innerHTML = '';
                emptyMsg.style.display = 'block';
                emptyMsg.textContent = '暂无执行记录';
                return;
            }

            // 1. Prepare Data Array for easy sorting/filtering
            let rows = Object.entries(data.executions).map(([id, vars]) => ({
                id: id,
                vars: vars,
                rawString: (id + JSON.stringify(vars)).toLowerCase() // For search
            }));

            // 2. Filter
            if (filterText) {
                const lowerFilter = filterText.toLowerCase();
                rows = rows.filter(r => r.rawString.includes(lowerFilter));
            }

            if (rows.length === 0) {
                tbody.innerHTML = '';
                emptyMsg.style.display = 'block';
                return;
            } else {
                emptyMsg.style.display = 'none';
            }

            // 3. Get Columns (Dynamics)
            const variableKeys = getUniqueKeys(data.executions);

            // 4. Sort
            rows.sort((a, b) => {
                let valA, valB;
                if (sortCol === 'execId') {
                    // Try numeric sort for IDs if possible, else string
                    valA = parseInt(a.id) || a.id;
                    valB = parseInt(b.id) || b.id;
                } else {
                    // Sort by variable value
                    valA = a.vars[sortCol] !== undefined ? JSON.stringify(a.vars[sortCol]) : '';
                    valB = b.vars[sortCol] !== undefined ? JSON.stringify(b.vars[sortCol]) : '';
                }

                if (valA < valB) return sortAsc ? -1 : 1;
                if (valA > valB) return sortAsc ? 1 : -1;
                return 0;
            });

            // 5. Render Header
            let headerHtml = '<tr>';
            // ID Column with sort indicator
            const arrow = sortCol === 'execId' ? (sortAsc ? ' ↑' : ' ↓') : '';
            headerHtml += '<th onclick="changeSort(\\'execId\\')">Execution ID' + arrow + '</th>';
            
            variableKeys.forEach(key => {
                const kArrow = sortCol === key ? (sortAsc ? ' ↑' : ' ↓') : '';
                headerHtml += '<th onclick="changeSort(\\'' + key + '\\')">' + key + kArrow + '</th>';
            });
            headerHtml += '</tr>';
            thead.innerHTML = headerHtml;

            // 6. Render Body
            let bodyHtml = '';
            rows.forEach(row => {
                bodyHtml += '<tr>';
                bodyHtml += '<td class="col-id">#' + row.id + '</td>';
                
                variableKeys.forEach(key => {
                    const val = row.vars[key];
                    bodyHtml += '<td>' + formatValue(val) + '</td>';
                });
                
                bodyHtml += '</tr>';
            });
            tbody.innerHTML = bodyHtml;
        }

        // --- Interactions ---

        function applyFilter() {
            const input = document.getElementById('searchInput');
            renderTable(currentData, input.value);
        }

        function changeSort(column) {
            if (sortCol === column) {
                sortAsc = !sortAsc; // toggle
            } else {
                sortCol = column;
                sortAsc = true; // reset to asc for new col
            }
            applyFilter(); // Re-render
        }

        function manualRefresh() {
            refreshData();
            // Reset timer
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(refreshData, pollIntervalMs);
        }

        function copyAllData() {
            const str = JSON.stringify(currentData, null, 2);
            navigator.clipboard.writeText(str).then(() => {
                alert('完整 JSON 数据已复制到剪贴板');
            });
        }

        async function refreshData() {
            const timeLabel = document.getElementById('lastUpdate');
            try {
                const res = await fetch(window.location.href + '?t=' + Date.now(), {
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });
                const newData = await res.json();
                
                // Compare hash to avoid unnecessary re-renders if strict needs, 
                // strictly speaking for table interaction it's better to just update data reference
                // and re-render only if changed.
                if (JSON.stringify(newData) !== JSON.stringify(currentData)) {
                    currentData = newData;
                    if(currentData.workflow) renderWorkflowVars(currentData.workflow);
                    applyFilter(); // Preserves search input state
                }
                
                timeLabel.textContent = new Date().toLocaleTimeString();
            } catch (e) {
                timeLabel.textContent = "Error";
                console.error(e);
            }
        }

        // --- Init ---
        (function init() {
            if (currentData.workflow) renderWorkflowVars(currentData.workflow);
            applyFilter(); // Initial render
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
            
            if (pollIntervalMs > 0) {
                refreshInterval = setInterval(refreshData, pollIntervalMs);
            }
            
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) clearInterval(refreshInterval);
                else manualRefresh();
            });
        })();

    </script>
</body>
</html>`;

				// 返回HTML和数据
				returnData.push({
					json: {
						html: html,
						body: html, // 提供body字段，方便HTTP Response节点使用
						data: data,
						_contentType: 'text/html',
					},
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: itemIndex },
					});
				} else {
					if (error instanceof NodeOperationError && error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
