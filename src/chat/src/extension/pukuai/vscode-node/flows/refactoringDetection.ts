/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Refactoring detection flow (Tree-sitter AST + LLM-based range detection)
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { ILogService } from '../../../../platform/log/common/logService';
import { IFetcherService } from '../../../../platform/networking/common/fetcherService';
import { IPukuAuthService } from '../../../pukuIndexing/common/pukuAuth';
import { structureComputer } from '../../../../platform/parser/node/structure';
import { getWasmLanguage } from '../../../../platform/parser/node/treeSitterLanguages';

export interface RangeDetectionResult {
	shouldReplace: boolean;
	replaceRange?: { startLine: number; endLine: number };
	confidence: number;
	reason: string;
}

/**
 * Detects refactoring opportunities using Tree-sitter AST + LLM-based range detection
 * Two-stage approach:
 * 1. Client-side heuristic (Tree-sitter) - Fast, 0ms overhead
 * 2. LLM-based range detection (Qwen) - Only if heuristic triggers
 */
export class RefactoringDetectionFlow {
	constructor(
		private readonly _logService: ILogService,
		private readonly _fetcherService: IFetcherService,
		private readonly _pukuAuthService: IPukuAuthService
	) { }

	/**
	 * Check if code contains refactoring opportunities using Tree-sitter AST
	 * Runs client-side (0ms network overhead)
	 *
	 * @param document Current document
	 * @param position Cursor position
	 * @returns true if refactoring pattern detected (should call LLM)
	 */
	async shouldCheckForRefactoring(
		document: vscode.TextDocument,
		position: vscode.Position
	): Promise<boolean> {
		const languageId = document.languageId;

		// Get Tree-sitter language
		const wasmLanguage = getWasmLanguage(languageId);
		if (!wasmLanguage) {
			return false; // Language not supported
		}

		// Get last 10 lines before cursor
		const startLine = Math.max(0, position.line - 10);
		const range = new vscode.Range(startLine, 0, position.line, position.character);
		const code = document.getText(range);

		try {
			// Parse using Puku's existing Tree-sitter infrastructure
			const overlayNode = await structureComputer.getStructure(wasmLanguage, code);
			if (!overlayNode?.tree) {
				return false;
			}

			// Detect refactoring patterns in AST
			return this._detectRefactoringPatternsInAST(overlayNode.tree, languageId);
		} catch (error) {
			// On parse error, assume no refactoring (safe default)
			this._logService.warn('[Heuristic] AST parse failed:', error);
			return false;
		}
	}

	/**
	 * Call backend API to detect if code should be replaced
	 * Uses Qwen 2.5 Coder 32B for range detection
	 */
	async detectEditRange(
		prefix: string,
		suffix: string,
		language: string,
		contextFiles?: Array<{ filepath: string; content: string }>
	): Promise<RangeDetectionResult | null> {
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
		} catch (error) {
			this._logService.error('[RangeDetection] Error:', error);
			return null;
		}
	}

	/**
	 * Detect refactoring patterns in AST
	 */
	private _detectRefactoringPatternsInAST(tree: any, language: string): boolean {
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
	private _detectPythonPatterns(cursor: any): boolean {
		do {
			const node = cursor.currentNode;

			// Pattern 1: for loop with .append() in body
			if (node.type === 'for_statement') {
				// Check if previous sibling is empty list assignment
				const prevSibling = node.previousSibling;
				const hasEmptyArray =
					prevSibling?.type === 'assignment' &&
					prevSibling.childForFieldName?.('value')?.type === 'list' &&
					prevSibling.childForFieldName?.('value')?.namedChildCount === 0;

				// Check if loop body contains .append() call
				const body = node.childForFieldName?.('body');
				const hasAppend = this._hasDescendant(body, n =>
					n.type === 'call' &&
					this._hasChildWithText(n, 'append')
				);

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
	private _detectJavaScriptPatterns(cursor: any): boolean {
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
	private _detectGoPatterns(cursor: any): boolean {
		do {
			const node = cursor.currentNode;

			// Pattern: for _, item := range items with append in body
			if (node.type === 'for_statement') {
				const rangeClause = node.childForFieldName?.('clause');
				if (rangeClause?.type === 'range_clause') {
					const body = node.childForFieldName?.('body');
					if (this._hasDescendant(body, n =>
						n.type === 'call_expression' &&
						this._hasChildWithText(n, 'append')
					)) {
						return true;
					}
				}
			}

		} while (cursor.gotoNextSibling() || (cursor.gotoParent() && cursor.gotoNextSibling()));

		return false;
	}

	// Helper methods for AST traversal
	private _hasDescendant(node: any, predicate: (n: any) => boolean): boolean {
		if (!node) return false;
		if (predicate(node)) return true;
		for (let i = 0; i < node.childCount; i++) {
			if (this._hasDescendant(node.child(i), predicate)) return true;
		}
		return false;
	}

	private _hasAncestor(node: any, predicate: (n: any) => boolean): boolean {
		let current = node.parent;
		while (current) {
			if (predicate(current)) return true;
			current = current.parent;
		}
		return false;
	}

	private _hasChildWithText(node: any, text: string): boolean {
		for (let i = 0; i < node.childCount; i++) {
			if (node.child(i)?.text === text) return true;
		}
		return false;
	}

	private _getCallChain(node: any): string[] {
		const chain: string[] = [];
		let current = node;

		while (current?.type === 'call' || current?.type === 'call_expression') {
			const callee = current.childForFieldName?.('function') || current.firstChild;
			if (callee?.type === 'attribute' || callee?.type === 'member_expression') {
				const property = callee.lastChild;
				if (property) chain.push(property.text);
			}
			current = callee?.firstChild ?? null;
		}

		return chain.reverse();
	}
}
