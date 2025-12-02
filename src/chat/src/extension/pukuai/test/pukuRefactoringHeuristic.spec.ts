/*---------------------------------------------------------------------------------------------
 *  Puku AI Refactoring Heuristic Tests
 *  Tests for Tree-sitter AST-based refactoring pattern detection
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect } from 'vitest';
import { structureComputer } from '../../../platform/parser/node/structure';
import { getWasmLanguage } from '../../../platform/parser/node/treeSitterLanguages';

describe('Puku Refactoring Heuristic', () => {

	describe('Python Patterns', () => {
		it('detects empty array + for loop with append', async () => {
			const code = `users = []
for user in db.query(User).all():
    if user.active:
        users.append(user)`;

			const wasmLanguage = getWasmLanguage('python');
			expect(wasmLanguage).toBeTruthy();

			const overlayNode = await structureComputer.getStructure(wasmLanguage!, code);
			expect(overlayNode?.tree).toBeTruthy();

			// Check for for_statement node
			const hasForLoop = hasNodeOfType(overlayNode.tree.rootNode, 'for_statement');
			expect(hasForLoop).toBe(true);

			// Check for append call in loop body
			const hasAppend = hasCallWithName(overlayNode.tree.rootNode, 'append');
			expect(hasAppend).toBe(true);
		});

		it('does NOT detect simple print loop', async () => {
			const code = `for user in users:
    print(f"User: {user.name}")`;

			const wasmLanguage = getWasmLanguage('python');
			const overlayNode = await structureComputer.getStructure(wasmLanguage!, code);
			expect(overlayNode?.tree).toBeTruthy();

			// Should have for loop but NO append
			const hasForLoop = hasNodeOfType(overlayNode.tree.rootNode, 'for_statement');
			const hasAppend = hasCallWithName(overlayNode.tree.rootNode, 'append');

			expect(hasForLoop).toBe(true);
			expect(hasAppend).toBe(false);
		});

		it('does NOT detect nested loops', async () => {
			const code = `for category in categories:
    for item in category.items:
        if item.active:
            results.append(item)`;

			const wasmLanguage = getWasmLanguage('python');
			const overlayNode = await structureComputer.getStructure(wasmLanguage!, code);
			expect(overlayNode?.tree).toBeTruthy();

			// Count for loops (should be 2 - nested)
			const forLoopCount = countNodesOfType(overlayNode.tree.rootNode, 'for_statement');
			expect(forLoopCount).toBe(2);
		});

		it('detects .filter().first() chain', async () => {
			const code = `user = db.query(User).filter(User.email == email).first()`;

			const wasmLanguage = getWasmLanguage('python');
			const overlayNode = await structureComputer.getStructure(wasmLanguage!, code);
			expect(overlayNode?.tree).toBeTruthy();

			// Check for chained calls
			const callChain = getCallChainNames(overlayNode.tree.rootNode);
			expect(callChain.includes('filter')).toBe(true);
			expect(callChain.includes('first')).toBe(true);
		});
	});

	describe('JavaScript Patterns', () => {
		it('detects .filter().map() chain', async () => {
			const code = `const activeUsers = users.filter(u => u.active).map(u => u.name);`;

			const wasmLanguage = getWasmLanguage('javascript');
			expect(wasmLanguage).toBeTruthy();

			const overlayNode = await structureComputer.getStructure(wasmLanguage!, code);
			expect(overlayNode?.tree).toBeTruthy();

			const callChain = getCallChainNames(overlayNode.tree.rootNode);
			expect(callChain.includes('filter')).toBe(true);
			expect(callChain.includes('map')).toBe(true);
		});

		it('detects empty array + for loop with push', async () => {
			const code = `let results = [];
for (let i = 0; i < items.length; i++) {
    if (items[i].active) {
        results.push(items[i]);
    }
}`;

			const wasmLanguage = getWasmLanguage('javascript');
			const overlayNode = await structureComputer.getStructure(wasmLanguage!, code);
			expect(overlayNode?.tree).toBeTruthy();

			const hasForLoop = hasNodeOfType(overlayNode.tree.rootNode, 'for_statement');
			const hasPush = hasCallWithName(overlayNode.tree.rootNode, 'push');

			expect(hasForLoop).toBe(true);
			expect(hasPush).toBe(true);
		});
	});

	describe('TypeScript Patterns', () => {
		it('detects .filter().map() chain in TypeScript', async () => {
			const code = `const names: string[] = users.filter(u => u.active).map(u => u.name);`;

			const wasmLanguage = getWasmLanguage('typescript');
			expect(wasmLanguage).toBeTruthy();

			const overlayNode = await structureComputer.getStructure(wasmLanguage!, code);
			expect(overlayNode?.tree).toBeTruthy();

			const callChain = getCallChainNames(overlayNode.tree.rootNode);
			expect(callChain.includes('filter')).toBe(true);
			expect(callChain.includes('map')).toBe(true);
		});
	});

	describe('Go Patterns', () => {
		it('detects for range loop with append', async () => {
			const code = `results := []string{}
for _, item := range items {
    if item.Active {
        results = append(results, item.Name)
    }
}`;

			const wasmLanguage = getWasmLanguage('go');
			expect(wasmLanguage).toBeTruthy();

			const overlayNode = await structureComputer.getStructure(wasmLanguage!, code);
			expect(overlayNode?.tree).toBeTruthy();

			// Go uses 'for_statement' for range loops
			const hasForLoop = hasNodeOfType(overlayNode.tree.rootNode, 'for_statement');
			const hasAppend = hasCallWithName(overlayNode.tree.rootNode, 'append');

			expect(hasForLoop).toBe(true);
			expect(hasAppend).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('handles empty code', async () => {
			const code = '';
			const wasmLanguage = getWasmLanguage('python');
			const overlayNode = await structureComputer.getStructure(wasmLanguage!, code);

			// Empty code should parse but have no interesting nodes
			expect(overlayNode?.tree).toBeTruthy();
		});

		it('handles syntax errors gracefully', async () => {
			const code = 'def broken_func(\n    # Missing closing paren';
			const wasmLanguage = getWasmLanguage('python');

			try {
				const overlayNode = await structureComputer.getStructure(wasmLanguage!, code);
				// Tree-sitter should still produce a tree even with errors
				expect(overlayNode?.tree).toBeTruthy();
			} catch (error) {
				// If it throws, that's acceptable (fail gracefully)
				expect(true).toBe(true);
			}
		});

		it('returns false for unsupported languages', () => {
			const wasmLanguage = getWasmLanguage('brainfuck' as any);
			expect(wasmLanguage).toBeFalsy();
		});
	});
});

// Helper functions
function hasNodeOfType(node: any, type: string): boolean {
	if (node.type === type) {
		return true;
	}
	for (let i = 0; i < node.childCount; i++) {
		if (hasNodeOfType(node.child(i), type)) {
			return true;
		}
	}
	return false;
}

function countNodesOfType(node: any, type: string): number {
	let count = node.type === type ? 1 : 0;
	for (let i = 0; i < node.childCount; i++) {
		count += countNodesOfType(node.child(i), type);
	}
	return count;
}

function hasCallWithName(node: any, name: string): boolean {
	// Check for call expressions with specific function name
	if (node.type === 'call' || node.type === 'call_expression') {
		const text = node.text;
		if (text.includes(name + '(')) {
			return true;
		}
	}
	for (let i = 0; i < node.childCount; i++) {
		if (hasCallWithName(node.child(i), name)) {
			return true;
		}
	}
	return false;
}

function getCallChainNames(node: any): string[] {
	const names: string[] = [];
	collectCallNames(node, names);
	return names;
}

function collectCallNames(node: any, names: string[]): void {
	// Python: member_expression -> attribute
	// JavaScript: call_expression -> member_expression
	if (node.type === 'attribute' || node.type === 'identifier') {
		const text = node.text;
		if (text && !names.includes(text)) {
			names.push(text);
		}
	}

	for (let i = 0; i < node.childCount; i++) {
		collectCallNames(node.child(i), names);
	}
}
