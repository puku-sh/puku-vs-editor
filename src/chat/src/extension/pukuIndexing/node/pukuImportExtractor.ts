/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  AST-based import extractor for inline completion context
 *--------------------------------------------------------------------------------------------*/

import { SyntaxNode } from 'web-tree-sitter';
import { _parse } from '../../../platform/parser/node/parserWithCaching';
import { getWasmLanguage } from '../../../platform/parser/node/treeSitterLanguages';

/**
 * AST-based import extractor using Tree-sitter
 * More reliable than regex for complex import statements
 */
export class PukuImportExtractor {
	// Cache import extractions per file
	private _importCache = new Map<string, {
		contentHash: string;
		imports: string[];
	}>();

	/**
	 * Extract imports with caching
	 */
	async extractImportsWithCache(content: string, languageId: string, fileUri: string): Promise<string[]> {
		const contentHash = this._hashContent(content);

		const cached = this._importCache.get(fileUri);
		if (cached && cached.contentHash === contentHash) {
			return cached.imports;
		}

		// Extract and cache
		const imports = await this.extractImports(content, languageId);
		this._importCache.set(fileUri, { contentHash, imports });

		// Limit cache size (simple eviction)
		if (this._importCache.size > 100) {
			const firstKey = this._importCache.keys().next().value;
			if (firstKey) {
				this._importCache.delete(firstKey);
			}
		}

		return imports;
	}

	/**
	 * Extract import paths from file content using AST
	 */
	async extractImports(content: string, languageId: string): Promise<string[]> {
		const wasmLanguage = getWasmLanguage(languageId);
		if (!wasmLanguage) {
			return []; // Unsupported language
		}

		try {
			// Use direct tree-sitter parsing instead of structureComputer
			// structureComputer uses specific queries that may not include import nodes
			const treeRef = await _parse(wasmLanguage, content);
			const rootNode = treeRef.tree.rootNode;

			const imports: string[] = [];
			this._extractImportsFromNode(rootNode, content, imports, languageId);

			// Release the tree reference
			treeRef.dispose();

			return imports;
		} catch (error) {
			console.error('[PukuImportExtractor] Failed to extract imports:', error);
			return [];
		}
	}

	/**
	 * Recursively extract import paths from AST nodes
	 */
	private _extractImportsFromNode(
		node: SyntaxNode,
		content: string,
		imports: string[],
		languageId: string
	): void {
		// TypeScript/JavaScript/TSX: import_statement
		if (node.type === 'import_statement') {
			const importPath = this._extractStringLiteral(node, content);
			if (importPath && this._isLocalImport(importPath)) {
				imports.push(importPath);
			}
			return; // Don't recurse into children
		}

		// TypeScript/JavaScript/TSX: import_clause with source
		if (node.type === 'import_clause') {
			const importPath = this._extractStringLiteral(node, content);
			if (importPath && this._isLocalImport(importPath)) {
				imports.push(importPath);
			}
			return;
		}

		// TypeScript/JavaScript/TSX: require calls
		if (node.type === 'call_expression') {
			const text = content.substring(node.startIndex, node.endIndex);
			if (text.startsWith('require(')) {
				const importPath = this._extractStringLiteral(node, content);
				if (importPath && this._isLocalImport(importPath)) {
					imports.push(importPath);
				}
			}
			return;
		}

		// Python: import_statement, import_from_statement
		if (languageId === 'python') {
			if (node.type === 'import_from_statement' || node.type === 'import_statement') {
				const importPath = this._extractPythonImportPath(node, content);
				if (importPath && this._isLocalImport(importPath)) {
					imports.push(importPath);
				}
				return;
			}
		}

		// Go: import_declaration (contains import_spec nodes)
		if (languageId === 'go') {
			// Look for import_spec (individual import in multi-line) or interpreted_string_literal (single import)
			if (node.type === 'import_spec' || node.type === 'import_declaration') {
				const importPath = this._extractStringLiteral(node, content);
				if (importPath && this._isLocalImport(importPath)) {
					imports.push(importPath);
				}
				// Don't return - continue recursing to find more imports
			}
		}

		// Rust: use_declaration
		if (languageId === 'rust') {
			if (node.type === 'use_declaration') {
				const importPath = this._extractRustUsePath(node, content);
				if (importPath && this._isLocalImport(importPath)) {
					imports.push(importPath);
				}
				return;
			}
		}

		// Java: import_declaration
		if (languageId === 'java') {
			if (node.type === 'import_declaration') {
				const importPath = this._extractJavaImportPath(node, content);
				if (importPath && this._isLocalImport(importPath)) {
					imports.push(importPath);
				}
				return;
			}
		}

		// C++: preproc_include (only local includes with quotes)
		if (languageId === 'cpp' || languageId === 'c') {
			if (node.type === 'preproc_include') {
				const text = content.substring(node.startIndex, node.endIndex);
				// Only process local includes: #include "file.h" (not #include <system.h>)
				// Quotes indicate local includes, angle brackets indicate system includes
				const localIncludeMatch = text.match(/#include\s+"([^"]+)"/);
				if (localIncludeMatch) {
					const importPath = localIncludeMatch[1];
					// No need to check _isLocalImport - quotes already indicate local include
					imports.push(importPath);
				}
				// Don't return - continue to find more includes
			}
		}

		// C#: using_directive
		if (languageId === 'csharp') {
			if (node.type === 'using_directive') {
				const importPath = this._extractCSharpUsingPath(node, content);
				if (importPath && this._isLocalImport(importPath)) {
					imports.push(importPath);
				}
				return;
			}
		}

		// Ruby: require/require_relative calls
		if (languageId === 'ruby') {
			if (node.type === 'call') {
				const text = content.substring(node.startIndex, node.endIndex);
				if (text.startsWith('require(') || text.startsWith('require_relative(') ||
					text.startsWith('require ') || text.startsWith('require_relative ')) {
					const importPath = this._extractStringLiteral(node, content);
					if (importPath && this._isLocalImport(importPath)) {
						imports.push(importPath);
					}
				}
				return;
			}
		}

		// PHP: include_expression, require_expression, include_once_expression, require_once_expression
		if (languageId === 'php') {
			if (node.type === 'include_expression' || node.type === 'require_expression' ||
				node.type === 'include_once_expression' || node.type === 'require_once_expression') {
				const importPath = this._extractStringLiteral(node, content);
				if (importPath && this._isLocalImport(importPath)) {
					imports.push(importPath);
				}
				return;
			}
		}

		// Recurse into children
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child) {
				this._extractImportsFromNode(child, content, imports, languageId);
			}
		}
	}

	/**
	 * Extract string literal from node (for import paths)
	 */
	private _extractStringLiteral(node: SyntaxNode, content: string): string | null {
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (!child) continue;

			// Different languages use different node types for strings
			if (child.type === 'string' ||
				child.type === 'string_literal' ||
				child.type === 'string_fragment' ||
				child.type === 'interpreted_string_literal' ||  // Go
				child.type === 'raw_string_literal') {  // Go
				const text = content.substring(child.startIndex, child.endIndex);
				// Remove quotes
				return text.replace(/^['"`]|['"`]$/g, '');
			}

			// Recurse for nested structures
			const nested = this._extractStringLiteral(child, content);
			if (nested) {
				return nested;
			}
		}
		return null;
	}

	/**
	 * Extract Python import path (handles "from .module import X")
	 */
	private _extractPythonImportPath(node: SyntaxNode, content: string): string | null {
		// Look for dotted_name or relative_import nodes
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (!child) continue;

			if (child.type === 'dotted_name' || child.type === 'relative_import') {
				const text = content.substring(child.startIndex, child.endIndex);
				// Convert Python module path to file path
				// "from .models import X" -> "./models"
				// "from ..utils import X" -> "../utils"
				return text.replace(/\./g, '/').replace(/^\//, './');
			}

			// Recurse into children
			const nested = this._extractPythonImportPath(child, content);
			if (nested) {
				return nested;
			}
		}
		return null;
	}

	/**
	 * Extract Rust use path (handles "use crate::module" or "use super::module")
	 */
	private _extractRustUsePath(node: SyntaxNode, content: string): string | null {
		// Look for use_clause or scoped_identifier nodes
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (!child) continue;

			if (child.type === 'scoped_identifier' || child.type === 'identifier') {
				const text = content.substring(child.startIndex, child.endIndex);
				// Convert Rust module path to file path
				// "use crate::utils::helpers" -> "./utils/helpers"
				// "use super::models" -> "../models"
				if (text.startsWith('crate::')) {
					return './' + text.substring(7).replace(/::/g, '/');
				} else if (text.startsWith('super::')) {
					return '../' + text.substring(7).replace(/::/g, '/');
				} else if (text.startsWith('self::')) {
					return './' + text.substring(6).replace(/::/g, '/');
				}
			}

			// Recurse into children
			const nested = this._extractRustUsePath(child, content);
			if (nested) {
				return nested;
			}
		}
		return null;
	}

	/**
	 * Extract Java import path (handles "import com.example.Class")
	 */
	private _extractJavaImportPath(node: SyntaxNode, content: string): string | null {
		// Look for scoped_identifier nodes
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (!child) continue;

			if (child.type === 'scoped_identifier') {
				const text = content.substring(child.startIndex, child.endIndex);
				// Convert Java package path to file path
				// "import com.example.utils.Helper" -> "com/example/utils/Helper"
				// Only local if it matches project structure (heuristic: doesn't start with common packages)
				const parts = text.split('.');
				if (parts.length > 0 && !this._isCommonJavaPackage(parts[0])) {
					return text.replace(/\./g, '/');
				}
			}

			// Recurse into children
			const nested = this._extractJavaImportPath(child, content);
			if (nested) {
				return nested;
			}
		}
		return null;
	}

	/**
	 * Extract C# using path (handles "using Namespace.SubNamespace")
	 */
	private _extractCSharpUsingPath(node: SyntaxNode, content: string): string | null {
		// Look for qualified_name or identifier nodes
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (!child) continue;

			if (child.type === 'qualified_name' || child.type === 'identifier') {
				const text = content.substring(child.startIndex, child.endIndex);
				// Convert C# namespace to file path
				// "using MyProject.Utils" -> "MyProject/Utils"
				// Only local if it matches project structure (heuristic: doesn't start with System)
				if (!text.startsWith('System') && !text.startsWith('Microsoft')) {
					return text.replace(/\./g, '/');
				}
			}

			// Recurse into children
			const nested = this._extractCSharpUsingPath(child, content);
			if (nested) {
				return nested;
			}
		}
		return null;
	}

	/**
	 * Check if a package name is a common external Java package
	 */
	private _isCommonJavaPackage(packageName: string): boolean {
		const commonPackages = [
			'java', 'javax', 'org', 'com', 'android',
			'androidx', 'kotlin', 'scala', 'groovy'
		];
		return commonPackages.includes(packageName);
	}

	/**
	 * Check if import is local (not external package)
	 */
	private _isLocalImport(importPath: string): boolean {
		// Local imports start with . or /
		if (importPath.startsWith('.') || importPath.startsWith('/')) {
			return true;
		}

		// Exclude common external packages
		const externalPrefixes = [
			'node_modules', '@', 'react', 'vue', 'angular',
			'lodash', 'axios', 'express', 'next', 'vscode',
		];

		for (const prefix of externalPrefixes) {
			if (importPath.startsWith(prefix)) {
				return false;
			}
		}

		// If it doesn't start with . or /, likely external
		return false;
	}

	/**
	 * Simple hash for content comparison
	 */
	private _hashContent(content: string): string {
		// Simple hash - first 100 + last 100 chars
		if (content.length < 200) {
			return content;
		}
		return content.substring(0, 100) + content.substring(content.length - 100);
	}

	/**
	 * Clear cache (for testing or when needed)
	 */
	clearCache(): void {
		this._importCache.clear();
	}
}

/**
 * Singleton instance
 */
export const pukuImportExtractor = new PukuImportExtractor();
