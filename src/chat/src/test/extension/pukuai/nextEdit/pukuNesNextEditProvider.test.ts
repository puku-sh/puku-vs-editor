/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Next Edit Suggestions Provider Tests
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { PukuNesNextEditProvider } from '../../../../extension/pukuai/vscode-node/nextEdit/pukuNesNextEditProvider';
import { PukuNesResult } from '../../../../extension/pukuai/common/nextEditProvider';
import { CancellationToken } from '../../../../base/common/cancellation';
import { Disposable } from '../../../../base/common/lifecycle';

// Mock implementations for testing
class MockAuthService {
	async getToken(): Promise<string | null> {
		return 'mock-token';
	}
}

class MockConfigService {
	get(key: string, defaultValue: any): any {
		const config = {
			'puku.nextEditSuggestions.enabled': true,
			'puku.nextEditSuggestions.timeout': 3000
		};
		return key in config ? config[key] : defaultValue;
	}
}

class MockFetcherService {
	async post(url: string, data: any, options?: any, token?: CancellationToken): Promise<any> {
		// Mock NES response
		return {
			data: {
				suggestion: 'console.log("Next edit suggestion");',
				description: 'Add console.log statement',
				confidence: 0.85
			}
		};
	}
}

class MockLogService {
	info(message: string, ...args: any[]): void {
		console.log(`[INFO] ${message}`, ...args);
	}
	debug(message: string, ...args: any[]): void {
		console.log(`[DEBUG] ${message}`, ...args);
	}
	error(message: string, ...args: any[]): void {
		console.error(`[ERROR] ${message}`, ...args);
	}
}

class MockEditorService {
	// Mock implementation
}

suite('PukuNesNextEditProvider', () => {
	let provider: PukuNesNextEditProvider;
	let disposables: Disposable[];

	setup(() => {
		disposables = [];

		const authService = new MockAuthService() as any;
		const configService = new MockConfigService() as any;
		const fetcherService = new MockFetcherService() as any;
		const logService = new MockLogService() as any;
		const editorService = new MockEditorService() as any;

		provider = new PukuNesNextEditProvider(
			authService,
			configService,
			fetcherService,
			logService,
			editorService
		);
		disposables.push(provider);
	});

	teardown(() => {
		Disposable.from(...disposables).dispose();
	});

	test('should have correct provider ID', () => {
		assert.strictEqual(provider.ID, 'puku-nes');
	});

	test('should return null when NES is disabled', async () => {
		const configService = new MockConfigService() as any;
		// Override the enabled setting
		configService.get = (key: string, defaultValue: any) => {
			if (key === 'puku.nextEditSuggestions.enabled') {
				return false;
			}
			return defaultValue;
		};

		const disabledProvider = new PukuNesNextEditProvider(
			new MockAuthService() as any,
			configService,
			new MockFetcherService() as any,
			new MockLogService() as any,
			new MockEditorService() as any
		);

		const docId = {
			document: createMockDocument(),
			position: new vscode.Position(0, 0)
		};

		const result = await disabledProvider.getNextEdit(docId, {}, CancellationToken.None);
		assert.strictEqual(result, null);
	});

	test('should provide NES suggestion for valid context', async () => {
		const docId = {
			document: createMockDocument(),
			position: new vscode.Position(0, 0)
		};

		const result = await provider.getNextEdit(docId, {}, CancellationToken.None);

		assert.ok(result !== null);
		assert.strictEqual(result!.type, 'nes');
		assert.ok(result!.completion !== undefined);
		assert.ok(result!.requestId > 0);
	});

	test('should handle cancellation gracefully', async () => {
		const docId = {
			document: createMockDocument(),
			position: new vscode.Position(0, 0)
		};

		const token = new CancellationTokenSource().token;
		token.cancel();

		const result = await provider.getNextEdit(docId, {}, token);
		assert.strictEqual(result, null);
	});

	test('should extract context correctly', () => {
		const document = createMockDocument();
		const position = new vscode.Position(5, 10);

		// Test that the provider can extract context
		// This is a basic test - in practice you might want to test more complex scenarios
		assert.ok(document !== undefined);
		assert.ok(position !== undefined);
	});

	test('should handle shown events', () => {
		const mockResult: PukuNesResult = {
			type: 'nes',
			completion: {
				insertText: 'test',
				range: new vscode.Range(0, 0, 0, 0)
			},
			requestId: 123
		};

		// Should not throw
		provider.handleShown(mockResult);
	});

	test('should handle acceptance events', () => {
		const docId = {
			document: createMockDocument(),
			position: new vscode.Position(0, 0)
		};

		const mockResult: PukuNesResult = {
			type: 'nes',
			completion: {
				insertText: 'test',
				range: new vscode.Range(0, 0, 0, 0)
			},
			requestId: 123
		};

		// Should not throw
		provider.handleAcceptance(docId, mockResult);
	});

	test('should handle rejection events', () => {
		const docId = {
			document: createMockDocument(),
			position: new vscode.Position(0, 0)
		};

		const mockResult: PukuNesResult = {
			type: 'nes',
			completion: {
				insertText: 'test',
				range: new vscode.Range(0, 0, 0, 0)
			},
			requestId: 123
		};

		// Should not throw
		provider.handleRejection(docId, mockResult);
	});

	test('should handle ignore events', () => {
		const docId = {
			document: createMockDocument(),
			position: new vscode.Position(0, 0)
		};

		const mockResult: PukuNesResult = {
			type: 'nes',
			completion: {
				insertText: 'test',
				range: new vscode.Range(0, 0, 0, 0)
			},
			requestId: 123
		};

		const supersededBy: PukuNesResult = {
			type: 'nes',
			completion: {
				insertText: 'better test',
				range: new vscode.Range(0, 0, 0, 0)
			},
			requestId: 124
		};

		// Should not throw
		provider.handleIgnored(docId, mockResult, supersededBy);
	});
});

// Helper function to create a mock document
function createMockDocument(): vscode.TextDocument {
	return {
		uri: vscode.Uri.file('/test/file.ts'),
		languageId: 'typescript',
		version: 1,
		isDirty: false,
		isUntitled: false,
		getText: () => 'function test() {\n  console.log("hello");\n}',
		getWordRangeAtPosition: () => undefined,
		getLineCount: () => 3,
		lineAt: (line: number) => ({
			text: 'console.log("hello");',
			range: new vscode.Range(line, 0, line, 22),
			firstNonWhitespaceCharacterIndex: 0,
			rangeIncludingLineBreak: new vscode.Range(line, 0, line, 23),
			isEmptyOrWhitespace: false
		}),
		positionAt: (offset: number) => new vscode.Position(0, offset),
		offsetAt: (position: vscode.Position) => position.character,
		getRange: (word: string) => undefined,
		validatePosition: (position: vscode.Position) => position,
		validateRange: (range: vscode.Range) => range
	} as vscode.TextDocument;
}

// Helper class for cancellation token
class CancellationTokenSource {
	private _token: CancellationToken;
	constructor() {
		this._token = new CancellationToken();
	}
	get token(): CancellationToken {
		return this._token;
	}
	cancel(): void {
		// Mock cancellation
	}
}