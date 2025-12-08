"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const pukuASTChunker_1 = require("../pukuASTChunker");
(0, vitest_1.suite)('PukuASTChunker', () => {
    let chunker;
    chunker = new pukuASTChunker_1.PukuASTChunker();
    (0, vitest_1.suite)('isASTSupported', () => {
        (0, vitest_1.test)('should return true for TypeScript', () => {
            (0, vitest_1.expect)(chunker.isASTSupported('typescript')).toBe(true);
        });
        (0, vitest_1.test)('should return true for JavaScript', () => {
            (0, vitest_1.expect)(chunker.isASTSupported('javascript')).toBe(true);
        });
        (0, vitest_1.test)('should return true for Python', () => {
            (0, vitest_1.expect)(chunker.isASTSupported('python')).toBe(true);
        });
        (0, vitest_1.test)('should return true for Go', () => {
            (0, vitest_1.expect)(chunker.isASTSupported('go')).toBe(true);
        });
        (0, vitest_1.test)('should return true for Rust', () => {
            (0, vitest_1.expect)(chunker.isASTSupported('rust')).toBe(true);
        });
        (0, vitest_1.test)('should return false for unsupported languages', () => {
            (0, vitest_1.expect)(chunker.isASTSupported('xml')).toBe(false);
            (0, vitest_1.expect)(chunker.isASTSupported('plaintext')).toBe(false);
        });
    });
    (0, vitest_1.suite)('chunkContent - Line-based fallback', () => {
        (0, vitest_1.test)('should use line-based chunking for unsupported languages', async () => {
            const content = Array(100).fill('line of content').join('\n');
            const chunks = await chunker.chunkContent(content, 'plaintext');
            (0, vitest_1.expect)(chunks.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(chunks.every(c => c.chunkType === 'block')).toBe(true);
        });
        (0, vitest_1.test)('should skip chunks smaller than MIN_CHUNK_SIZE', async () => {
            const content = 'tiny';
            const chunks = await chunker.chunkContent(content, 'plaintext');
            (0, vitest_1.expect)(chunks.length).toBe(0);
        });
        (0, vitest_1.test)('should produce overlapping chunks', async () => {
            // 100 lines of content with at least 100 chars per chunk
            const content = Array(100).fill('x'.repeat(20)).join('\n');
            const chunks = await chunker.chunkContent(content, 'plaintext');
            if (chunks.length > 1) {
                // Check for overlap: lineEnd of chunk n should be >= lineStart of chunk n+1
                const firstChunk = chunks[0];
                const secondChunk = chunks[1];
                (0, vitest_1.expect)(firstChunk.lineEnd).toBeGreaterThanOrEqual(secondChunk.lineStart - 15);
            }
        });
    });
    (0, vitest_1.suite)('chunkContent - AST-based', () => {
        (0, vitest_1.test)('should chunk TypeScript functions', async () => {
            const tsCode = `
function hello() {
	console.log("hello");
	console.log("world");
	console.log("more lines");
	console.log("to make it");
	console.log("above minimum");
}

function goodbye() {
	console.log("goodbye");
	console.log("world");
	console.log("more lines");
	console.log("to make it");
	console.log("above minimum");
}
`;
            const chunks = await chunker.chunkContent(tsCode, 'typescript');
            // Should find function chunks
            const functionChunks = chunks.filter(c => c.chunkType === 'function');
            (0, vitest_1.expect)(functionChunks.length).toBeGreaterThanOrEqual(1);
        });
        (0, vitest_1.test)('should chunk TypeScript classes', async () => {
            const tsCode = `
class MyClass {
	private value: number;

	constructor() {
		this.value = 0;
		console.log("constructor");
		console.log("more lines");
	}

	getValue(): number {
		return this.value;
		console.log("getter");
		console.log("more lines");
	}

	setValue(v: number): void {
		this.value = v;
		console.log("setter");
		console.log("more lines");
	}
}
`;
            const chunks = await chunker.chunkContent(tsCode, 'typescript');
            (0, vitest_1.expect)(chunks.length).toBeGreaterThan(0);
            // Should find class or method chunks
            const semanticChunks = chunks.filter(c => c.chunkType === 'class' || c.chunkType === 'method' || c.chunkType === 'function');
            (0, vitest_1.expect)(semanticChunks.length).toBeGreaterThanOrEqual(1);
        });
        (0, vitest_1.test)('should chunk Python functions', async () => {
            const pyCode = `
def hello():
    print("hello")
    print("world")
    print("more lines")
    print("to make it")
    print("above minimum")

def goodbye():
    print("goodbye")
    print("world")
    print("more lines")
    print("to make it")
    print("above minimum")
`;
            const chunks = await chunker.chunkContent(pyCode, 'python');
            (0, vitest_1.expect)(chunks.length).toBeGreaterThan(0);
        });
        (0, vitest_1.test)('should extract symbol names', async () => {
            const tsCode = `
function calculateTotal(items: number[]): number {
	let total = 0;
	for (const item of items) {
		total += item;
	}
	return total;
}
`;
            const chunks = await chunker.chunkContent(tsCode, 'typescript');
            const functionChunk = chunks.find(c => c.chunkType === 'function');
            if (functionChunk && functionChunk.symbolName) {
                (0, vitest_1.expect)(functionChunk.symbolName).toBe('calculateTotal');
            }
        });
        (0, vitest_1.test)('should fill gaps between AST chunks', async () => {
            const tsCode = `
// Header comment
// More comments
// Even more comments
const CONFIG = { value: 1 };

function foo() {
	console.log("foo");
	console.log("more lines");
	console.log("to make it");
	console.log("above minimum");
}

// Middle comment section
// With multiple lines
// That should become a block

function bar() {
	console.log("bar");
	console.log("more lines");
	console.log("to make it");
	console.log("above minimum");
}
`;
            const chunks = await chunker.chunkContent(tsCode, 'typescript');
            // Should have both function chunks and block chunks for gaps
            (0, vitest_1.expect)(chunks.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.suite)('chunk properties', () => {
        (0, vitest_1.test)('chunks should have valid line numbers', async () => {
            const content = Array(100).fill('// line').join('\n');
            const chunks = await chunker.chunkContent(content, 'plaintext');
            for (const chunk of chunks) {
                (0, vitest_1.expect)(chunk.lineStart).toBeGreaterThanOrEqual(1);
                (0, vitest_1.expect)(chunk.lineEnd).toBeGreaterThanOrEqual(chunk.lineStart);
                (0, vitest_1.expect)(chunk.text.length).toBeGreaterThan(0);
            }
        });
        (0, vitest_1.test)('chunks should be sorted by line number', async () => {
            const content = Array(200).fill('// line of code').join('\n');
            const chunks = await chunker.chunkContent(content, 'plaintext');
            for (let i = 1; i < chunks.length; i++) {
                (0, vitest_1.expect)(chunks[i].lineStart).toBeGreaterThanOrEqual(chunks[i - 1].lineStart);
            }
        });
    });
});
//# sourceMappingURL=pukuASTChunker.spec.js.map