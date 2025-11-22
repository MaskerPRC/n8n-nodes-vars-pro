import * as fs from 'fs';
import * as path from 'path';
import type { IDataObject } from 'n8n-workflow';

const DATA_BASE_DIR = process.env.N8N_DATA_DIR || path.join(process.cwd(), '.n8n-data');

/**
 * 获取工作流级别的数据文件路径
 */
export function getWorkflowDataPath(workflowId: string): string {
	const workflowDir = path.join(DATA_BASE_DIR, 'workflows', workflowId);
	if (!fs.existsSync(workflowDir)) {
		fs.mkdirSync(workflowDir, { recursive: true });
	}
	return path.join(workflowDir, 'workflow-data.json');
}

/**
 * 获取执行级别的数据文件路径
 */
export function getExecutionDataPath(workflowId: string, executionId: string): string {
	const workflowDir = path.join(DATA_BASE_DIR, 'workflows', workflowId);
	if (!fs.existsSync(workflowDir)) {
		fs.mkdirSync(workflowDir, { recursive: true });
	}
	return path.join(workflowDir, `${executionId}.json`);
}

/**
 * 读取JSON文件
 */
export function readJsonFile(filePath: string): IDataObject {
	try {
		if (!fs.existsSync(filePath)) {
			return {};
		}
		const content = fs.readFileSync(filePath, 'utf-8');
		return JSON.parse(content) as IDataObject;
	} catch (error) {
		throw new Error(`读取文件失败: ${filePath}, 错误: ${error}`);
	}
}

/**
 * 写入JSON文件
 */
export function writeJsonFile(filePath: string, data: IDataObject): void {
	try {
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
	} catch (error) {
		throw new Error(`写入文件失败: ${filePath}, 错误: ${error}`);
	}
}

/**
 * 删除文件
 */
export function deleteFile(filePath: string): boolean {
	try {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
			return true;
		}
		return false;
	} catch (error) {
		throw new Error(`删除文件失败: ${filePath}, 错误: ${error}`);
	}
}

/**
 * 设置数据到JSON文件（支持嵌套路径）
 */
export function setDataInJson(
	filePath: string,
	key: string,
	value: any,
	dataType: 'workflow' | 'execution',
): IDataObject {
	const data = readJsonFile(filePath);
	
	// 支持嵌套路径，如 "user.name"
	const keys = key.split('.');
	let current: any = data;
	
	for (let i = 0; i < keys.length - 1; i++) {
		const k = keys[i];
		if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
			current[k] = {};
		}
		current = current[k];
	}
	
	current[keys[keys.length - 1]] = value;
	
	writeJsonFile(filePath, data);
	return data;
}

/**
 * 从JSON文件读取数据（支持嵌套路径）
 */
export function getDataFromJson(filePath: string, key?: string): any {
	const data = readJsonFile(filePath);
	
	if (!key) {
		return data;
	}
	
	// 支持嵌套路径
	const keys = key.split('.');
	let current: any = data;
	
	for (const k of keys) {
		if (current === null || current === undefined || typeof current !== 'object') {
			return undefined;
		}
		current = current[k];
	}
	
	return current;
}

/**
 * 从JSON文件删除数据（支持嵌套路径）
 */
export function deleteDataFromJson(filePath: string, key: string): IDataObject {
	const data = readJsonFile(filePath);
	
	// 支持嵌套路径
	const keys = key.split('.');
	let current: any = data;
	
	for (let i = 0; i < keys.length - 1; i++) {
		const k = keys[i];
		if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
			return data; // 路径不存在，直接返回
		}
		current = current[k];
	}
	
	delete current[keys[keys.length - 1]];
	
	writeJsonFile(filePath, data);
	return data;
}

