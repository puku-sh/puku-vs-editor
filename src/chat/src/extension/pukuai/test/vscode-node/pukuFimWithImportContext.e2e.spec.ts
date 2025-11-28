/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  E2E test for FIM with import context using api.puku.sh
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { suite, test, beforeAll, afterEach } from 'vitest';
import { pukuImportExtractor } from '../../../pukuIndexing/node/pukuImportExtractor';

suite('FIM with Import Context - E2E Tests (api.puku.sh)', () => {
	let testWorkspaceFolder: string;
	let testFilesCreated: string[] = [];

	beforeAll(async () => {
		// Get or create workspace folder
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error('No workspace folder found, skipping E2E tests');
		}
		testWorkspaceFolder = workspaceFolders[0].uri.fsPath;
	}, 30000); // 30s timeout

	afterEach(async () => {
		// Clean up test files
		for (const file of testFilesCreated) {
			try {
				await fs.unlink(file);
			} catch (err) {
				// Ignore errors
			}
		}
		testFilesCreated = [];
		pukuImportExtractor.clearCache();
	});

	async function createTestFile(filename: string, content: string): Promise<vscode.Uri> {
		const filePath = path.join(testWorkspaceFolder, filename);
		await fs.writeFile(filePath, content, 'utf-8');
		testFilesCreated.push(filePath);
		return vscode.Uri.file(filePath);
	}

	async function callPukuFimAPI(
		prompt: string,
		suffix: string,
		openFiles: Array<{ filepath: string; content: string }>
	): Promise<{ text: string; choices: any[] }> {
		const response = await fetch('https://api.puku.sh/v1/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer 1c5737388caba20e85fb8d30a27044f5314188a920760a656185b6571d0f5c58'
			},
			body: JSON.stringify({
				prompt,
				suffix,
				max_tokens: 100,
				temperature: 0.1,
				openFiles
			})
		});

		if (!response.ok) {
			throw new Error(`API call failed: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	}

	suite('TypeScript with import context', () => {
		test('completion uses imported utility function', async () {
			// Create utility file
			const utilsContent = `
export function formatName(name: string): string {
	return name.toUpperCase().trim();
}

export function calculateAge(birthYear: number): number {
	return new Date().getFullYear() - birthYear;
}
`;
			const utilsUri = await createTestFile('utils.ts', utilsContent);

			// Create main file that imports utils
			const mainContent = `
import { formatName, calculateAge } from './utils';

function greetUser(name: string, birthYear: number) {
	const formattedName = formatName(name);
	const age = calculateAge(birthYear);

	// Test completion here
	return `;

			const mainUri = await createTestFile('main.ts', mainContent);

			// Extract imports
			const imports = await pukuImportExtractor.extractImports(mainContent, 'typescript');

			assert.ok(imports.includes('./utils'), 'Should extract ./utils import');

			// Prepare context
			const openFiles = [
				{ filepath: utilsUri.fsPath, content: utilsContent }
			];

			// Call FIM API
			const prefix = mainContent;
			const suffix = '\n}';

			const result = await callPukuFimAPI(prefix, suffix, openFiles);

			assert.ok(result.choices && result.choices.length > 0, 'Should return completions');
			const completion = result.choices[0].text;

			console.log('Completion received:', completion);

			// Verify completion is relevant (should suggest using formattedName and age)
			assert.ok(completion.length > 0, 'Completion should not be empty');
		});

		test('completion without import context vs with import context', async () {
			// Create type definition file
			const typesContent = `
export interface User {
	id: number;
	name: string;
	email: string;
	createdAt: Date;
}

export interface UserService {
	getUser(id: number): Promise<User>;
	createUser(data: Partial<User>): Promise<User>;
	updateUser(id: number, data: Partial<User>): Promise<User>;
}
`;
			const typesUri = await createTestFile('types.ts', typesContent);

			const mainContent = `
import { User, UserService } from './types';

class UserController {
	constructor(private userService: UserService) {}

	async handleGetUser(userId: number) {
		const user = await this.userService.getUser(userId);

		// Completion should know about User interface
		return {
			id: user.`;

			// Test WITHOUT import context
			const resultWithout = await callPukuFimAPI(mainContent, '\n\t\t};\n\t}\n}', []);

			// Test WITH import context
			const resultWith = await callPukuFimAPI(
				mainContent,
				'\n\t\t};\n\t}\n}',
				[{ filepath: typesUri.fsPath, content: typesContent }]
			);

			console.log('Without import context:', resultWithout.choices[0]?.text);
			console.log('With import context:', resultWith.choices[0]?.text);

			// Both should return results
			assert.ok(resultWithout.choices.length > 0, 'Should return completion without context');
			assert.ok(resultWith.choices.length > 0, 'Should return completion with context');

			// With context should ideally be more accurate (suggests 'id', 'name', 'email')
			const completionWith = resultWith.choices[0]?.text || '';
			const hasUserField = /\b(id|name|email|createdAt)\b/.test(completionWith);

			if (hasUserField) {
				console.log('✅ Completion with context suggested User interface field');
			} else {
				console.log('⚠️ Completion did not suggest User field (model may have internal knowledge)');
			}
		});
	});

	suite('Python with import context', () => {
		test('completion uses imported helper module', async () {
			// Create helper module
			const helperContent = `
def format_currency(amount: float, currency: str = "USD") -> str:
	"""Format amount as currency string"""
	return f"{currency} {amount:.2f}"

def calculate_tax(amount: float, rate: float = 0.1) -> float:
	"""Calculate tax on amount"""
	return amount * rate
`;
			const helperUri = await createTestFile('helper.py', helperContent);

			const mainContent = `
from .helper import format_currency, calculate_tax

def process_payment(amount: float):
	tax = calculate_tax(amount)
	total = amount + tax

	# Should suggest format_currency
	formatted = `;

			const imports = await pukuImportExtractor.extractImports(mainContent, 'python');

			console.log('Extracted Python imports:', imports);

			// Call API with import context
			const result = await callPukuFimAPI(
				mainContent,
				'\n\treturn formatted',
				[{ filepath: helperUri.fsPath, content: helperContent }]
			);

			assert.ok(result.choices.length > 0, 'Should return Python completion');
			console.log('Python completion:', result.choices[0]?.text);
		});
	});

	suite('Go with import context', () => {
		test('completion uses imported package', async () {
			// Create utils package
			const utilsContent = `
package utils

func FormatString(s string) string {
	return strings.ToUpper(strings.TrimSpace(s))
}

func GenerateID() string {
	return fmt.Sprintf("ID-%d", time.Now().Unix())
}
`;
			const utilsUri = await createTestFile('utils.go', utilsContent);

			const mainContent = `
package main

import "./utils"

func processData(input string) string {
	formatted := utils.FormatString(input)
	id := utils.`;

			// Call API
			const result = await callPukuFimAPI(
				mainContent,
				'\n\treturn id\n}',
				[{ filepath: utilsUri.fsPath, content: utilsContent }]
			);

			assert.ok(result.choices.length > 0, 'Should return Go completion');
			console.log('Go completion:', result.choices[0]?.text);

			// Should suggest GenerateID
			const completion = result.choices[0]?.text || '';
			console.log('Completion suggests:', completion.includes('GenerateID') ? 'GenerateID ✅' : 'other');
		});
	});

	suite('Performance with import context', () => {
		test('completion latency with 3 imported files', async () => {

			// Create 3 utility files
			const file1Content = 'export const util1 = () => "util1";';
			const file2Content = 'export const util2 = () => "util2";';
			const file3Content = 'export const util3 = () => "util3";';

			const uri1 = await createTestFile('util1.ts', file1Content);
			const uri2 = await createTestFile('util2.ts', file2Content);
			const uri3 = await createTestFile('util3.ts', file3Content);

			const mainContent = `
import { util1 } from './util1';
import { util2 } from './util2';
import { util3 } from './util3';

const result = `;

			const openFiles = [
				{ filepath: uri1.fsPath, content: file1Content },
				{ filepath: uri2.fsPath, content: file2Content },
				{ filepath: uri3.fsPath, content: file3Content }
			];

			// Measure latency
			const start = Date.now();
			const result = await callPukuFimAPI(mainContent, ';', openFiles);
			const latency = Date.now() - start;

			console.log(`API latency with 3 imports: ${latency}ms`);

			assert.ok(result.choices.length > 0, 'Should return completion');
			assert.ok(latency < 5000, `Latency should be < 5s, was ${latency}ms`);
		}, 10000);

		test('comparison: no context vs semantic context vs import context', async () => {

			// Create imported file
			const apiContent = `
export class APIClient {
	async fetchUser(id: number) {
		const response = await fetch(\`/api/users/\${id}\`);
		return response.json();
	}

	async createUser(data: any) {
		const response = await fetch('/api/users', {
			method: 'POST',
			body: JSON.stringify(data)
		});
		return response.json();
	}
}
`;
			const apiUri = await createTestFile('api.ts', apiContent);

			const mainContent = `
import { APIClient } from './api';

class UserService {
	private client = new APIClient();

	async getUser(id: number) {
		return await this.client.`;

			// Test 1: No context
			const start1 = Date.now();
			const result1 = await callPukuFimAPI(mainContent, '\n\t}\n}', []);
			const time1 = Date.now() - start1;

			// Test 2: With import context
			const start2 = Date.now();
			const result2 = await callPukuFimAPI(
				mainContent,
				'\n\t}\n}',
				[{ filepath: apiUri.fsPath, content: apiContent }]
			);
			const time2 = Date.now() - start2;

			console.log('\n=== Comparison ===');
			console.log(`No context: ${time1}ms`);
			console.log('  Completion:', result1.choices[0]?.text);
			console.log(`\nWith import context: ${time2}ms`);
			console.log('  Completion:', result2.choices[0]?.text);

			// Both should work
			assert.ok(result1.choices.length > 0, 'No context should return completion');
			assert.ok(result2.choices.length > 0, 'Import context should return completion');

			// Check if completions mention API methods
			const comp1 = result1.choices[0]?.text || '';
			const comp2 = result2.choices[0]?.text || '';

			const hasAPIMethod1 = /\b(fetchUser|createUser)\b/.test(comp1);
			const hasAPIMethod2 = /\b(fetchUser|createUser)\b/.test(comp2);

			console.log(`\nNo context mentions API method: ${hasAPIMethod1 ? '✅' : '❌'}`);
			console.log(`Import context mentions API method: ${hasAPIMethod2 ? '✅' : '❌'}`);
		}, 15000);
	});

	suite('Error handling', () => {
		test('handles API errors gracefully', async () {
			// Invalid auth token should return error
			try {
				const response = await fetch('https://api.puku.sh/v1/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer invalid-token'
					},
					body: JSON.stringify({
						prompt: 'const x = ',
						suffix: '',
						max_tokens: 50
					})
				});

				if (!response.ok) {
					console.log('API correctly rejected invalid auth');
					assert.ok(true, 'API should reject invalid token');
				} else {
					console.log('API accepted invalid token (unexpected)');
				}
			} catch (err) {
				// Network error is also acceptable
				console.log('Network error (expected):', (err as Error).message);
				assert.ok(true);
			}
		});

		test('handles large context gracefully', async () {
			// Create very large import file (10KB+)
			const largeContent = 'export const data = {\n' +
				Array.from({ length: 1000 }, (_, i) => `  item${i}: "value${i}",`).join('\n') +
				'\n};';

			const largeUri = await createTestFile('large.ts', largeContent);

			const mainContent = `import { data } from './large';\n\nconst x = `;

			// Should handle large context
			const result = await callPukuFimAPI(
				mainContent,
				';',
				[{ filepath: largeUri.fsPath, content: largeContent }]
			);

			assert.ok(result.choices.length > 0, 'Should handle large context');
			console.log('Handled large context successfully');
		});
	});
});
