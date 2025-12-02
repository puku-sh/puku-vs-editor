/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Import context flow (resolve and read imported files)
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { pukuImportExtractor } from '../../../pukuIndexing/node/pukuImportExtractor';

/**
 * Resolves and reads content from imported files for FIM context
 * Provides relevant code from dependencies to improve completion quality
 */
export class ImportContextFlow {
	/**
	 * Extract and read content from imported files using AST-based extraction
	 *
	 * @param document Current document
	 * @param limit Maximum number of imported files to include
	 * @param maxCharsPerFile Maximum characters to read from each file
	 * @returns Array of {filepath, content} objects
	 */
	async getImportedFilesContent(
		document: vscode.TextDocument,
		limit: number = 3,
		maxCharsPerFile: number = 500
	): Promise<Array<{ filepath: string; content: string }>> {
		// Use AST-based import extractor with caching
		const imports = await pukuImportExtractor.extractImportsWithCache(
			document.getText(),
			document.languageId,
			document.uri.toString()
		);

		if (imports.length === 0) {
			return [];
		}

		const resolvedUris = this._resolveImportPaths(imports, document.uri, document.languageId);
		const importedFiles: Array<{ filepath: string; content: string }> = [];

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
			} catch (error) {
				console.log(`[ImportContext] Failed to read import: ${uri.fsPath}`);
			}
		}

		return importedFiles;
	}

	/**
	 * Resolve import paths to actual file URIs
	 * Handles relative imports (./utils, ../helpers) and absolute imports (/src/...)
	 */
	private _resolveImportPaths(
		imports: string[],
		currentFile: vscode.Uri,
		languageId: string
	): vscode.Uri[] {
		const resolvedFiles: vscode.Uri[] = [];
		const currentDir = vscode.Uri.joinPath(currentFile, '..');

		for (const importPath of imports) {
			try {
				let uri: vscode.Uri | undefined;

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
						} catch {
							// Try next extension
						}
					}
				} else if (importPath.startsWith('/')) {
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
							} catch {
								// Try next extension
							}
						}
					}
				}

				if (uri) {
					resolvedFiles.push(uri);
				}
			} catch (error) {
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
	private _getExtensionsForLanguage(languageId: string): string[] {
		const extensionMap: Record<string, string[]> = {
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
