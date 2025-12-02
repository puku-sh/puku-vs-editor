/*---------------------------------------------------------------------------------------------
 *  Puku AI Semantic Search Flow Tests
 *  Tests for signature extraction and semantic code search
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { SemanticSearchFlow } from '../../vscode-node/flows/semanticSearch';

suite('SemanticSearchFlow', function () {
	let flow: SemanticSearchFlow;
	let mockIndexingService: any;

	setup(function () {
		mockIndexingService = {
			isAvailable: () => true,
			search: async () => []
		};
		flow = new SemanticSearchFlow(mockIndexingService);
	});

	suite('searchSimilarCode', function () {
		test('returns empty array when indexing not available', async function () {
			const unavailableService = {
				isAvailable: () => false,
				search: async () => []
			};
			const flowWithUnavailable = new SemanticSearchFlow(unavailableService);

			const results = await flowWithUnavailable.searchSimilarCode(
				'calculate sum',
				2,
				'javascript',
				vscode.Uri.file('/test/file.js')
			);
			assert.deepStrictEqual(results, []);
		});

		test('excludes same-file results', async function () {
			const currentFileUri = vscode.Uri.file('/test/current.js');
			const mockService = {
				isAvailable: () => true,
				search: async () => [
					{
						uri: currentFileUri,
						content: 'function test() { return 42; }',
						chunkType: 'function',
						symbolName: 'test',
						lineStart: 1,
						lineEnd: 1
					},
					{
						uri: vscode.Uri.file('/test/other.js'),
						content: 'function calculate(a, b) {\n  return a + b;\n}',
						chunkType: 'function',
						symbolName: 'calculate',
						lineStart: 1,
						lineEnd: 3
					}
				]
			};
			const flowWithMock = new SemanticSearchFlow(mockService);

			const results = await flowWithMock.searchSimilarCode(
				'calculate sum',
				2,
				'javascript',
				currentFileUri
			);

			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].filepath, '/test/other.js');
		});

		test('extracts function signature (not full implementation)', async function () {
			const mockService = {
				isAvailable: () => true,
				search: async () => [
					{
						uri: vscode.Uri.file('/test/other.js'),
						content: 'function calculate(a, b) {\n  return a + b;\n}',
						chunkType: 'function',
						symbolName: 'calculate',
						lineStart: 1,
						lineEnd: 3
					}
				]
			};
			const flowWithMock = new SemanticSearchFlow(mockService);

			const results = await flowWithMock.searchSimilarCode(
				'calculate sum',
				2,
				'javascript',
				vscode.Uri.file('/test/current.js')
			);

			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].content, 'function calculate(a, b)');
		});

		test('extracts class signature', async function () {
			const mockService = {
				isAvailable: () => true,
				search: async () => [
					{
						uri: vscode.Uri.file('/test/other.ts'),
						content: 'class Calculator {\n  add(a, b) { return a + b; }\n}',
						chunkType: 'class',
						symbolName: 'Calculator',
						lineStart: 1,
						lineEnd: 3
					}
				]
			};
			const flowWithMock = new SemanticSearchFlow(mockService);

			const results = await flowWithMock.searchSimilarCode(
				'calculator class',
				2,
				'typescript',
				vscode.Uri.file('/test/current.ts')
			);

			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].content, 'class Calculator');
		});

		test('extracts interface signature', async function () {
			const mockService = {
				isAvailable: () => true,
				search: async () => [
					{
						uri: vscode.Uri.file('/test/other.ts'),
						content: 'interface User {\n  name: string;\n  age: number;\n}',
						chunkType: 'interface',
						symbolName: 'User',
						lineStart: 1,
						lineEnd: 4
					}
				]
			};
			const flowWithMock = new SemanticSearchFlow(mockService);

			const results = await flowWithMock.searchSimilarCode(
				'user interface',
				2,
				'typescript',
				vscode.Uri.file('/test/current.ts')
			);

			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].content, 'interface User');
		});

		test('extracts method signature', async function () {
			const mockService = {
				isAvailable: () => true,
				search: async () => [
					{
						uri: vscode.Uri.file('/test/other.ts'),
						content: 'add(a: number, b: number): number {\n  return a + b;\n}',
						chunkType: 'method',
						symbolName: 'add',
						lineStart: 1,
						lineEnd: 3
					}
				]
			};
			const flowWithMock = new SemanticSearchFlow(mockService);

			const results = await flowWithMock.searchSimilarCode(
				'add method',
				2,
				'typescript',
				vscode.Uri.file('/test/current.ts')
			);

			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].content, 'add(a: number, b: number): number');
		});

		test('handles fallback for chunks without metadata', async function () {
			const mockService = {
				isAvailable: () => true,
				search: async () => [
					{
						uri: vscode.Uri.file('/test/other.js'),
						content: '// Some comment\nfunction test() {\n  return 42;\n}',
						// No chunkType or symbolName
						lineStart: 1,
						lineEnd: 4
					}
				]
			};
			const flowWithMock = new SemanticSearchFlow(mockService);

			const results = await flowWithMock.searchSimilarCode(
				'test function',
				2,
				'javascript',
				vscode.Uri.file('/test/current.js')
			);

			assert.strictEqual(results.length, 1);
			// Should extract first non-comment line
			assert.strictEqual(results[0].content, 'function test()');
		});

		test('handles export class syntax', async function () {
			const mockService = {
				isAvailable: () => true,
				search: async () => [
					{
						uri: vscode.Uri.file('/test/other.ts'),
						content: 'export class Calculator {\n  add(a, b) { return a + b; }\n}',
						chunkType: 'class',
						symbolName: 'Calculator',
						lineStart: 1,
						lineEnd: 3
					}
				]
			};
			const flowWithMock = new SemanticSearchFlow(mockService);

			const results = await flowWithMock.searchSimilarCode(
				'calculator',
				2,
				'typescript',
				vscode.Uri.file('/test/current.ts')
			);

			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].content, 'export class Calculator');
		});
	});
});
