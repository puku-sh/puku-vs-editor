/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Puku. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';

/**
 * Service for parsing and checking .gitignore patterns
 * Used by PukuIndexingService to respect .gitignore rules during indexing
 */
export class PukuGitignoreService {
	private _ignoreFilter?: ReturnType<typeof ignore>;
	private _workspaceRoot?: string;

	/**
	 * Initialize the service with a workspace root
	 * Reads .gitignore file if it exists and parses patterns
	 */
	async initialize(workspaceRoot: string): Promise<void> {
		this._workspaceRoot = workspaceRoot;

		const gitignorePath = path.join(workspaceRoot, '.gitignore');

		try {
			// Check if .gitignore exists
			const exists = await fs.promises.access(gitignorePath)
				.then(() => true)
				.catch(() => false);

			if (exists) {
				const content = await fs.promises.readFile(gitignorePath, 'utf-8');
				this._ignoreFilter = ignore().add(content);
				console.log(`[PukuGitignore] Loaded .gitignore from ${gitignorePath}`);
			} else {
				console.log(`[PukuGitignore] No .gitignore found at ${gitignorePath}`);
			}
		} catch (error) {
			console.error(`[PukuGitignore] Error loading .gitignore:`, error);
		}
	}

	/**
	 * Check if a file path should be ignored according to .gitignore rules
	 * @param filePath - Absolute or relative file path
	 * @returns true if the file should be ignored, false otherwise
	 */
	isIgnored(filePath: string): boolean {
		if (!this._ignoreFilter || !this._workspaceRoot) {
			return false;
		}

		// Convert absolute path to relative path from workspace root
		let relativePath = filePath;
		if (path.isAbsolute(filePath)) {
			relativePath = path.relative(this._workspaceRoot, filePath);
		}

		// Normalize path separators for cross-platform compatibility
		// .gitignore uses forward slashes, even on Windows
		relativePath = relativePath.replace(/\\/g, '/');

		return this._ignoreFilter.ignores(relativePath);
	}

	/**
	 * Check if the service is initialized and has loaded .gitignore
	 */
	hasGitignore(): boolean {
		return this._ignoreFilter !== undefined;
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this._ignoreFilter = undefined;
		this._workspaceRoot = undefined;
	}
}
