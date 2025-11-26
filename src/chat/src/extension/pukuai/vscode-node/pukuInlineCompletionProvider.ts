/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Standalone inline completion provider using Puku AI proxy
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuAuthService } from '../../pukuIndexing/common/pukuAuth';
import { IPukuIndexingService, PukuIndexingStatus } from '../../pukuIndexing/node/pukuIndexingService';

/**
 * Supported languages for inline completions
 */
const SUPPORTED_LANGUAGES = [
	'typescript', 'typescriptreact', 'javascript', 'javascriptreact',
	'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'ruby',
	'php', 'swift', 'kotlin', 'scala', 'vue', 'svelte', 'html', 'css',
	'scss', 'less', 'json', 'yaml', 'markdown', 'sql', 'shell', 'bash'
];

/**
 * Build FIM prompt for chat-based completion
 */
function buildFIMPrompt(prefix: string, suffix?: string, contextSnippets?: string[]): string {
	// Build context section from semantic search results
	let contextSection = '';
	if (contextSnippets && contextSnippets.length > 0) {
		contextSection = `RELEVANT CODE FROM CODEBASE:
\`\`\`
${contextSnippets.join('\n\n---\n\n')}
\`\`\`

`;
	}

	if (suffix && suffix.trim()) {
		return `${contextSection}Complete the missing code. You are given code before and after the cursor position.

CODE BEFORE CURSOR:
\`\`\`
${prefix}
\`\`\`

CODE AFTER CURSOR:
\`\`\`
${suffix}
\`\`\`

Write ONLY the code that belongs between these two sections. Do not repeat the before/after code. Do not add explanations. Output only the completion code.`;
	} else {
		return `${contextSection}Continue this code naturally. Complete the next logical lines.

EXISTING CODE:
\`\`\`
${prefix}
\`\`\`

Write ONLY the next lines of code that continue from where it left off. Do not repeat existing code. Do not add explanations or markdown. Output only the completion code.`;
	}
}

/**
 * Extract clean code from response, removing markdown formatting
 */
function extractCodeFromResponse(response: string): string {
	// Remove markdown code blocks if present
	let code = response.trim();

	// Check for triple backtick code blocks
	const codeBlockMatch = code.match(/```(?:\w+)?\n?([\s\S]*?)```/);
	if (codeBlockMatch) {
		code = codeBlockMatch[1];
	}

	// Remove leading/trailing whitespace
	return code.trim();
}

interface CompletionResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		text?: string;
		message?: { content: string };
		index: number;
		finish_reason: string | null;
	}>;
}

/**
 * Puku AI Inline Completion Provider
 * A standalone, self-contained inline completion provider that directly
 * communicates with the Puku AI proxy without depending on completions-core.
 */
export class PukuInlineCompletionProvider extends Disposable implements vscode.InlineCompletionItemProvider {
	private _lastRequestTime = 0;
	private _debounceMs = 150;
	private _enabled = true;
	private _requestId = 0;

	constructor(
		private readonly _endpoint: string,
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IPukuAuthService private readonly _authService: IPukuAuthService,
		@IPukuIndexingService private readonly _indexingService: IPukuIndexingService,
	) {
		super();
		this._logService.info(`[PukuInlineCompletion] Provider created with endpoint: ${_endpoint}`);
	}

	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
		const reqId = ++this._requestId;
		console.log(`[PukuInlineCompletion][${reqId}] provideInlineCompletionItems called for ${document.languageId}`);

		// Check if enabled
		if (!this._enabled) {
			console.log(`[PukuInlineCompletion][${reqId}] Provider disabled`);
			return null;
		}

		// Check if language is supported
		if (!SUPPORTED_LANGUAGES.includes(document.languageId)) {
			console.log(`[PukuInlineCompletion][${reqId}] Language ${document.languageId} not supported`);
			return null;
		}

		// Debounce
		const now = Date.now();
		if (now - this._lastRequestTime < this._debounceMs) {
			console.log(`[PukuInlineCompletion][${reqId}] Debounced`);
			return null;
		}
		this._lastRequestTime = now;

		// Extract prefix and suffix
		const prefix = document.getText(new vscode.Range(
			new vscode.Position(0, 0),
			position
		));

		const suffix = document.getText(new vscode.Range(
			position,
			document.lineAt(document.lineCount - 1).range.end
		));

		console.log(`[PukuInlineCompletion][${reqId}] Prefix length: ${prefix.length}, suffix length: ${suffix.length}`);

		// Don't complete if prefix is too short
		if (prefix.trim().length < 5) {
			console.log(`[PukuInlineCompletion][${reqId}] Prefix too short: ${prefix.trim().length}`);
			return null;
		}

		console.log(`[PukuInlineCompletion][${reqId}] Fetching completion...`);
		this._logService.debug(`[PukuInlineCompletion][${reqId}] Requesting completion at ${document.fileName}:${position.line}`);

		try {
			const completion = await this._fetchCompletion(prefix, suffix, document.languageId, token, document, position);

			if (!completion || token.isCancellationRequested) {
				return null;
			}

			return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
		} catch (error) {
			this._logService.error(`[PukuInlineCompletion][${reqId}] Error: ${error}`);
			return null;
		}
	}

	/**
	 * Extract signature from a tree-sitter code chunk
	 * Takes the first meaningful line(s) before the opening brace
	 * Works for all languages since tree-sitter chunks are already structured
	 */
	private _extractSignature(content: string): string {
		const lines = content.split('\n');
		const signatureLines: string[] = [];

		for (const line of lines) {
			const trimmed = line.trim();

			// Skip empty lines and comments at the start
			if (!signatureLines.length && (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('#'))) {
				continue;
			}

			signatureLines.push(line);

			// Stop at opening brace (function/class body starts)
			if (trimmed.includes('{')) {
				const lastLine = signatureLines[signatureLines.length - 1];
				const braceIndex = lastLine.indexOf('{');
				if (braceIndex !== -1) {
					signatureLines[signatureLines.length - 1] = lastLine.substring(0, braceIndex).trim() + ' { ... }';
				}
				break;
			}

			// Stop at colon for Python
			if (trimmed.endsWith(':') && (trimmed.includes('def ') || trimmed.includes('class '))) {
				break;
			}

			// For interfaces/types without braces, take first 3 lines
			if (signatureLines.length >= 3) {
				signatureLines.push('  // ...');
				break;
			}
		}

		return signatureLines.length > 0 ? signatureLines.join('\n') : content.substring(0, 200);
	}

	/**
	 * Gather code context from workspace
	 */
	private async _gatherCodeContext(document: vscode.TextDocument, position: vscode.Position): Promise<{
		recentEdits: Array<{ filepath: string; content: string }>;
		openFiles: Array<{ filepath: string; content: string }>;
		semanticResults: Array<{ filepath: string; content: string }>;
	}> {
		const context = {
			recentEdits: [] as Array<{ filepath: string; content: string }>,
			openFiles: [] as Array<{ filepath: string; content: string }>,
			semanticResults: [] as Array<{ filepath: string; content: string }>
		};

		// 1. Get semantic context from indexing service (highest priority)
		if (this._indexingService.status === PukuIndexingStatus.Ready) {
			try {
				const startLine = Math.max(0, position.line - 5);
				const queryRange = new vscode.Range(new vscode.Position(startLine, 0), position);
				const query = document.getText(queryRange).trim();

				if (query.length >= 20) {
					const results = await this._indexingService.search(query, 3);

					if (results.length > 0) {
						// Filter out results from current document to avoid duplication
						const filteredResults = results.filter(r => r.uri.toString() !== document.uri.toString());

						if (filteredResults.length > 0) {
							// Extract signatures from semantic search results to avoid duplication
							context.semanticResults = filteredResults.map(r => {
								const signature = this._extractSignature(r.content);
								return {
									filepath: vscode.workspace.asRelativePath(r.uri),
									content: signature
								};
							});
							// Also add to openFiles for /v1/fim/context endpoint
							context.openFiles.push(...context.semanticResults);
						}
					}
				}
			} catch (error) {
				this._logService.warn(`[PukuInlineCompletion] Semantic search failed: ${error}`);
			}
		}

		// 2. Add visible open editors (if we still have space)
		const remainingSlots = 3 - context.openFiles.length;
		if (remainingSlots > 0) {
			const visibleEditors = vscode.window.visibleTextEditors;
			for (const editor of visibleEditors) {
				if (editor.document.uri.toString() === document.uri.toString()) {
					continue;
				}

				const text = editor.document.getText();
				context.openFiles.push({
					filepath: vscode.workspace.asRelativePath(editor.document.uri),
					content: text.substring(0, 500)
				});

				if (context.openFiles.length >= 3) {
					break;
				}
			}
		}

		return context;
	}

	/**
	 * Fetch completion from Puku AI proxy
	 */
	private async _fetchCompletion(
		prefix: string,
		suffix: string,
		languageId: string,
		token: vscode.CancellationToken,
		document: vscode.TextDocument,
		position: vscode.Position
	): Promise<string | null> {
		console.log(`[PukuInlineCompletion] Gathering code context...`);
		const context = await this._gatherCodeContext(document, position);
		console.log(`[PukuInlineCompletion] Context gathered: ${context.openFiles.length} files, ${context.semanticResults.length} semantic results`);

		// Try the enhanced /v1/fim/context endpoint first
		try {
			console.log(`[PukuInlineCompletion] Trying contextual FIM...`);
			const contextCompletion = await this._fetchContextualCompletion(prefix, suffix, languageId, document, context, token);
			console.log(`[PukuInlineCompletion] Contextual FIM result: ${contextCompletion ? `"${contextCompletion.substring(0, 50)}..."` : 'null'}`);
			if (contextCompletion) {
				return contextCompletion;
			}
		} catch (error) {
			console.error(`[PukuInlineCompletion] Contextual FIM error:`, error);
			this._logService.debug(`[PukuInlineCompletion] Contextual FIM failed: ${error}`);
		}

		// Fallback to native completion with semantic context only
		const contextSnippets = context.semanticResults.map(r => `// From: ${r.filepath}\n${r.content}`);

		try {
			console.log(`[PukuInlineCompletion] Trying native FIM...`);
			const completionResult = await this._fetchNativeCompletion(prefix, suffix, token, contextSnippets);
			console.log(`[PukuInlineCompletion] Native FIM result: ${completionResult ? `"${completionResult.substring(0, 50)}..."` : 'null'}`);
			if (completionResult) {
				return completionResult;
			}
		} catch (error) {
			console.error(`[PukuInlineCompletion] Native FIM error:`, error);
			this._logService.debug(`[PukuInlineCompletion] Native completion failed: ${error}`);
		}

		// Final fallback to chat completions
		console.log(`[PukuInlineCompletion] Trying chat completion...`);
		const chatResult = await this._fetchChatCompletion(prefix, suffix, languageId, token, contextSnippets);
		console.log(`[PukuInlineCompletion] Chat completion result: ${chatResult ? `"${chatResult.substring(0, 50)}..."` : 'null'}`);
		return chatResult;
	}

	/**
	 * Fetch completion using the enhanced /v1/fim/context endpoint
	 */
	private async _fetchContextualCompletion(
		prefix: string,
		suffix: string,
		languageId: string,
		document: vscode.TextDocument,
		context: {
			recentEdits: Array<{ filepath: string; content: string }>;
			openFiles: Array<{ filepath: string; content: string }>;
			semanticResults: Array<{ filepath: string; content: string }>;
		},
		token: vscode.CancellationToken
	): Promise<string | null> {
		const url = `${this._endpoint}/v1/fim/context`;

		const authToken = await this._authService.getToken();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken.token}`;
		}

		const response = await this._fetcherService.fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				prompt: prefix,
				suffix: suffix,
				language: languageId,
				filepath: vscode.workspace.asRelativePath(document.uri),
				openFiles: context.openFiles,
				recentEdits: context.recentEdits,
				max_tokens: 50,
				temperature: 0.2,
				stream: false,
			}),
		});

		if (!response.ok) {
			throw new Error(`Contextual FIM failed: ${response.status}`);
		}

		if (token.isCancellationRequested) {
			return null;
		}

		const data = await response.json() as CompletionResponse;

		if (data.choices && data.choices.length > 0) {
			const text = data.choices[0].text || '';
			return text.trim() || null;
		}

		return null;
	}

	/**
	 * Try native /v1/completions endpoint (fallback)
	 */
	private async _fetchNativeCompletion(
		prefix: string,
		suffix: string,
		token: vscode.CancellationToken,
		contextSnippets?: string[]
	): Promise<string | null> {
		const url = `${this._endpoint}/v1/completions`;

		const authToken = await this._authService.getToken();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken.token}`;
		}

		// Prepend context to prompt if available
		let enhancedPrompt = prefix;
		if (contextSnippets && contextSnippets.length > 0) {
			const contextBlock = contextSnippets.join('\n\n---\n\n');
			enhancedPrompt = `// RELEVANT CONTEXT FROM CODEBASE:\n${contextBlock}\n\n// CURRENT FILE:\n${prefix}`;
		}

		const response = await this._fetcherService.fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				prompt: enhancedPrompt,
				suffix: suffix,
				max_tokens: 150,
				temperature: 0.2,
				stream: false,
			}),
		});

		if (!response.ok) {
			throw new Error(`Native completion failed: ${response.status}`);
		}

		if (token.isCancellationRequested) {
			return null;
		}

		const data = await response.json() as CompletionResponse;

		if (data.choices && data.choices.length > 0) {
			const text = data.choices[0].text || '';
			return text.trim() || null;
		}

		return null;
	}

	/**
	 * Fallback to /v1/chat/completions endpoint
	 */
	private async _fetchChatCompletion(
		prefix: string,
		suffix: string,
		languageId: string,
		token: vscode.CancellationToken,
		contextSnippets?: string[]
	): Promise<string | null> {
		const url = `${this._endpoint}/v1/chat/completions`;

		// Build the FIM prompt (with optional context)
		const prompt = buildFIMPrompt(prefix, suffix, contextSnippets);

		// Get auth token (optional for worker API)
		const authToken = await this._authService.getToken();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Only add auth header if token exists
		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken.token}`;
		}

		// Get configured model (worker will handle model mapping)
		const model = this._configurationService.getConfig(ConfigKey.PukuAIModel);

		const response = await this._fetcherService.fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: model,
				messages: [
					{
						role: 'system',
						content: `You are a code completion assistant. Complete code in ${languageId}. Output ONLY code, no explanations or markdown.`
					},
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: 150,
				temperature: 0.2,
				stream: false,
			}),
		});

		if (!response.ok) {
			throw new Error(`Chat completion failed: ${response.status}`);
		}

		if (token.isCancellationRequested) {
			return null;
		}

		const data = await response.json() as CompletionResponse;

		if (data.choices && data.choices.length > 0) {
			const choice = data.choices[0];
			const content = choice.message?.content || choice.text || '';
			return extractCodeFromResponse(content) || null;
		}

		return null;
	}

	/**
	 * Enable/disable the provider
	 */
	setEnabled(enabled: boolean): void {
		this._enabled = enabled;
		this._logService.info(`[PukuInlineCompletion] Provider ${enabled ? 'enabled' : 'disabled'}`);
	}
}
