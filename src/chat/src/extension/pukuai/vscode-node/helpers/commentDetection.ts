/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tree-sitter-based comment detection helper
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { getWasmLanguage } from '../../../../platform/parser/node/treeSitterLanguages';
import { _parse } from '../../../../platform/parser/node/parserWithCaching';

/**
 * Check if cursor position is inside a comment using Tree-sitter AST
 * More accurate than regex-based detection
 *
 * @param document The text document
 * @param position The cursor position
 * @returns true if cursor is inside a comment node
 */
export async function isInsideComment(
	document: vscode.TextDocument,
	position: vscode.Position
): Promise<boolean> {
	const languageId = document.languageId;
	const wasmLanguage = getWasmLanguage(languageId);

	// Language not supported by Tree-sitter
	if (!wasmLanguage) {
		return false;
	}

	try {
		// Parse the document with Tree-sitter
		const treeRef = await _parse(wasmLanguage, document.getText());

		// Convert VS Code position to Tree-sitter point (0-indexed)
		const point = {
			row: position.line,
			column: position.character
		};

		// Get the smallest node at cursor position
		const node = treeRef.tree.rootNode.descendantForPosition(point);

		// Check if node or any ancestor is a comment
		let currentNode = node;
		while (currentNode) {
			const nodeType = currentNode.type;

			// Common comment node types across languages
			if (nodeType === 'comment' ||
			    nodeType === 'line_comment' ||
			    nodeType === 'block_comment' ||
			    nodeType === 'doc_comment') {
				return true;
			}

			currentNode = currentNode.parent;
		}

		return false;
	} catch (error) {
		// On parse error, fall back to safe default (not in comment)
		console.error('[CommentDetection] Tree-sitter parse failed:', error);
		return false;
	}
}
