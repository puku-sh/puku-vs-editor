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
function buildFIMPrompt(prefix: string, suffix?: string): string {
	if (suffix && suffix.trim()) {
		return `Complete the missing code. You are given code before and after the cursor position.

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
		return `Continue this code naturally. Complete the next logical lines.

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
	private _debounceMs = 0; // Disabled for testing - was 150
	private _enabled = true;
	private _requestId = 0;

	constructor(
		private readonly _endpoint: string,
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IPukuAuthService private readonly _authService: IPukuAuthService,
	) {
		super();
		console.log(`[PukuInlineCompletion] Provider created with endpoint: ${_endpoint}`);
		this._logService.info(`[PukuInlineCompletion] Provider created with endpoint: ${_endpoint}`);
	}

	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
		const reqId = ++this._requestId;
		console.log(`[PukuInlineCompletion][${reqId}] provideInlineCompletionItems called for ${document.languageId} at line ${position.line}, col ${position.character}`);

		// Check if enabled
		if (!this._enabled) {
			console.log(`[PukuInlineCompletion][${reqId}] Provider is disabled`);
			return null;
		}

		// Check if language is supported
		if (!SUPPORTED_LANGUAGES.includes(document.languageId)) {
			console.log(`[PukuInlineCompletion][${reqId}] Language ${document.languageId} not supported`);
			return null;
		}

		// Debounce - don't fire too quickly
		const now = Date.now();
		if (now - this._lastRequestTime < this._debounceMs) {
			console.log(`[PukuInlineCompletion][${reqId}] Debounced - too soon since last request`);
			return null;
		}
		this._lastRequestTime = now;

		// Extract prefix (text before cursor)
		const prefix = document.getText(new vscode.Range(
			new vscode.Position(0, 0),
			position
		));

		// Extract suffix (text after cursor)
		const suffix = document.getText(new vscode.Range(
			position,
			document.lineAt(document.lineCount - 1).range.end
		));

		// Don't complete if prefix is too short
		if (prefix.trim().length < 5) {
			console.log(`[PukuInlineCompletion][${reqId}] Prefix too short (${prefix.trim().length} chars), skipping`);
			return null;
		}

		console.log(`[PukuInlineCompletion][${reqId}] Fetching completion, prefix length: ${prefix.length}, suffix length: ${suffix.length}`);
		this._logService.debug(`[PukuInlineCompletion][${reqId}] Requesting completion for ${document.fileName} at line ${position.line}`);

		try {
			const completion = await this._fetchCompletion(prefix, suffix, document.languageId, token);

			if (!completion || token.isCancellationRequested) {
				console.log(`[PukuInlineCompletion][${reqId}] No completion returned or cancelled`);
				return null;
			}

			console.log(`[PukuInlineCompletion][${reqId}] Got completion: "${completion.substring(0, 50)}..."`);

			// Create inline completion item
			const item = new vscode.InlineCompletionItem(
				completion,
				new vscode.Range(position, position)
			);

			console.log(`[PukuInlineCompletion][${reqId}] Returning inline completion item`);
			return [item];
		} catch (error) {
			console.error(`[PukuInlineCompletion][${reqId}] Error fetching completion: ${error}`);
			this._logService.error(`[PukuInlineCompletion][${reqId}] Error: ${error}`);
			return null;
		}
	}

	/**
	 * Fetch completion from Puku AI proxy
	 */
	private async _fetchCompletion(
		prefix: string,
		suffix: string,
		languageId: string,
		token: vscode.CancellationToken
	): Promise<string | null> {
		// First try the /v1/completions endpoint (native FIM)
		try {
			const completionResult = await this._fetchNativeCompletion(prefix, suffix, token);
			if (completionResult) {
				return completionResult;
			}
		} catch (error) {
			this._logService.debug(`[PukuInlineCompletion] Native completion failed, falling back to chat: ${error}`);
		}

		// Fallback to chat completions
		return this._fetchChatCompletion(prefix, suffix, languageId, token);
	}

	/**
	 * Try native /v1/completions endpoint
	 */
	private async _fetchNativeCompletion(
		prefix: string,
		suffix: string,
		token: vscode.CancellationToken
	): Promise<string | null> {
		const url = `${this._endpoint}/v1/completions`;
		console.log(`[PukuInlineCompletion] Trying native completion at ${url}`);

		// Get auth token (optional for worker API)
		const authToken = await this._authService.getToken();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Only add auth header if token exists
		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken.token}`;
		}

		const response = await this._fetcherService.fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				prompt: prefix,
				suffix: suffix,
				max_tokens: 150,
				temperature: 0.2,
				stream: false,
			}),
		});

		console.log(`[PukuInlineCompletion] Native completion response status: ${response.status}`);

		if (!response.ok) {
			throw new Error(`Native completion failed: ${response.status}`);
		}

		if (token.isCancellationRequested) {
			console.log('[PukuInlineCompletion] Request cancelled');
			return null;
		}

		const data = await response.json() as CompletionResponse;
		console.log(`[PukuInlineCompletion] Native completion response:`, JSON.stringify(data).substring(0, 200));

		if (data.choices && data.choices.length > 0) {
			const choice = data.choices[0];
			const text = choice.text || '';
			console.log(`[PukuInlineCompletion] Native completion text: "${text.substring(0, 100)}"`);
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
		token: vscode.CancellationToken
	): Promise<string | null> {
		const url = `${this._endpoint}/v1/chat/completions`;

		// Build the FIM prompt
		const prompt = buildFIMPrompt(prefix, suffix);

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
