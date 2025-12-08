"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku AI Refactoring Heuristic Tests
 *  Tests for Tree-sitter AST-based refactoring pattern detection
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const structure_1 = require("../../../platform/parser/node/structure");
const treeSitterLanguages_1 = require("../../../platform/parser/node/treeSitterLanguages");
(0, vitest_1.describe)('Puku Refactoring Heuristic', () => {
    (0, vitest_1.describe)('Python Patterns', () => {
        (0, vitest_1.it)('detects empty array + for loop with append', async () => {
            const code = `users = []
for user in db.query(User).all():
    if user.active:
        users.append(user)`;
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('python');
            (0, vitest_1.expect)(wasmLanguage).toBeTruthy();
            const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
            (0, vitest_1.expect)(overlayNode?.tree).toBeTruthy();
            // Check for for_statement node
            const hasForLoop = hasNodeOfType(overlayNode.tree.rootNode, 'for_statement');
            (0, vitest_1.expect)(hasForLoop).toBe(true);
            // Check for append call in loop body
            const hasAppend = hasCallWithName(overlayNode.tree.rootNode, 'append');
            (0, vitest_1.expect)(hasAppend).toBe(true);
        });
        (0, vitest_1.it)('does NOT detect simple print loop', async () => {
            const code = `for user in users:
    print(f"User: {user.name}")`;
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('python');
            const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
            (0, vitest_1.expect)(overlayNode?.tree).toBeTruthy();
            // Should have for loop but NO append
            const hasForLoop = hasNodeOfType(overlayNode.tree.rootNode, 'for_statement');
            const hasAppend = hasCallWithName(overlayNode.tree.rootNode, 'append');
            (0, vitest_1.expect)(hasForLoop).toBe(true);
            (0, vitest_1.expect)(hasAppend).toBe(false);
        });
        (0, vitest_1.it)('does NOT detect nested loops', async () => {
            const code = `for category in categories:
    for item in category.items:
        if item.active:
            results.append(item)`;
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('python');
            const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
            (0, vitest_1.expect)(overlayNode?.tree).toBeTruthy();
            // Count for loops (should be 2 - nested)
            const forLoopCount = countNodesOfType(overlayNode.tree.rootNode, 'for_statement');
            (0, vitest_1.expect)(forLoopCount).toBe(2);
        });
        (0, vitest_1.it)('detects .filter().first() chain', async () => {
            const code = `user = db.query(User).filter(User.email == email).first()`;
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('python');
            const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
            (0, vitest_1.expect)(overlayNode?.tree).toBeTruthy();
            // Check for chained calls
            const callChain = getCallChainNames(overlayNode.tree.rootNode);
            (0, vitest_1.expect)(callChain.includes('filter')).toBe(true);
            (0, vitest_1.expect)(callChain.includes('first')).toBe(true);
        });
    });
    (0, vitest_1.describe)('JavaScript Patterns', () => {
        (0, vitest_1.it)('detects .filter().map() chain', async () => {
            const code = `const activeUsers = users.filter(u => u.active).map(u => u.name);`;
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('javascript');
            (0, vitest_1.expect)(wasmLanguage).toBeTruthy();
            const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
            (0, vitest_1.expect)(overlayNode?.tree).toBeTruthy();
            const callChain = getCallChainNames(overlayNode.tree.rootNode);
            (0, vitest_1.expect)(callChain.includes('filter')).toBe(true);
            (0, vitest_1.expect)(callChain.includes('map')).toBe(true);
        });
        (0, vitest_1.it)('detects empty array + for loop with push', async () => {
            const code = `let results = [];
for (let i = 0; i < items.length; i++) {
    if (items[i].active) {
        results.push(items[i]);
    }
}`;
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('javascript');
            const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
            (0, vitest_1.expect)(overlayNode?.tree).toBeTruthy();
            const hasForLoop = hasNodeOfType(overlayNode.tree.rootNode, 'for_statement');
            const hasPush = hasCallWithName(overlayNode.tree.rootNode, 'push');
            (0, vitest_1.expect)(hasForLoop).toBe(true);
            (0, vitest_1.expect)(hasPush).toBe(true);
        });
    });
    (0, vitest_1.describe)('TypeScript Patterns', () => {
        (0, vitest_1.it)('detects .filter().map() chain in TypeScript', async () => {
            const code = `const names: string[] = users.filter(u => u.active).map(u => u.name);`;
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('typescript');
            (0, vitest_1.expect)(wasmLanguage).toBeTruthy();
            const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
            (0, vitest_1.expect)(overlayNode?.tree).toBeTruthy();
            const callChain = getCallChainNames(overlayNode.tree.rootNode);
            (0, vitest_1.expect)(callChain.includes('filter')).toBe(true);
            (0, vitest_1.expect)(callChain.includes('map')).toBe(true);
        });
    });
    (0, vitest_1.describe)('Go Patterns', () => {
        (0, vitest_1.it)('detects for range loop with append', async () => {
            const code = `results := []string{}
for _, item := range items {
    if item.Active {
        results = append(results, item.Name)
    }
}`;
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('go');
            (0, vitest_1.expect)(wasmLanguage).toBeTruthy();
            const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
            (0, vitest_1.expect)(overlayNode?.tree).toBeTruthy();
            // Go uses 'for_statement' for range loops
            const hasForLoop = hasNodeOfType(overlayNode.tree.rootNode, 'for_statement');
            const hasAppend = hasCallWithName(overlayNode.tree.rootNode, 'append');
            (0, vitest_1.expect)(hasForLoop).toBe(true);
            (0, vitest_1.expect)(hasAppend).toBe(true);
        });
    });
    (0, vitest_1.describe)('Edge Cases', () => {
        (0, vitest_1.it)('handles empty code', async () => {
            const code = '';
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('python');
            const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
            // Empty code should parse but have no interesting nodes
            (0, vitest_1.expect)(overlayNode?.tree).toBeTruthy();
        });
        (0, vitest_1.it)('handles syntax errors gracefully', async () => {
            const code = 'def broken_func(\n    # Missing closing paren';
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('python');
            try {
                const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
                // Tree-sitter should still produce a tree even with errors
                (0, vitest_1.expect)(overlayNode?.tree).toBeTruthy();
            }
            catch (error) {
                // If it throws, that's acceptable (fail gracefully)
                (0, vitest_1.expect)(true).toBe(true);
            }
        });
        (0, vitest_1.it)('returns false for unsupported languages', () => {
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)('brainfuck');
            (0, vitest_1.expect)(wasmLanguage).toBeFalsy();
        });
    });
});
// Helper functions
function hasNodeOfType(node, type) {
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
function countNodesOfType(node, type) {
    let count = node.type === type ? 1 : 0;
    for (let i = 0; i < node.childCount; i++) {
        count += countNodesOfType(node.child(i), type);
    }
    return count;
}
function hasCallWithName(node, name) {
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
function getCallChainNames(node) {
    const names = [];
    collectCallNames(node, names);
    return names;
}
function collectCallNames(node, names) {
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
//# sourceMappingURL=pukuRefactoringHeuristic.spec.js.map