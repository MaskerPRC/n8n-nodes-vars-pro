import * as fs from 'fs';
import * as path from 'path';
import type { IDataObject } from 'n8n-workflow';

const DATA_BASE_DIR = process.env.N8N_DATA_DIR || path.join(process.env.HOME || process.env.USERPROFILE || process.cwd(), '.n8n', 'varsProData');

/**
 * Get workflow data path
 */
export function getWorkflowDataPath(workflowId: string): string {
	const workflowDir = path.join(DATA_BASE_DIR, 'workflows', workflowId);
	if (!fs.existsSync(workflowDir)) {
		fs.mkdirSync(workflowDir, { recursive: true });
	}
	return path.join(workflowDir, 'workflow-data.json');
}

/**
 * Get execution data path
 */
export function getExecutionDataPath(workflowId: string, executionId: string): string {
	const workflowDir = path.join(DATA_BASE_DIR, 'workflows', workflowId);
	if (!fs.existsSync(workflowDir)) {
		fs.mkdirSync(workflowDir, { recursive: true });
	}
	return path.join(workflowDir, `${executionId}.json`);
}

/**
 * Read JSON file
 */
export function readJsonFile(filePath: string): IDataObject {
	try {
		if (!fs.existsSync(filePath)) {
			return {};
		}
		const content = fs.readFileSync(filePath, 'utf-8');
		return JSON.parse(content) as IDataObject;
	} catch (error) {
		throw new Error(`Failed to read file: ${filePath}, Error: ${error}`);
	}
}

/**
 * Write JSON file
 */
export function writeJsonFile(filePath: string, data: IDataObject): void {
	try {
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
	} catch (error) {
		throw new Error(`Failed to write file: ${filePath}, Error: ${error}`);
	}
}

/**
 * Delete file
 */
export function deleteFile(filePath: string): boolean {
	try {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
			return true;
		}
		return false;
	} catch (error) {
		throw new Error(`Failed to delete file: ${filePath}, Error: ${error}`);
	}
}

/**
 * Set data in JSON file (supports nested paths)
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
 * Get data from JSON file (supports nested paths)
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
 * Delete data from JSON file (supports nested paths)
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

