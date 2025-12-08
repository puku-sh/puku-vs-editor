"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Test the helper functions that can be tested without VS Code dependencies
(0, vitest_1.describe)('PukuInlineCompletionProvider - Helper Functions', () => {
    (0, vitest_1.describe)('buildFIMPrompt', () => {
        // Inline the function for testing since it's not exported
        function buildFIMPrompt(prefix, suffix) {
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
            }
            else {
                return `Continue this code naturally. Complete the next logical lines.

EXISTING CODE:
\`\`\`
${prefix}
\`\`\`

Write ONLY the next lines of code that continue from where it left off. Do not repeat existing code. Do not add explanations or markdown. Output only the completion code.`;
            }
        }
        (0, vitest_1.it)('should create continuation prompt when no suffix', () => {
            const prefix = 'function hello() {';
            const prompt = buildFIMPrompt(prefix);
            (0, vitest_1.expect)(prompt).toContain('Continue this code naturally');
            (0, vitest_1.expect)(prompt).toContain(prefix);
            (0, vitest_1.expect)(prompt).not.toContain('CODE AFTER CURSOR');
        });
        (0, vitest_1.it)('should create continuation prompt when suffix is empty', () => {
            const prefix = 'function hello() {';
            const prompt = buildFIMPrompt(prefix, '');
            (0, vitest_1.expect)(prompt).toContain('Continue this code naturally');
        });
        (0, vitest_1.it)('should create continuation prompt when suffix is whitespace only', () => {
            const prefix = 'function hello() {';
            const prompt = buildFIMPrompt(prefix, '   \n\t  ');
            (0, vitest_1.expect)(prompt).toContain('Continue this code naturally');
        });
        (0, vitest_1.it)('should create FIM prompt when suffix is provided', () => {
            const prefix = 'function fibonacci(n) {';
            const suffix = '\n    return result;\n}';
            const prompt = buildFIMPrompt(prefix, suffix);
            (0, vitest_1.expect)(prompt).toContain('CODE BEFORE CURSOR');
            (0, vitest_1.expect)(prompt).toContain('CODE AFTER CURSOR');
            (0, vitest_1.expect)(prompt).toContain(prefix);
            (0, vitest_1.expect)(prompt).toContain(suffix);
            (0, vitest_1.expect)(prompt).toContain('Write ONLY the code that belongs between');
        });
        (0, vitest_1.it)('should handle multiline prefix', () => {
            const prefix = `function calculate(a, b) {
    const sum = a + b;
    const product = a * b;`;
            const prompt = buildFIMPrompt(prefix);
            (0, vitest_1.expect)(prompt).toContain('const sum = a + b;');
            (0, vitest_1.expect)(prompt).toContain('const product = a * b;');
        });
    });
    (0, vitest_1.describe)('extractCodeFromResponse', () => {
        // Inline the function for testing
        function extractCodeFromResponse(response) {
            let code = response.trim();
            // Check for triple backtick code blocks
            const codeBlockMatch = code.match(/```(?:\w+)?\n?([\s\S]*?)```/);
            if (codeBlockMatch) {
                code = codeBlockMatch[1];
            }
            return code.trim();
        }
        (0, vitest_1.it)('should return plain text unchanged', () => {
            const input = 'return a + b;';
            (0, vitest_1.expect)(extractCodeFromResponse(input)).toBe('return a + b;');
        });
        (0, vitest_1.it)('should extract code from markdown code block', () => {
            const input = '```typescript\nreturn a + b;\n```';
            (0, vitest_1.expect)(extractCodeFromResponse(input)).toBe('return a + b;');
        });
        (0, vitest_1.it)('should extract code from code block without language', () => {
            const input = '```\nreturn a + b;\n```';
            (0, vitest_1.expect)(extractCodeFromResponse(input)).toBe('return a + b;');
        });
        (0, vitest_1.it)('should handle code block with extra whitespace', () => {
            const input = '  ```python\n  def hello():\n      pass\n```  ';
            (0, vitest_1.expect)(extractCodeFromResponse(input)).toBe('def hello():\n      pass');
        });
        (0, vitest_1.it)('should handle multiline code blocks', () => {
            const input = `\`\`\`javascript
function foo() {
    console.log("hello");
    return 42;
}
\`\`\``;
            const result = extractCodeFromResponse(input);
            (0, vitest_1.expect)(result).toContain('function foo()');
            (0, vitest_1.expect)(result).toContain('return 42;');
        });
        (0, vitest_1.it)('should trim leading and trailing whitespace', () => {
            const input = '   \n  const x = 1;  \n   ';
            (0, vitest_1.expect)(extractCodeFromResponse(input)).toBe('const x = 1;');
        });
    });
    (0, vitest_1.describe)('Supported Languages', () => {
        const SUPPORTED_LANGUAGES = [
            'typescript', 'typescriptreact', 'javascript', 'javascriptreact',
            'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'ruby',
            'php', 'swift', 'kotlin', 'scala', 'vue', 'svelte', 'html', 'css',
            'scss', 'less', 'json', 'yaml', 'markdown', 'sql', 'shell', 'bash'
        ];
        (0, vitest_1.it)('should include common programming languages', () => {
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('typescript');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('python');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('javascript');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('java');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('go');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('rust');
        });
        (0, vitest_1.it)('should include React variants', () => {
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('typescriptreact');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('javascriptreact');
        });
        (0, vitest_1.it)('should include web technologies', () => {
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('html');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('css');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('vue');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('svelte');
        });
        (0, vitest_1.it)('should include shell languages', () => {
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('shell');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('bash');
        });
        (0, vitest_1.it)('should include data formats', () => {
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('json');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('yaml');
            (0, vitest_1.expect)(SUPPORTED_LANGUAGES).toContain('sql');
        });
    });
    (0, vitest_1.describe)('Debounce Logic', () => {
        (0, vitest_1.it)('should calculate time difference correctly', () => {
            const debounceMs = 150;
            const lastRequestTime = Date.now() - 100; // 100ms ago
            const now = Date.now();
            const shouldDebounce = now - lastRequestTime < debounceMs;
            (0, vitest_1.expect)(shouldDebounce).toBe(true);
        });
        (0, vitest_1.it)('should not debounce after enough time has passed', () => {
            const debounceMs = 150;
            const lastRequestTime = Date.now() - 200; // 200ms ago
            const now = Date.now();
            const shouldDebounce = now - lastRequestTime < debounceMs;
            (0, vitest_1.expect)(shouldDebounce).toBe(false);
        });
    });
    (0, vitest_1.describe)('Prefix Validation', () => {
        (0, vitest_1.it)('should reject very short prefix', () => {
            const minLength = 5;
            const prefix = 'ab';
            (0, vitest_1.expect)(prefix.trim().length < minLength).toBe(true);
        });
        (0, vitest_1.it)('should accept prefix with enough content', () => {
            const minLength = 5;
            const prefix = 'function hello()';
            (0, vitest_1.expect)(prefix.trim().length >= minLength).toBe(true);
        });
        (0, vitest_1.it)('should handle whitespace-only prefix', () => {
            const minLength = 5;
            const prefix = '     ';
            (0, vitest_1.expect)(prefix.trim().length < minLength).toBe(true);
        });
    });
    (0, vitest_1.describe)('Response Parsing', () => {
        (0, vitest_1.it)('should parse native completion response', () => {
            const response = {
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
            (0, vitest_1.expect)(text).toBe('return a + b;');
        });
        (0, vitest_1.it)('should parse chat completion response', () => {
            const response = {
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
            (0, vitest_1.expect)(content).toBe('return a + b;');
        });
        (0, vitest_1.it)('should handle empty choices', () => {
            const response = {
                id: 'test-id',
                object: 'text_completion',
                created: Date.now(),
                model: 'test-model',
                choices: []
            };
            const hasChoices = response.choices && response.choices.length > 0;
            (0, vitest_1.expect)(hasChoices).toBe(false);
        });
    });
});
//# sourceMappingURL=pukuInlineCompletionProvider.spec.js.map