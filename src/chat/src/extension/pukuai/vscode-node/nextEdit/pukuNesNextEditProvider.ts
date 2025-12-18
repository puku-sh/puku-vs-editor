/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Next Edit Suggestions (NES) Provider - Basic Implementation
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IPukuNextEditProvider, DocumentId, PukuNesResult } from '../../common/nextEditProvider';
import { IPukuAuthService } from '../../auth/common/authService';
import { IPukuConfigService } from '../../config/common/configService';
import { IFetcherService } from '../../http/common/fetcherService';
import { ILogService } from '../../../platform/logging/common/logService';
import { CancellationToken } from '../../../base/common/cancellation';
import { Disposable } from '../../../base/common/lifecycle';
import { IEditorService } from '../../editor/common/editorService';

/**
 * Context for NES requests - captures the recent edit and surrounding context
 */
export interface NesContext {
	/** The recent edit that triggered the NES request */
	recentEdit: {
		before: string;
		after: string;
		position: vscode.Position;
	};
	/** Surrounding code context (lines around the edit) */
	surroundingContext: {
		before: string[];
		after: string[];
	};
	/** Document language */
	language: string;
	/** Current cursor position */
	cursorPosition: vscode.Position;
	/** Full document text */
	documentText: string;
	/** Import context if available */
	imports?: string[];
}

/**
 * Basic Next Edit Suggestions Provider
 *
 * Provides AI-powered suggestions for the next logical edit based on recent changes.
 * Uses the Puku AI backend to generate context-aware suggestions.
 */
export class PukuNesNextEditProvider extends Disposable implements IPukuNextEditProvider<PukuNesResult> {
	readonly ID = 'puku-nes';

	/** Debounce delay for NES requests (longer than FIM) */
	private static readonly NES_DEBOUNCE_DELAY = 1500; // 1.5 seconds

	/** Context window size in lines */
	private static readonly CONTEXT_LINES = 10;

	constructor(
		@IPukuAuthService private readonly authService: IPukuAuthService,
		@IPukuConfigService private readonly configService: IPukuConfigService,
		@IFetcherService private readonly fetcherService: IFetcherService,
		@ILogService private readonly logService: ILogService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super();
		this.logService.info('[PukuNesNextEditProvider] Initialized');
	}

	/**
	 * Provide next edit suggestion based on recent document changes
	 */
	async getNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		token: CancellationToken
	): Promise<PukuNesResult | null> {
		try {
			// Check if NES is enabled
			if (!this.isNesEnabled()) {
				this.logService.debug('[PukuNesNextEditProvider] NES is disabled');
				return null;
			}

			// Extract context from the document
			const nesContext = this.extractNesContext(docId);
			if (!nesContext) {
				this.logService.debug('[PukuNesNextEditProvider] No suitable context for NES');
				return null;
			}

			// Build NES request
			const nesRequest = await this.buildNesRequest(nesContext);

			// Call Puku AI backend
			const response = await this.fetcherService.post('/v1/nes', nesRequest, {
				headers: {
					'Authorization': `Bearer ${await this.authService.getToken()}`
				}
			}, token);

			// Parse and return the result
			return this.parseNesResponse(response.data, docId);

		} catch (error) {
			this.logService.error('[PukuNesNextEditProvider] Error getting next edit:', error);

			// Don't throw, just return null to allow other providers to race
			return null;
		}
	}

	/**
	 * Optional: Run until next edit with delay (for provider racing)
	 */
	async runUntilNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		delayMs: number,
		token: CancellationToken
	): Promise<PukuNesResult | null> {
		// Delay the start to give other providers a head start
		await new Promise(resolve => setTimeout(resolve, delayMs));

		if (token.isCancellationRequested) {
			return null;
		}

		return this.getNextEdit(docId, context, token);
	}

	/**
	 * Handle when suggestion is shown to user
	 */
	handleShown(result: PukuNesResult): void {
		this.logService.debug(`[PukuNesNextEditProvider] NES suggestion shown: ${result.requestId}`);
	}

	/**
	 * Handle when suggestion is accepted (TAB)
	 */
	handleAcceptance(docId: DocumentId, result: PukuNesResult): void {
		this.logService.info(`[PukuNesNextEditProvider] NES suggestion accepted: ${result.requestId}`);

		// TODO: Track acceptance for learning and telemetry
		// TODO: Update suggestion patterns based on acceptance
	}

	/**
	 * Handle when suggestion is rejected (ESC or typing)
	 */
	handleRejection(docId: DocumentId, result: PukuNesResult): void {
		this.logService.debug(`[PukuNesNextEditProvider] NES suggestion rejected: ${result.requestId}`);

		// TODO: Track rejection for learning and telemetry
		// TODO: Update suggestion patterns based on rejection
	}

	/**
	 * Handle when suggestion is ignored (superseded by another)
	 */
	handleIgnored(docId: DocumentId, result: PukuNesResult, supersededBy?: PukuNesResult): void {
		this.logService.debug(`[PukuNesNextEditProvider] NES suggestion ignored: ${result.requestId}`);
	}

	/**
	 * Extract context for NES request from the document
	 */
	private extractNesContext(docId: DocumentId): NesContext | null {
		const { document, position } = docId;

		// Get text around the current position
		const lineCount = document.lineCount;
		const currentLine = position.line;

		const startLine = Math.max(0, currentLine - PukuNesNextEditProvider.CONTEXT_LINES);
		const endLine = Math.min(lineCount - 1, currentLine + PukuNesNextEditProvider.CONTEXT_LINES);

		const beforeLines: string[] = [];
		const afterLines: string[] = [];

		for (let i = startLine; i < currentLine; i++) {
			beforeLines.push(document.lineAt(i).text);
		}

		for (let i = currentLine + 1; i <= endLine; i++) {
			afterLines.push(document.lineAt(i).text);
		}

		// Extract imports (basic implementation)
		const imports = this.extractImports(document);

		return {
			recentEdit: {
				before: '', // TODO: Track actual recent edit
				after: '',  // TODO: Track actual recent edit
				position
			},
			surroundingContext: {
				before: beforeLines,
				after: afterLines
			},
			language: document.languageId,
			cursorPosition: position,
			documentText: document.getText(),
			imports
		};
	}

	/**
	 * Extract imports from the document
	 */
	private extractImports(document: vscode.TextDocument): string[] {
		const imports: string[] = [];
		const text = document.getText();

		// Basic regex patterns for common import statements
		const importPatterns = [
			/^import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/gm,  // TypeScript/JavaScript
			/^#include\s*[<"]([^>"]+)[>"]/gm,                  // C/C++
			/^using\s+([^;]+);/gm,                            // C#
			/^from\s+['"`]([^'"`]+)['"`]\s+import/gm,        // Python
			/^require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gm,     // Node.js
		];

		for (const pattern of importPatterns) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				if (match[1] && !imports.includes(match[1])) {
					imports.push(match[1]);
				}
			}
		}

		return imports;
	}

	/**
	 * Build NES request payload for the backend API
	 */
	private async buildNesRequest(context: NesContext): Promise<any> {
		return {
			context: {
				recentEdit: context.recentEdit,
				surroundingContext: context.surroundingContext,
				language: context.language,
				imports: context.imports
			},
			document: {
				text: context.documentText,
				cursorPosition: {
					line: context.cursorPosition.line,
					character: context.cursorPosition.character
				}
			},
			prompt: this.buildNesPrompt(context)
		};
	}

	/**
	 * Build the NES prompt for the AI model
	 */
	private buildNesPrompt(context: NesContext): string {
		const { recentEdit, surroundingContext, language, imports } = context;

		return `You are an expert ${language} developer. Given the following code context and recent edit, suggest the most logical next edit that would typically follow this change.

Language: ${language}
${imports.length > 0 ? `Imports: ${imports.join(', ')}` : ''}

Recent change: ${recentEdit.before} → ${recentEdit.after}

Code context before cursor:
${surroundingContext.before.join('\n')}

[CURSOR POSITION]

Code context after cursor:
${surroundingContext.after.join('\n')}

Suggest the next logical edit. Response format:
{
  "suggestion": "code to insert",
  "description": "brief description of what this edit does",
  "confidence": 0.85
}`;
	}

	/**
	 * Parse the NES response from the backend API
	 */
	private parseNesResponse(response: any, docId: DocumentId): PukuNesResult {
		const { suggestion, description, confidence } = response;

		if (!suggestion) {
			return null;
		}

		const { position } = docId;
		const insertPosition = position; // Insert at current position

		const completionItem: vscode.InlineCompletionItem = {
			insertText: suggestion,
			range: new vscode.Range(insertPosition, insertPosition),
			command: {
				title: "Accept Next Edit",
				command: "puku.acceptNextEdit"
			},
			// Mark as inline edit for VS Code's NES system
			isInlineEdit: true,
			showRange: new vscode.Range(position, position),
			displayLocation: {
				label: description || "Next edit suggestion",
				position: insertPosition
			}
		};

		return {
			type: 'nes',
			completion: completionItem,
			requestId: Date.now() // Simple ID generation for now
		};
	}

	/**
	 * Check if NES is enabled in configuration
	 */
	private isNesEnabled(): boolean {
		return this.configService.get('puku.nextEditSuggestions.enabled', true);
	}
}