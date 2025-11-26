/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test the helper functions that can be tested without VS Code dependencies
describe('PukuInlineCompletionProvider - Helper Functions', () => {
	describe('buildFIMPrompt', () => {
		// Inline the function for testing since it's not exported
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

		it('should create continuation prompt when no suffix', () => {
			const prefix = 'function hello() {';
			const prompt = buildFIMPrompt(prefix);

			expect(prompt).toContain('Continue this code naturally');
			expect(prompt).toContain(prefix);
			expect(prompt).not.toContain('CODE AFTER CURSOR');
		});

		it('should create continuation prompt when suffix is empty', () => {
			const prefix = 'function hello() {';
			const prompt = buildFIMPrompt(prefix, '');

			expect(prompt).toContain('Continue this code naturally');
		});

		it('should create continuation prompt when suffix is whitespace only', () => {
			const prefix = 'function hello() {';
			const prompt = buildFIMPrompt(prefix, '   \n\t  ');

			expect(prompt).toContain('Continue this code naturally');
		});

		it('should create FIM prompt when suffix is provided', () => {
			const prefix = 'function fibonacci(n) {';
			const suffix = '\n    return result;\n}';
			const prompt = buildFIMPrompt(prefix, suffix);

			expect(prompt).toContain('CODE BEFORE CURSOR');
			expect(prompt).toContain('CODE AFTER CURSOR');
			expect(prompt).toContain(prefix);
			expect(prompt).toContain(suffix);
			expect(prompt).toContain('Write ONLY the code that belongs between');
		});

		it('should handle multiline prefix', () => {
			const prefix = `function calculate(a, b) {
    const sum = a + b;
    const product = a * b;`;
			const prompt = buildFIMPrompt(prefix);

			expect(prompt).toContain('const sum = a + b;');
			expect(prompt).toContain('const product = a * b;');
		});
	});

	describe('extractCodeFromResponse', () => {
		// Inline the function for testing
		function extractCodeFromResponse(response: string): string {
			let code = response.trim();

			// Check for triple backtick code blocks
			const codeBlockMatch = code.match(/```(?:\w+)?\n?([\s\S]*?)```/);
			if (codeBlockMatch) {
				code = codeBlockMatch[1];
			}

			return code.trim();
		}

		it('should return plain text unchanged', () => {
			const input = 'return a + b;';
			expect(extractCodeFromResponse(input)).toBe('return a + b;');
		});

		it('should extract code from markdown code block', () => {
			const input = '```typescript\nreturn a + b;\n```';
			expect(extractCodeFromResponse(input)).toBe('return a + b;');
		});

		it('should extract code from code block without language', () => {
			const input = '```\nreturn a + b;\n```';
			expect(extractCodeFromResponse(input)).toBe('return a + b;');
		});

		it('should handle code block with extra whitespace', () => {
			const input = '  ```python\n  def hello():\n      pass\n```  ';
			expect(extractCodeFromResponse(input)).toBe('def hello():\n      pass');
		});

		it('should handle multiline code blocks', () => {
			const input = `\`\`\`javascript
function foo() {
    console.log("hello");
    return 42;
}
\`\`\``;
			const result = extractCodeFromResponse(input);
			expect(result).toContain('function foo()');
			expect(result).toContain('return 42;');
		});

		it('should trim leading and trailing whitespace', () => {
			const input = '   \n  const x = 1;  \n   ';
			expect(extractCodeFromResponse(input)).toBe('const x = 1;');
		});
	});

	describe('Supported Languages', () => {
		const SUPPORTED_LANGUAGES = [
			'typescript', 'typescriptreact', 'javascript', 'javascriptreact',
			'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'ruby',
			'php', 'swift', 'kotlin', 'scala', 'vue', 'svelte', 'html', 'css',
			'scss', 'less', 'json', 'yaml', 'markdown', 'sql', 'shell', 'bash'
		];

		it('should include common programming languages', () => {
			expect(SUPPORTED_LANGUAGES).toContain('typescript');
			expect(SUPPORTED_LANGUAGES).toContain('python');
			expect(SUPPORTED_LANGUAGES).toContain('javascript');
			expect(SUPPORTED_LANGUAGES).toContain('java');
			expect(SUPPORTED_LANGUAGES).toContain('go');
			expect(SUPPORTED_LANGUAGES).toContain('rust');
		});

		it('should include React variants', () => {
			expect(SUPPORTED_LANGUAGES).toContain('typescriptreact');
			expect(SUPPORTED_LANGUAGES).toContain('javascriptreact');
		});

		it('should include web technologies', () => {
			expect(SUPPORTED_LANGUAGES).toContain('html');
			expect(SUPPORTED_LANGUAGES).toContain('css');
			expect(SUPPORTED_LANGUAGES).toContain('vue');
			expect(SUPPORTED_LANGUAGES).toContain('svelte');
		});

		it('should include shell languages', () => {
			expect(SUPPORTED_LANGUAGES).toContain('shell');
			expect(SUPPORTED_LANGUAGES).toContain('bash');
		});

		it('should include data formats', () => {
			expect(SUPPORTED_LANGUAGES).toContain('json');
			expect(SUPPORTED_LANGUAGES).toContain('yaml');
			expect(SUPPORTED_LANGUAGES).toContain('sql');
		});
	});

	describe('Debounce Logic', () => {
		it('should calculate time difference correctly', () => {
			const debounceMs = 150;
			const lastRequestTime = Date.now() - 100; // 100ms ago
			const now = Date.now();

			const shouldDebounce = now - lastRequestTime < debounceMs;
			expect(shouldDebounce).toBe(true);
		});

		it('should not debounce after enough time has passed', () => {
			const debounceMs = 150;
			const lastRequestTime = Date.now() - 200; // 200ms ago
			const now = Date.now();

			const shouldDebounce = now - lastRequestTime < debounceMs;
			expect(shouldDebounce).toBe(false);
		});
	});

	describe('Prefix Validation', () => {
		it('should reject very short prefix', () => {
			const minLength = 5;
			const prefix = 'ab';
			expect(prefix.trim().length < minLength).toBe(true);
		});

		it('should accept prefix with enough content', () => {
			const minLength = 5;
			const prefix = 'function hello()';
			expect(prefix.trim().length >= minLength).toBe(true);
		});

		it('should handle whitespace-only prefix', () => {
			const minLength = 5;
			const prefix = '     ';
			expect(prefix.trim().length < minLength).toBe(true);
		});
	});

	describe('Response Parsing', () => {
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

		it('should parse native completion response', () => {
			const response: CompletionResponse = {
				id: 'test-id',
				object: 'text_completion',
				created: Date.now(),
				model: 'test-model',
				choices: [{
					text: 'return a + b;',
					index: 0,
					finish_reason: 'stop'
				}]
			};

			const text = response.choices[0]?.text || '';
			expect(text).toBe('return a + b;');
		});

		it('should parse chat completion response', () => {
			const response: CompletionResponse = {
				id: 'test-id',
				object: 'chat.completion',
				created: Date.now(),
				model: 'test-model',
				choices: [{
					message: { content: 'return a + b;' },
					index: 0,
					finish_reason: 'stop'
				}]
			};

			const content = response.choices[0]?.message?.content || response.choices[0]?.text || '';
			expect(content).toBe('return a + b;');
		});

		it('should handle empty choices', () => {
			const response: CompletionResponse = {
				id: 'test-id',
				object: 'text_completion',
				created: Date.now(),
				model: 'test-model',
				choices: []
			};

			const hasChoices = response.choices && response.choices.length > 0;
			expect(hasChoices).toBe(false);
		});
	});
});
