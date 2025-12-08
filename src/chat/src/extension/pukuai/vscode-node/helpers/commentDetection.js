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
exports.getCommentAtPosition = getCommentAtPosition;
exports.isInsideComment = isInsideComment;
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tree-sitter-based comment detection helper
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const treeSitterLanguages_1 = require("../../../../platform/parser/node/treeSitterLanguages");
const parserWithCaching_1 = require("../../../../platform/parser/node/parserWithCaching");
/**
 * Get comment node and text at cursor position using Tree-sitter AST
 * More accurate than regex-based detection
 *
 * @param document The text document
 * @param position The cursor position
 * @returns CommentInfo if cursor is at/near a comment, null otherwise
 */
async function getCommentAtPosition(document, position) {
    const languageId = document.languageId;
    const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)(languageId);
    // Language not supported by Tree-sitter
    if (!wasmLanguage) {
        return null;
    }
    try {
        // Parse the document with Tree-sitter
        const treeRef = await (0, parserWithCaching_1._parse)(wasmLanguage, document.getText());
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
    }
    catch (error) {
        // On parse error, fall back to null
        console.error('[CommentDetection] Tree-sitter parse failed:', error);
        return null;
    }
}
/**
 * Strip comment markers from text (line and block comments)
 */
function stripCommentMarkers(text, languageId) {
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
async function isInsideComment(document, position) {
    const commentInfo = await getCommentAtPosition(document, position);
    return commentInfo !== null;
}
//# sourceMappingURL=commentDetection.js.map