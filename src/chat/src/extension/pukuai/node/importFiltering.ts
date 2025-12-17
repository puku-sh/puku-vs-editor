/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Based on GitHub Copilot Chat's import filtering (importFiltering.ts)
 *--------------------------------------------------------------------------------------------*/

import { isImportStatement } from '../common/importStatement';

/**
 * Filter import statements from FIM completion results
 * Based on Copilot's approach in vscode-copilot-chat/src/extension/inlineEdits/node/importFiltering.ts
 *
 * Why filter imports?
 * - Models often hallucinate wrong import statements
 * - Import resolution should be handled by IDE features (auto-import)
 * - Reduces token usage by avoiding import context
 */
export class ImportFilteringAspect {
	/**
	 * Check if a line contains import-related code
	 */
	static isImportLine(line: string, languageId: string): boolean {
		return isImportStatement(line, languageId);
	}

	/**
	 * Filter out import lines from completion text
	 *
	 * @param completionText - The raw completion from the model
	 * @param languageId - Language identifier
	 * @returns Filtered completion with import lines removed
	 */
	static filterCompletion(completionText: string, languageId: string): string {
		const lines = completionText.split('\n');
		const filteredLines = lines.filter(line =>
			!this.isImportLine(line.trim(), languageId)
		);

		// If all lines were imports, return empty
		if (filteredLines.length === 0) {
			return '';
		}

		return filteredLines.join('\n');
	}

	/**
	 * Check if completion contains only import statements
	 */
	static isOnlyImports(completionText: string, languageId: string): boolean {
		const lines = completionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
		if (lines.length === 0) {
			return false;
		}
		return lines.every(line => this.isImportLine(line, languageId));
	}
}
