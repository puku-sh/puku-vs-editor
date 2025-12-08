/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tree-sitter-based comment detection helper
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { getWasmLanguage } from '../../../../platform/parser/node/treeSitterLanguages';
import { _parse } from '../../../../platform/parser/node/parserWithCaching';

/**
 * Result from getCommentAtPosition
 */
export interface CommentInfo {
	/** The comment node from Tree-sitter AST */
	node: any;
	/** The raw comment text (including markers like // or block comments) */
	text: string;
	/** The comment text with markers stripped */
	cleanText: string;
	/** The type of comment (line_comment, block_comment, etc.) */
	type: string;
}

/**
 * Get comment node and text at cursor position using Tree-sitter AST
 * More accurate than regex-based detection
 *
 * @param document The text document
 * @param position The cursor position
 * @returns CommentInfo if cursor is at/near a comment, null otherwise
 */
export async function getCommentAtPosition(
	document: vscode.TextDocument,
	position: vscode.Position
): Promise<CommentInfo | null> {
	const languageId = document.languageId;
	const wasmLanguage = getWasmLanguage(languageId);

	// Language not supported by Tree-sitter
	if (!wasmLanguage) {
		return null;
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

				// Extract comment text from the document
				const startPos = new vscode.Position(currentNode.startPosition.row, currentNode.startPosition.column);
				const endPos = new vscode.Position(currentNode.endPosition.row, currentNode.endPosition.column);
				const range = new vscode.Range(startPos, endPos);
				const text = document.getText(range);

				// Strip comment markers
				const cleanText = stripCommentMarkers(text, languageId);

				return {
					node: currentNode,
					text,
					cleanText,
					type: nodeType
				};
			}

			currentNode = currentNode.parent;
		}

		// Also check previous line for "on empty line after comment" case
		if (position.line > 0) {
			const prevLinePos = new vscode.Position(position.line - 1, 0);
			const prevPoint = {
				row: prevLinePos.line,
				column: prevLinePos.character
			};

			const prevNode = treeRef.tree.rootNode.descendantForPosition(prevPoint);
			let prevCurrentNode = prevNode;

			while (prevCurrentNode) {
				const nodeType = prevCurrentNode.type;

				if (nodeType === 'comment' ||
				    nodeType === 'line_comment' ||
				    nodeType === 'block_comment' ||
				    nodeType === 'doc_comment') {

					const startPos = new vscode.Position(prevCurrentNode.startPosition.row, prevCurrentNode.startPosition.column);
					const endPos = new vscode.Position(prevCurrentNode.endPosition.row, prevCurrentNode.endPosition.column);
					const range = new vscode.Range(startPos, endPos);
					const text = document.getText(range);
					const cleanText = stripCommentMarkers(text, languageId);

					return {
						node: prevCurrentNode,
						text,
						cleanText,
						type: nodeType
					};
				}

				prevCurrentNode = prevCurrentNode.parent;
			}
		}

		return null;
	} catch (error) {
		// On parse error, fall back to null
		console.error('[CommentDetection] Tree-sitter parse failed:', error);
		return null;
	}
}

/**
 * Strip comment markers from text (line and block comments)
 */
function stripCommentMarkers(text: string, languageId: string): string {
	let cleaned = text.trim();

	// Remove common comment markers
	cleaned = cleaned.replace(/^\/\/\s*/, ''); // //
	cleaned = cleaned.replace(/^\/\*\s*/, '').replace(/\s*\*\/$/, ''); // /* */
	cleaned = cleaned.replace(/^#\s*/, ''); // #
	cleaned = cleaned.replace(/^\*\s*/, ''); // * (multi-line comment continuation)

	return cleaned.trim();
}

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
	const commentInfo = await getCommentAtPosition(document, position);
	return commentInfo !== null;
}
