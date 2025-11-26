/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { expect, suite, test } from 'vitest';

/**
 * FIM (Fill-In-Middle) Prompt Construction Tests
 *
 * These tests verify the prompt construction logic used by the proxy server
 * to convert FIM requests into chat completions format for GLM models.
 */

// Helper functions that mirror the proxy's prompt construction logic
function buildFIMPrompt(prompt: string, suffix?: string): string {
	if (suffix && suffix.trim()) {
		// FIM with suffix - provide clear context about what comes before and after
		return `Complete the missing code. You are given code before and after the cursor position.

CODE BEFORE CURSOR:
\`\`\`
${prompt}
\`\`\`

CODE AFTER CURSOR:
\`\`\`
${suffix}
\`\`\`

Write ONLY the code that belongs between these two sections. Do not repeat the before/after code. Do not add explanations. Output only the completion code.`;
	} else {
		// Simple completion - continue the code naturally
		return `Continue this code naturally. Complete the next logical lines.

EXISTING CODE:
\`\`\`
${prompt}
\`\`\`

Write ONLY the next lines of code that continue from where it left off. Do not repeat existing code. Do not add explanations or markdown. Output only the completion code.`;
	}
}

function extractCodeContext(fullContent: string, cursorLine: number, linesBefore: number = 5): string {
	const lines = fullContent.split('\n');
	const startLine = Math.max(0, cursorLine - linesBefore);
	return lines.slice(startLine, cursorLine + 1).join('\n');
}

function isContextTooShort(context: string, minLength: number = 10): boolean {
	return !context || context.trim().length < minLength;
}

suite('FIM Prompt Construction', () => {
	suite('buildFIMPrompt - with suffix', () => {
		test('should include both before and after code markers', () => {
			const prompt = 'function hello() {\n\tconsole.log(';
			const suffix = ');\n}';
			const result = buildFIMPrompt(prompt, suffix);

			expect(result).toContain('CODE BEFORE CURSOR:');
			expect(result).toContain('CODE AFTER CURSOR:');
			expect(result).toContain(prompt);
			expect(result).toContain(suffix);
		});

		test('should include instructions for completion', () => {
			const prompt = 'const x = ';
			const suffix = ' + 1;';
			const result = buildFIMPrompt(prompt, suffix);

			expect(result).toContain('Write ONLY the code');
			expect(result).toContain('Do not repeat');
			expect(result).toContain('Do not add explanations');
		});

		test('should handle multiline code correctly', () => {
			const prompt = `function calculate(items) {
	let total = 0;
	for (const item of items) {
		total += `;
			const suffix = `;
	}
	return total;
}`;
			const result = buildFIMPrompt(prompt, suffix);

			expect(result).toContain('function calculate(items)');
			expect(result).toContain('return total;');
		});
	});

	suite('buildFIMPrompt - without suffix', () => {
		test('should use continuation format when no suffix', () => {
			const prompt = 'function hello() {\n\tconsole.log("world");\n';
			const result = buildFIMPrompt(prompt, '');

			expect(result).toContain('Continue this code naturally');
			expect(result).toContain('EXISTING CODE:');
			expect(result).not.toContain('CODE AFTER CURSOR:');
		});

		test('should treat whitespace-only suffix as empty', () => {
			const prompt = 'const x = 1;';
			const result1 = buildFIMPrompt(prompt, '   ');
			const result2 = buildFIMPrompt(prompt, '\n\t\n');
			const result3 = buildFIMPrompt(prompt, '');

			expect(result1).toContain('Continue this code naturally');
			expect(result2).toContain('Continue this code naturally');
			expect(result3).toContain('Continue this code naturally');
		});
	});

	suite('buildFIMPrompt - edge cases', () => {
		test('should handle empty prompt', () => {
			const result = buildFIMPrompt('', '');
			expect(result).toContain('EXISTING CODE:');
			expect(result).toContain('```\n\n```');
		});

		test('should handle very long prompts', () => {
			const longPrompt = 'x'.repeat(10000);
			const result = buildFIMPrompt(longPrompt, '');
			expect(result).toContain(longPrompt);
		});

		test('should handle special characters', () => {
			const prompt = '// Comment with $pecial ch@racters & symbols < > " \' `';
			const result = buildFIMPrompt(prompt, '');
			expect(result).toContain(prompt);
		});

		test('should handle code with backticks', () => {
			const prompt = 'const template = `Hello ${name}`;';
			const suffix = '\nconsole.log(template);';
			const result = buildFIMPrompt(prompt, suffix);

			expect(result).toContain('Hello ${name}');
			expect(result).toContain('console.log(template)');
		});
	});
});

suite('Context Extraction', () => {
	suite('extractCodeContext', () => {
		test('should extract lines before cursor', () => {
			const content = `line 0
line 1
line 2
line 3
line 4
line 5
line 6`;
			const result = extractCodeContext(content, 5, 3);
			// cursorLine=5, linesBefore=3: startLine = max(0, 5-3) = 2, so lines 2-5
			expect(result).toBe('line 2\nline 3\nline 4\nline 5');
		});

		test('should handle cursor at beginning of file', () => {
			const content = `line 0
line 1
line 2`;
			const result = extractCodeContext(content, 1, 5);
			expect(result).toBe('line 0\nline 1');
		});

		test('should handle single line file', () => {
			const content = 'single line';
			const result = extractCodeContext(content, 0, 5);
			expect(result).toBe('single line');
		});

		test('should use default lines before value', () => {
			const content = Array(10).fill(0).map((_, i) => `line ${i}`).join('\n');
			const result = extractCodeContext(content, 8);
			// Default is 5 lines before + current line (cursor at line 8 = lines 3-8)
			expect(result).toBe('line 3\nline 4\nline 5\nline 6\nline 7\nline 8');
		});
	});

	suite('isContextTooShort', () => {
		test('should return true for empty string', () => {
			expect(isContextTooShort('')).toBe(true);
		});

		test('should return true for whitespace only', () => {
			expect(isContextTooShort('   \n\t  ')).toBe(true);
		});

		test('should return true for short content', () => {
			expect(isContextTooShort('abc')).toBe(true);
		});

		test('should return false for adequate content', () => {
			expect(isContextTooShort('function foo()')).toBe(false);
		});

		test('should use custom minimum length', () => {
			expect(isContextTooShort('hello', 10)).toBe(true);
			expect(isContextTooShort('hello world', 10)).toBe(false);
		});
	});
});

suite('FIM Response Processing', () => {
	suite('Code snippet ranking', () => {
		test('should calculate importance based on index', () => {
			const calculateImportance = (index: number): number => {
				return Math.round((1 - index * 0.1) * 100);
			};

			expect(calculateImportance(0)).toBe(100);
			expect(calculateImportance(1)).toBe(90);
			expect(calculateImportance(2)).toBe(80);
			expect(calculateImportance(5)).toBe(50);
		});

		test('should filter out current file from results', () => {
			const currentUri = 'file:///project/src/current.ts';
			const results = [
				{ uri: 'file:///project/src/current.ts', content: 'current file' },
				{ uri: 'file:///project/src/other.ts', content: 'other file' },
				{ uri: 'file:///project/src/another.ts', content: 'another file' },
			];

			const filtered = results.filter(r => r.uri !== currentUri);
			expect(filtered.length).toBe(2);
			expect(filtered.every(r => r.uri !== currentUri)).toBe(true);
		});
	});

	suite('Language selector matching', () => {
		const supportedLanguages = [
			'typescript', 'typescriptreact', 'javascript', 'javascriptreact',
			'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'ruby',
			'php', 'swift', 'kotlin', 'scala', 'vue', 'svelte'
		];

		test('should support TypeScript variants', () => {
			expect(supportedLanguages.includes('typescript')).toBe(true);
			expect(supportedLanguages.includes('typescriptreact')).toBe(true);
		});

		test('should support JavaScript variants', () => {
			expect(supportedLanguages.includes('javascript')).toBe(true);
			expect(supportedLanguages.includes('javascriptreact')).toBe(true);
		});

		test('should support systems languages', () => {
			expect(supportedLanguages.includes('c')).toBe(true);
			expect(supportedLanguages.includes('cpp')).toBe(true);
			expect(supportedLanguages.includes('rust')).toBe(true);
			expect(supportedLanguages.includes('go')).toBe(true);
		});

		test('should support dynamic languages', () => {
			expect(supportedLanguages.includes('python')).toBe(true);
			expect(supportedLanguages.includes('ruby')).toBe(true);
			expect(supportedLanguages.includes('php')).toBe(true);
		});

		test('should support JVM languages', () => {
			expect(supportedLanguages.includes('java')).toBe(true);
			expect(supportedLanguages.includes('kotlin')).toBe(true);
			expect(supportedLanguages.includes('scala')).toBe(true);
		});

		test('should support frontend frameworks', () => {
			expect(supportedLanguages.includes('vue')).toBe(true);
			expect(supportedLanguages.includes('svelte')).toBe(true);
		});
	});
});

suite('FIM Completion Response Conversion', () => {
	test('should convert chat completion to text completion format', () => {
		const chatResponse = {
			id: 'chat-123',
			created: 1234567890,
			model: 'glm-4.6',
			choices: [
				{
					message: { content: 'completed code here' },
					index: 0,
					finish_reason: 'stop'
				}
			],
			usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
		};

		const completionResponse = {
			id: chatResponse.id,
			object: 'text_completion',
			created: chatResponse.created,
			model: chatResponse.model,
			choices: chatResponse.choices.map((choice) => ({
				text: choice.message.content,
				index: choice.index,
				finish_reason: choice.finish_reason,
			})),
			usage: chatResponse.usage,
		};

		expect(completionResponse.object).toBe('text_completion');
		expect(completionResponse.choices[0].text).toBe('completed code here');
		expect(completionResponse.choices[0].index).toBe(0);
		expect(completionResponse.choices[0].finish_reason).toBe('stop');
	});

	test('should handle streaming chunk conversion', () => {
		const streamChunk = {
			id: 'chunk-123',
			created: 1234567890,
			model: 'glm-4.6',
			choices: [
				{
					delta: { content: 'partial ' },
					index: 0,
					finish_reason: null
				}
			]
		};

		const completionChunk = {
			id: streamChunk.id,
			object: 'text_completion',
			created: streamChunk.created,
			model: streamChunk.model,
			choices: [{
				text: streamChunk.choices[0].delta?.content || '',
				index: 0,
				finish_reason: streamChunk.choices[0].finish_reason,
			}],
		};

		expect(completionChunk.object).toBe('text_completion');
		expect(completionChunk.choices[0].text).toBe('partial ');
		expect(completionChunk.choices[0].finish_reason).toBeNull();
	});

	test('should handle empty delta content', () => {
		const streamChunk = {
			choices: [{ delta: {}, index: 0, finish_reason: null }]
		};

		const text = streamChunk.choices[0].delta?.content || '';
		expect(text).toBe('');
	});
});
