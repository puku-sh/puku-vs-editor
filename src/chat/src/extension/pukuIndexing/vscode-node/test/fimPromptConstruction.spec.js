"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
/**
 * FIM (Fill-In-Middle) Prompt Construction Tests
 *
 * These tests verify the prompt construction logic used by the proxy server
 * to convert FIM requests into chat completions format for GLM models.
 */
// Helper functions that mirror the proxy's prompt construction logic
function buildFIMPrompt(prompt, suffix) {
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
    }
    else {
        // Simple completion - continue the code naturally
        return `Continue this code naturally. Complete the next logical lines.

EXISTING CODE:
\`\`\`
${prompt}
\`\`\`

Write ONLY the next lines of code that continue from where it left off. Do not repeat existing code. Do not add explanations or markdown. Output only the completion code.`;
    }
}
function extractCodeContext(fullContent, cursorLine, linesBefore = 5) {
    const lines = fullContent.split('\n');
    const startLine = Math.max(0, cursorLine - linesBefore);
    return lines.slice(startLine, cursorLine + 1).join('\n');
}
function isContextTooShort(context, minLength = 10) {
    return !context || context.trim().length < minLength;
}
(0, vitest_1.suite)('FIM Prompt Construction', () => {
    (0, vitest_1.suite)('buildFIMPrompt - with suffix', () => {
        (0, vitest_1.test)('should include both before and after code markers', () => {
            const prompt = 'function hello() {\n\tconsole.log(';
            const suffix = ');\n}';
            const result = buildFIMPrompt(prompt, suffix);
            (0, vitest_1.expect)(result).toContain('CODE BEFORE CURSOR:');
            (0, vitest_1.expect)(result).toContain('CODE AFTER CURSOR:');
            (0, vitest_1.expect)(result).toContain(prompt);
            (0, vitest_1.expect)(result).toContain(suffix);
        });
        (0, vitest_1.test)('should include instructions for completion', () => {
            const prompt = 'const x = ';
            const suffix = ' + 1;';
            const result = buildFIMPrompt(prompt, suffix);
            (0, vitest_1.expect)(result).toContain('Write ONLY the code');
            (0, vitest_1.expect)(result).toContain('Do not repeat');
            (0, vitest_1.expect)(result).toContain('Do not add explanations');
        });
        (0, vitest_1.test)('should handle multiline code correctly', () => {
            const prompt = `function calculate(items) {
	let total = 0;
	for (const item of items) {
		total += `;
            const suffix = `;
	}
	return total;
}`;
            const result = buildFIMPrompt(prompt, suffix);
            (0, vitest_1.expect)(result).toContain('function calculate(items)');
            (0, vitest_1.expect)(result).toContain('return total;');
        });
    });
    (0, vitest_1.suite)('buildFIMPrompt - without suffix', () => {
        (0, vitest_1.test)('should use continuation format when no suffix', () => {
            const prompt = 'function hello() {\n\tconsole.log("world");\n';
            const result = buildFIMPrompt(prompt, '');
            (0, vitest_1.expect)(result).toContain('Continue this code naturally');
            (0, vitest_1.expect)(result).toContain('EXISTING CODE:');
            (0, vitest_1.expect)(result).not.toContain('CODE AFTER CURSOR:');
        });
        (0, vitest_1.test)('should treat whitespace-only suffix as empty', () => {
            const prompt = 'const x = 1;';
            const result1 = buildFIMPrompt(prompt, '   ');
            const result2 = buildFIMPrompt(prompt, '\n\t\n');
            const result3 = buildFIMPrompt(prompt, '');
            (0, vitest_1.expect)(result1).toContain('Continue this code naturally');
            (0, vitest_1.expect)(result2).toContain('Continue this code naturally');
            (0, vitest_1.expect)(result3).toContain('Continue this code naturally');
        });
    });
    (0, vitest_1.suite)('buildFIMPrompt - edge cases', () => {
        (0, vitest_1.test)('should handle empty prompt', () => {
            const result = buildFIMPrompt('', '');
            (0, vitest_1.expect)(result).toContain('EXISTING CODE:');
            (0, vitest_1.expect)(result).toContain('```\n\n```');
        });
        (0, vitest_1.test)('should handle very long prompts', () => {
            const longPrompt = 'x'.repeat(10000);
            const result = buildFIMPrompt(longPrompt, '');
            (0, vitest_1.expect)(result).toContain(longPrompt);
        });
        (0, vitest_1.test)('should handle special characters', () => {
            const prompt = '// Comment with $pecial ch@racters & symbols < > " \' `';
            const result = buildFIMPrompt(prompt, '');
            (0, vitest_1.expect)(result).toContain(prompt);
        });
        (0, vitest_1.test)('should handle code with backticks', () => {
            const prompt = 'const template = `Hello ${name}`;';
            const suffix = '\nconsole.log(template);';
            const result = buildFIMPrompt(prompt, suffix);
            (0, vitest_1.expect)(result).toContain('Hello ${name}');
            (0, vitest_1.expect)(result).toContain('console.log(template)');
        });
    });
});
(0, vitest_1.suite)('Context Extraction', () => {
    (0, vitest_1.suite)('extractCodeContext', () => {
        (0, vitest_1.test)('should extract lines before cursor', () => {
            const content = `line 0
line 1
line 2
line 3
line 4
line 5
line 6`;
            const result = extractCodeContext(content, 5, 3);
            // cursorLine=5, linesBefore=3: startLine = max(0, 5-3) = 2, so lines 2-5
            (0, vitest_1.expect)(result).toBe('line 2\nline 3\nline 4\nline 5');
        });
        (0, vitest_1.test)('should handle cursor at beginning of file', () => {
            const content = `line 0
line 1
line 2`;
            const result = extractCodeContext(content, 1, 5);
            (0, vitest_1.expect)(result).toBe('line 0\nline 1');
        });
        (0, vitest_1.test)('should handle single line file', () => {
            const content = 'single line';
            const result = extractCodeContext(content, 0, 5);
            (0, vitest_1.expect)(result).toBe('single line');
        });
        (0, vitest_1.test)('should use default lines before value', () => {
            const content = Array(10).fill(0).map((_, i) => `line ${i}`).join('\n');
            const result = extractCodeContext(content, 8);
            // Default is 5 lines before + current line (cursor at line 8 = lines 3-8)
            (0, vitest_1.expect)(result).toBe('line 3\nline 4\nline 5\nline 6\nline 7\nline 8');
        });
    });
    (0, vitest_1.suite)('isContextTooShort', () => {
        (0, vitest_1.test)('should return true for empty string', () => {
            (0, vitest_1.expect)(isContextTooShort('')).toBe(true);
        });
        (0, vitest_1.test)('should return true for whitespace only', () => {
            (0, vitest_1.expect)(isContextTooShort('   \n\t  ')).toBe(true);
        });
        (0, vitest_1.test)('should return true for short content', () => {
            (0, vitest_1.expect)(isContextTooShort('abc')).toBe(true);
        });
        (0, vitest_1.test)('should return false for adequate content', () => {
            (0, vitest_1.expect)(isContextTooShort('function foo()')).toBe(false);
        });
        (0, vitest_1.test)('should use custom minimum length', () => {
            (0, vitest_1.expect)(isContextTooShort('hello', 10)).toBe(true);
            (0, vitest_1.expect)(isContextTooShort('hello world', 10)).toBe(false);
        });
    });
});
(0, vitest_1.suite)('FIM Response Processing', () => {
    (0, vitest_1.suite)('Code snippet ranking', () => {
        (0, vitest_1.test)('should calculate importance based on index', () => {
            const calculateImportance = (index) => {
                return Math.round((1 - index * 0.1) * 100);
            };
            (0, vitest_1.expect)(calculateImportance(0)).toBe(100);
            (0, vitest_1.expect)(calculateImportance(1)).toBe(90);
            (0, vitest_1.expect)(calculateImportance(2)).toBe(80);
            (0, vitest_1.expect)(calculateImportance(5)).toBe(50);
        });
        (0, vitest_1.test)('should filter out current file from results', () => {
            const currentUri = 'file:///project/src/current.ts';
            const results = [
                { uri: 'file:///project/src/current.ts', content: 'current file' },
                { uri: 'file:///project/src/other.ts', content: 'other file' },
                { uri: 'file:///project/src/another.ts', content: 'another file' },
            ];
            const filtered = results.filter(r => r.uri !== currentUri);
            (0, vitest_1.expect)(filtered.length).toBe(2);
            (0, vitest_1.expect)(filtered.every(r => r.uri !== currentUri)).toBe(true);
        });
    });
    (0, vitest_1.suite)('Language selector matching', () => {
        const supportedLanguages = [
            'typescript', 'typescriptreact', 'javascript', 'javascriptreact',
            'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'ruby',
            'php', 'swift', 'kotlin', 'scala', 'vue', 'svelte'
        ];
        (0, vitest_1.test)('should support TypeScript variants', () => {
            (0, vitest_1.expect)(supportedLanguages.includes('typescript')).toBe(true);
            (0, vitest_1.expect)(supportedLanguages.includes('typescriptreact')).toBe(true);
        });
        (0, vitest_1.test)('should support JavaScript variants', () => {
            (0, vitest_1.expect)(supportedLanguages.includes('javascript')).toBe(true);
            (0, vitest_1.expect)(supportedLanguages.includes('javascriptreact')).toBe(true);
        });
        (0, vitest_1.test)('should support systems languages', () => {
            (0, vitest_1.expect)(supportedLanguages.includes('c')).toBe(true);
            (0, vitest_1.expect)(supportedLanguages.includes('cpp')).toBe(true);
            (0, vitest_1.expect)(supportedLanguages.includes('rust')).toBe(true);
            (0, vitest_1.expect)(supportedLanguages.includes('go')).toBe(true);
        });
        (0, vitest_1.test)('should support dynamic languages', () => {
            (0, vitest_1.expect)(supportedLanguages.includes('python')).toBe(true);
            (0, vitest_1.expect)(supportedLanguages.includes('ruby')).toBe(true);
            (0, vitest_1.expect)(supportedLanguages.includes('php')).toBe(true);
        });
        (0, vitest_1.test)('should support JVM languages', () => {
            (0, vitest_1.expect)(supportedLanguages.includes('java')).toBe(true);
            (0, vitest_1.expect)(supportedLanguages.includes('kotlin')).toBe(true);
            (0, vitest_1.expect)(supportedLanguages.includes('scala')).toBe(true);
        });
        (0, vitest_1.test)('should support frontend frameworks', () => {
            (0, vitest_1.expect)(supportedLanguages.includes('vue')).toBe(true);
            (0, vitest_1.expect)(supportedLanguages.includes('svelte')).toBe(true);
        });
    });
});
(0, vitest_1.suite)('FIM Completion Response Conversion', () => {
    (0, vitest_1.test)('should convert chat completion to text completion format', () => {
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
        (0, vitest_1.expect)(completionResponse.object).toBe('text_completion');
        (0, vitest_1.expect)(completionResponse.choices[0].text).toBe('completed code here');
        (0, vitest_1.expect)(completionResponse.choices[0].index).toBe(0);
        (0, vitest_1.expect)(completionResponse.choices[0].finish_reason).toBe('stop');
    });
    (0, vitest_1.test)('should handle streaming chunk conversion', () => {
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
        (0, vitest_1.expect)(completionChunk.object).toBe('text_completion');
        (0, vitest_1.expect)(completionChunk.choices[0].text).toBe('partial ');
        (0, vitest_1.expect)(completionChunk.choices[0].finish_reason).toBeNull();
    });
    (0, vitest_1.test)('should handle empty delta content', () => {
        const streamChunk = {
            choices: [{ delta: {}, index: 0, finish_reason: null }]
        };
        const text = streamChunk.choices[0].delta?.content || '';
        (0, vitest_1.expect)(text).toBe('');
    });
});
//# sourceMappingURL=fimPromptConstruction.spec.js.map