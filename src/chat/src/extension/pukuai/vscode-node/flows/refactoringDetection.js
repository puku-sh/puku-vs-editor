"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefactoringDetectionFlow = void 0;
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Refactoring detection flow (Tree-sitter AST + LLM-based range detection)
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const structure_1 = require("../../../../platform/parser/node/structure");
const treeSitterLanguages_1 = require("../../../../platform/parser/node/treeSitterLanguages");
/**
 * Detects refactoring opportunities using Tree-sitter AST + LLM-based range detection
 * Two-stage approach:
 * 1. Client-side heuristic (Tree-sitter) - Fast, 0ms overhead
 * 2. LLM-based range detection (Qwen) - Only if heuristic triggers
 */
class RefactoringDetectionFlow {
    constructor(_logService, _fetcherService, _pukuAuthService) {
        this._logService = _logService;
        this._fetcherService = _fetcherService;
        this._pukuAuthService = _pukuAuthService;
    }
    /**
     * Check if code contains refactoring opportunities using Tree-sitter AST
     * Runs client-side (0ms network overhead)
     *
     * @param document Current document
     * @param position Cursor position
     * @returns true if refactoring pattern detected (should call LLM)
     */
    async shouldCheckForRefactoring(document, position) {
        const languageId = document.languageId;
        // Get Tree-sitter language
        const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)(languageId);
        if (!wasmLanguage) {
            return false; // Language not supported
        }
        // Get last 10 lines before cursor
        const startLine = Math.max(0, position.line - 10);
        const range = new vscode.Range(startLine, 0, position.line, position.character);
        const code = document.getText(range);
        try {
            // Parse using Puku's existing Tree-sitter infrastructure
            const overlayNode = await structure_1.structureComputer.getStructure(wasmLanguage, code);
            if (!overlayNode?.tree) {
                return false;
            }
            // Detect refactoring patterns in AST
            return this._detectRefactoringPatternsInAST(overlayNode.tree, languageId);
        }
        catch (error) {
            // On parse error, assume no refactoring (safe default)
            this._logService.warn('[Heuristic] AST parse failed:', error);
            return false;
        }
    }
    /**
     * Call backend API to detect if code should be replaced
     * Uses Qwen 2.5 Coder 32B for range detection
     */
    async detectEditRange(prefix, suffix, language, contextFiles) {
        try {
            const response = await this._fetcherService.fetch('https://api.puku.sh/v1/detect-edit-range', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._pukuAuthService.getAuthToken()}`
                },
                body: JSON.stringify({ prefix, suffix, language, contextFiles })
            });
            if (!response.ok) {
                this._logService.warn('[RangeDetection] API error:', response.status);
                return null;
            }
            return await response.json();
        }
        catch (error) {
            this._logService.error('[RangeDetection] Error:', error);
            return null;
        }
    }
    /**
     * Detect refactoring patterns in AST
     */
    _detectRefactoringPatternsInAST(tree, language) {
        const cursor = tree.walk();
        switch (language) {
            case 'python':
                return this._detectPythonPatterns(cursor);
            case 'javascript':
            case 'typescript':
                return this._detectJavaScriptPatterns(cursor);
            case 'go':
                return this._detectGoPatterns(cursor);
            default:
                return false;
        }
    }
    /**
     * Detect Python refactoring patterns:
     * - Empty array + for loop with .append() → list comprehension
     * - .filter().first() → .filter_by().one_or_none()
     */
    _detectPythonPatterns(cursor) {
        do {
            const node = cursor.currentNode;
            // Pattern 1: for loop with .append() in body
            if (node.type === 'for_statement') {
                // Check if previous sibling is empty list assignment
                const prevSibling = node.previousSibling;
                const hasEmptyArray = prevSibling?.type === 'assignment' &&
                    prevSibling.childForFieldName?.('value')?.type === 'list' &&
                    prevSibling.childForFieldName?.('value')?.namedChildCount === 0;
                // Check if loop body contains .append() call
                const body = node.childForFieldName?.('body');
                const hasAppend = this._hasDescendant(body, n => n.type === 'call' &&
                    this._hasChildWithText(n, 'append'));
                // Check not nested loop
                const notNested = !this._hasAncestor(node, n => n.type === 'for_statement');
                if (hasEmptyArray && hasAppend && notNested) {
                    return true;
                }
            }
            // Pattern 2: .filter().first() chain (SQLAlchemy anti-pattern)
            if (node.type === 'call') {
                const callChain = this._getCallChain(node);
                if (callChain.includes('filter') && callChain.includes('first')) {
                    return true;
                }
            }
        } while (cursor.gotoNextSibling() || (cursor.gotoParent() && cursor.gotoNextSibling()));
        return false;
    }
    /**
     * Detect JavaScript/TypeScript refactoring patterns:
     * - Empty array + for loop with .push() → .filter() or .map()
     * - .filter().map() → single .map() with conditional
     */
    _detectJavaScriptPatterns(cursor) {
        do {
            const node = cursor.currentNode;
            // Pattern 1: .filter().map() chain
            if (node.type === 'call_expression') {
                const callChain = this._getCallChain(node);
                if (callChain.includes('filter') && callChain.includes('map')) {
                    // Ensure no other methods in between
                    const filterIdx = callChain.indexOf('filter');
                    const mapIdx = callChain.indexOf('map');
                    if (mapIdx === filterIdx + 1) {
                        return true;
                    }
                }
            }
            // Pattern 2: let arr = []; followed by for loop
            if (node.type === 'variable_declarator') {
                const init = node.childForFieldName?.('value');
                if (init?.type === 'array' && init.namedChildCount === 0) {
                    const parent = node.parent?.parent; // variable_declaration
                    const nextStatement = parent?.nextSibling;
                    if (nextStatement?.type === 'for_statement' ||
                        nextStatement?.type === 'for_in_statement') {
                        // Check loop body has .push()
                        const body = nextStatement.childForFieldName?.('body');
                        if (this._hasDescendant(body, n => this._hasChildWithText(n, 'push'))) {
                            return true;
                        }
                    }
                }
            }
        } while (cursor.gotoNextSibling() || (cursor.gotoParent() && cursor.gotoNextSibling()));
        return false;
    }
    /**
     * Detect Go refactoring patterns:
     * - for range with append → more idiomatic patterns
     */
    _detectGoPatterns(cursor) {
        do {
            const node = cursor.currentNode;
            // Pattern: for _, item := range items with append in body
            if (node.type === 'for_statement') {
                const rangeClause = node.childForFieldName?.('clause');
                if (rangeClause?.type === 'range_clause') {
                    const body = node.childForFieldName?.('body');
                    if (this._hasDescendant(body, n => n.type === 'call_expression' &&
                        this._hasChildWithText(n, 'append'))) {
                        return true;
                    }
                }
            }
        } while (cursor.gotoNextSibling() || (cursor.gotoParent() && cursor.gotoNextSibling()));
        return false;
    }
    // Helper methods for AST traversal
    _hasDescendant(node, predicate) {
        if (!node)
            return false;
        if (predicate(node))
            return true;
        for (let i = 0; i < node.childCount; i++) {
            if (this._hasDescendant(node.child(i), predicate))
                return true;
        }
        return false;
    }
    _hasAncestor(node, predicate) {
        let current = node.parent;
        while (current) {
            if (predicate(current))
                return true;
            current = current.parent;
        }
        return false;
    }
    _hasChildWithText(node, text) {
        for (let i = 0; i < node.childCount; i++) {
            if (node.child(i)?.text === text)
                return true;
        }
        return false;
    }
    _getCallChain(node) {
        const chain = [];
        let current = node;
        while (current?.type === 'call' || current?.type === 'call_expression') {
            const callee = current.childForFieldName?.('function') || current.firstChild;
            if (callee?.type === 'attribute' || callee?.type === 'member_expression') {
                const property = callee.lastChild;
                if (property)
                    chain.push(property.text);
            }
            current = callee?.firstChild ?? null;
        }
        return chain.reverse();
    }
}
exports.RefactoringDetectionFlow = RefactoringDetectionFlow;
//# sourceMappingURL=refactoringDetection.js.map