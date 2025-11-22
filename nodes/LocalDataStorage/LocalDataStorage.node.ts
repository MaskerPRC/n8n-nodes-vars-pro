import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	getWorkflowDataPath,
	getExecutionDataPath,
	setDataInJson,
	getDataFromJson,
	deleteDataFromJson,
} from './shared/fileUtils';

export class LocalDataStorage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Local Data Storage',
		name: 'localDataStorage',
		icon: 'file:storage.svg',
		group: ['transform'],
		version: 1,
		description: '存储和读取本地JSON文件数据',
		defaults: {
			name: 'Local Data Storage',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '设置数据',
						value: 'set',
						description: '设置数据到JSON文件',
						action: '设置数据到JSON文件',
					},
					{
						name: '读取数据',
						value: 'get',
						description: '从JSON文件读取数据',
						action: '从JSON文件读取数据',
					},
					{
						name: '删除数据',
						value: 'delete',
						description: '从JSON文件删除数据',
						action: '从JSON文件删除数据',
					},
				],
				default: 'set',
			},
			{
				displayName: '数据类型',
				name: 'dataType',
				type: 'options',
				options: [
					{
						name: '执行级别数据',
						value: 'execution',
						description: '每个执行创建独立的JSON文件（以执行ID命名）',
					},
					{
						name: '工作流级别数据',
						value: 'workflow',
						description: '工作流共享的JSON文件（以工作流ID命名）',
					},
				],
				default: 'execution',
				description: '选择要操作的数据类型',
			},
			{
				displayName: '数据键',
				name: 'key',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['set', 'delete'],
					},
				},
				description: '数据的键名（支持嵌套路径，如 "user.name"）',
			},
			{
				displayName: '数据键',
				name: 'key',
				type: 'string',
				default: '',

				displayOptions: {
					show: {
						operation: ['get'],
					},
				},
				description: '数据的键名（支持嵌套路径，如 "user.name"）。留空则返回所有数据',
			},
			{
				displayName: '数据值',
				name: 'value',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['set'],
					},
				},
				description: '要设置的数据值（支持表达式）',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '自动创建文件',
						name: 'autoCreate',
						type: 'boolean',
						default: true,
						description: '如果文件不存在，是否自动创建',
					},
				],
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const dataType = this.getNodeParameter('dataType', itemIndex) as 'execution' | 'workflow';
				const key = this.getNodeParameter('key', itemIndex, '') as string;

				// 获取工作流ID和执行ID
				const workflow = this.getWorkflow();
				const workflowId = workflow.id || 'default';
				const executionId = this.getExecutionId() || `exec-${Date.now()}`;

				// 确定文件路径
				let filePath: string;
				if (dataType === 'workflow') {
					filePath = getWorkflowDataPath(workflowId);
				} else {
					filePath = getExecutionDataPath(workflowId, executionId);
				}

				let result: any;

				switch (operation) {
					case 'set': {
						const value = this.getNodeParameter('value', itemIndex);
						// 如果value已经是对象或数组，直接使用
						// 如果是字符串，尝试解析为JSON，如果失败则作为字符串处理
						let parsedValue: any = value;
						if (typeof value === 'string' && value !== null && value !== undefined) {
							const trimmed = value.trim();
							if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
								try {
									parsedValue = JSON.parse(value);
								} catch {
									// 不是有效的JSON，保持原字符串值
									parsedValue = value;
								}
							}
						}
						result = setDataInJson(filePath, key, parsedValue, dataType);
						break;
					}
					case 'get': {
						const keyValue = this.getNodeParameter('key', itemIndex, '') as string;
						result = getDataFromJson(filePath, keyValue || undefined);
						break;
					}
					case 'delete': {
						result = deleteDataFromJson(filePath, key);
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`不支持的操作: ${operation}`,
							{ itemIndex },
						);
				}

				// 返回结果
				returnData.push({
					json: {
						operation,
						dataType,
						key,
						result,
						filePath,
						workflowId,
						executionId: dataType === 'execution' ? executionId : undefined,
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

