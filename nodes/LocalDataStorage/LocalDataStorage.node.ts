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
		displayName: 'Vars Pro Storage',
		name: 'varsProStorage',
		icon: 'file:storage.svg',
		group: ['transform'],
		version: 1,
		description: 'Vars Pro - Store and read local JSON file data (Execution & Workflow Level)',
		defaults: {
			name: 'Vars Pro Storage',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Set Data',
						value: 'set',
						description: 'Set data in JSON file',
						action: 'Set data in JSON file',
					},
					{
						name: 'Get Data',
						value: 'get',
						description: 'Get data from JSON file',
						action: 'Get data from JSON file',
					},
					{
						name: 'Delete Data',
						value: 'delete',
						description: 'Delete data from JSON file',
						action: 'Delete data from JSON file',
					},
				],
				default: 'set',
			},
			{
				displayName: 'Data Type',
				name: 'dataType',
				type: 'options',
				options: [
					{
						name: 'Execution Level',
						value: 'execution',
						description: 'Creates independent JSON file for each execution (named by execution ID)',
					},
					{
						name: 'Workflow Level',
						value: 'workflow',
						description: 'Shared JSON file for the workflow (named by workflow ID)',
					},
				],
				default: 'execution',
				description: 'Select data type to operate on',
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['set', 'delete'],
					},
				},
				description: 'Key name (supports nested paths, e.g. "user.name")',
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: '',

				displayOptions: {
					show: {
						operation: ['get'],
					},
				},
				description: 'Key name (supports nested paths, e.g. "user.name"). Leave empty to get all data.',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['set'],
					},
				},
				description: 'Value to set (supports expressions)',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Auto Create File',
						name: 'autoCreate',
						type: 'boolean',
						default: true,
						description: 'Whether to automatically create file if it does not exist',
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

				// Get workflow ID and execution ID
				const workflow = this.getWorkflow();
				const workflowId = workflow.id || 'default';
				const executionId = this.getExecutionId() || `exec-${Date.now()}`;

				// Determine file path
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
						// If value is already object or array, use it directly
						// If string, try to parse as JSON, fallback to string if failed
						let parsedValue: any = value;
						if (typeof value === 'string' && value !== null && value !== undefined) {
							const trimmed = value.trim();
							if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
								try {
									parsedValue = JSON.parse(value);
								} catch {
									// Not valid JSON, keep as string
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
							`Unsupported operation: ${operation}`,
							{ itemIndex },
						);
				}

				// Return result
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

