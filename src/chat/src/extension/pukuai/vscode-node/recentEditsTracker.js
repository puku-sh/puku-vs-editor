"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - Recent Edits Tracker
 *  Tracks recent code edits to prevent LLM from suggesting duplicate code
 *  Inspired by Cursor's tab completion approach
 *--------------------------------------------------------------------------------------------*/
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
exports.RecentEditsTracker = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Tracks recent code edits across the workspace
 * Used to provide context to FIM completions to prevent duplication
 */
class RecentEditsTracker {
    constructor() {
        this.edits = [];
        this.maxEdits = 20; // Keep last 20 edits across all files
        this.maxEditLength = 200; // Max characters per edit (before/after) - optimized for token budget
        this.minEditLength = 10; // Ignore very small edits (like single character changes)
        // Track document snapshots to capture "before" content
        this.documentSnapshots = new Map();
        this.disposables = [];
        // Listen to document changes
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(this.onDocumentChange.bind(this)));
        // Clean up snapshots when documents close
        this.disposables.push(vscode.workspace.onDidCloseTextDocument(doc => {
            this.documentSnapshots.delete(doc.uri.toString());
        }));
        console.log('[RecentEditsTracker] Initialized');
    }
    /**
     * Handle document change events
     */
    onDocumentChange(event) {
        const document = event.document;
        const uri = document.uri.toString();
        // Ignore non-file schemes (like output, debug consoles, etc.)
        if (document.uri.scheme !== 'file') {
            return;
        }
        // Ignore if no changes
        if (event.contentChanges.length === 0) {
            return;
        }
        // Get or create snapshot for "before" content
        let snapshot = this.documentSnapshots.get(uri);
        if (!snapshot) {
            // First time seeing this document, just save current state
            snapshot = {
                content: document.getText(),
                version: document.version
            };
            this.documentSnapshots.set(uri, snapshot);
            return;
        }
        // Process each change
        for (const change of event.contentChanges) {
            // Calculate line range
            const lineStart = change.range.start.line;
            const lineEnd = change.range.end.line;
            // Extract relevant portions of before/after content
            const lines = snapshot.content.split('\n');
            const contextBefore = 2; // Lines before edit
            const contextAfter = 2; // Lines after edit
            const startLine = Math.max(0, lineStart - contextBefore);
            const endLine = Math.min(lines.length - 1, lineEnd + contextAfter);
            const contentBefore = lines.slice(startLine, endLine + 1).join('\n');
            // Get "after" content from current document
            const newLines = document.getText().split('\n');
            const newEndLine = Math.min(newLines.length - 1, lineStart + (endLine - lineStart) + contextAfter);
            const contentAfter = newLines.slice(startLine, newEndLine + 1).join('\n');
            // Ignore very small edits (like single character typing)
            if (contentBefore.length < this.minEditLength && contentAfter.length < this.minEditLength) {
                continue;
            }
            // Truncate if too long
            const truncatedBefore = contentBefore.length > this.maxEditLength
                ? contentBefore.substring(0, this.maxEditLength) + '...'
                : contentBefore;
            const truncatedAfter = contentAfter.length > this.maxEditLength
                ? contentAfter.substring(0, this.maxEditLength) + '...'
                : contentAfter;
            // Get relative path
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            const relativePath = workspaceFolder
                ? vscode.workspace.asRelativePath(document.uri, false)
                : document.uri.fsPath;
            // Create edit record
            const edit = {
                filepath: relativePath,
                contentBefore: truncatedBefore,
                contentAfter: truncatedAfter,
                timestamp: Date.now(),
                lineStart,
                lineEnd,
                documentVersion: document.version
            };
            // Add to beginning of array (most recent first)
            this.edits.unshift(edit);
            // Limit total number of edits
            if (this.edits.length > this.maxEdits) {
                this.edits.pop();
            }
            console.log(`[RecentEditsTracker] Tracked edit in ${relativePath} at lines ${lineStart}-${lineEnd}`);
        }
        // Update snapshot to current state
        this.documentSnapshots.set(uri, {
            content: document.getText(),
            version: document.version
        });
    }
    /**
     * Get recent edits for a specific file
     * @param filepath File path to filter by
     * @param limit Maximum number of edits to return
     * @returns Array of recent edits for the file
     */
    getRecentEdits(filepath, limit = 3) {
        return this.edits
            .filter(edit => edit.filepath === filepath)
            .slice(0, limit);
    }
    /**
     * Get all recent edits across all files
     * @param limit Maximum number of edits to return
     * @returns Array of recent edits
     */
    getAllRecentEdits(limit = 5) {
        return this.edits.slice(0, limit);
    }
    /**
     * Clear all tracked edits
     */
    clear() {
        this.edits = [];
        this.documentSnapshots.clear();
        console.log('[RecentEditsTracker] Cleared all edits');
    }
    /**
     * Get statistics about tracked edits
     */
    getStats() {
        const uniqueFiles = new Set(this.edits.map(e => e.filepath));
        const oldestEdit = this.edits.length > 0
            ? this.edits[this.edits.length - 1].timestamp
            : null;
        return {
            totalEdits: this.edits.length,
            filesTracked: uniqueFiles.size,
            oldestEdit
        };
    }
    /**
     * Dispose and clean up resources
     */
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.documentSnapshots.clear();
        this.edits = [];
        console.log('[RecentEditsTracker] Disposed');
    }
}
exports.RecentEditsTracker = RecentEditsTracker;
//# sourceMappingURL=recentEditsTracker.js.map