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
exports.ImportContextFlow = void 0;
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Import context flow (resolve and read imported files)
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const pukuImportExtractor_1 = require("../../../pukuIndexing/node/pukuImportExtractor");
/**
 * Resolves and reads content from imported files for FIM context
 * Provides relevant code from dependencies to improve completion quality
 */
class ImportContextFlow {
    /**
     * Extract and read content from imported files using AST-based extraction
     *
     * @param document Current document
     * @param limit Maximum number of imported files to include
     * @param maxCharsPerFile Maximum characters to read from each file
     * @returns Array of {filepath, content} objects
     */
    async getImportedFilesContent(document, limit = 3, maxCharsPerFile = 500) {
        // Use AST-based import extractor with caching
        const imports = await pukuImportExtractor_1.pukuImportExtractor.extractImportsWithCache(document.getText(), document.languageId, document.uri.toString());
        if (imports.length === 0) {
            return [];
        }
        const resolvedUris = this._resolveImportPaths(imports, document.uri, document.languageId);
        const importedFiles = [];
        // Take top N imports
        for (const uri of resolvedUris.slice(0, limit)) {
            try {
                const importedDoc = await vscode.workspace.openTextDocument(uri);
                const content = importedDoc.getText();
                // Take first N chars (truncate to avoid huge context)
                const truncated = content.substring(0, maxCharsPerFile);
                importedFiles.push({
                    filepath: uri.fsPath,
                    content: truncated,
                });
            }
            catch (error) {
                console.log(`[ImportContext] Failed to read import: ${uri.fsPath}`);
            }
        }
        return importedFiles;
    }
    /**
     * Resolve import paths to actual file URIs
     * Handles relative imports (./utils, ../helpers) and absolute imports (/src/...)
     */
    _resolveImportPaths(imports, currentFile, languageId) {
        const resolvedFiles = [];
        const currentDir = vscode.Uri.joinPath(currentFile, '..');
        for (const importPath of imports) {
            try {
                let uri;
                if (importPath.startsWith('.')) {
                    // Relative import: ./utils or ../helpers
                    const extensions = this._getExtensionsForLanguage(languageId);
                    for (const ext of extensions) {
                        const candidatePath = importPath + ext;
                        const candidateUri = vscode.Uri.joinPath(currentDir, candidatePath);
                        // Check if file exists
                        try {
                            vscode.workspace.fs.stat(candidateUri);
                            uri = candidateUri;
                            break;
                        }
                        catch {
                            // Try next extension
                        }
                    }
                }
                else if (importPath.startsWith('/')) {
                    // Absolute import from workspace root
                    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
                    if (workspaceRoot) {
                        const extensions = this._getExtensionsForLanguage(languageId);
                        for (const ext of extensions) {
                            const candidatePath = importPath + ext;
                            const candidateUri = vscode.Uri.joinPath(workspaceRoot, candidatePath);
                            try {
                                vscode.workspace.fs.stat(candidateUri);
                                uri = candidateUri;
                                break;
                            }
                            catch {
                                // Try next extension
                            }
                        }
                    }
                }
                if (uri) {
                    resolvedFiles.push(uri);
                }
            }
            catch (error) {
                // Skip failed imports
                console.log(`[ImportContext] Failed to resolve import: ${importPath}`);
            }
        }
        return resolvedFiles;
    }
    /**
     * Get possible file extensions for a language
     * Used when resolving imports without explicit extensions
     */
    _getExtensionsForLanguage(languageId) {
        const extensionMap = {
            'typescript': ['.ts', '.tsx', '.js', '.jsx'],
            'javascript': ['.js', '.jsx', '.ts', '.tsx'],
            'typescriptreact': ['.tsx', '.ts', '.jsx', '.js'],
            'javascriptreact': ['.jsx', '.js', '.tsx', '.ts'],
            'python': ['.py'],
            'go': ['.go'],
            'java': ['.java'],
            'rust': ['.rs'],
            'cpp': ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
            'c': ['.c', '.h'],
            'csharp': ['.cs'],
            'ruby': ['.rb'],
            'php': ['.php'],
        };
        return extensionMap[languageId] || [''];
    }
}
exports.ImportContextFlow = ImportContextFlow;
//# sourceMappingURL=importContext.js.map