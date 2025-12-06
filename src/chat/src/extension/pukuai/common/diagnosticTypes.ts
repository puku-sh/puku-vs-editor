/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Shared types for diagnostics-based code fixes
 *--------------------------------------------------------------------------------------------*/

/**
 * A code fix generated from a diagnostic
 */
export interface DiagnosticFix {
	/** Range where the fix should be applied */
	range: {
		start: { line: number; character: number };
		end: { line: number; character: number };
	};
	/** The text to insert/replace */
	newText: string;
	/** Label shown to user (e.g., "TAB to add import") */
	label: string;
	/** Confidence score from LLM (0-1) */
	confidence: number;
}

/**
 * Request to worker for diagnostic fix generation
 */
export interface DiagnosticFixRequest {
	/** The diagnostic to fix */
	diagnostic: {
		source: string;      // e.g., "typescript", "eslint"
		code: string;        // e.g., "2304", "no-unused-vars"
		message: string;     // e.g., "Cannot find name 'useState'"
		range: {
			start: { line: number; character: number };
			end: { line: number; character: number };
		};
	};
	/** Relevant code examples from codebase (from semantic search) */
	codebaseExamples: Array<{
		code: string;
		file: string;
		similarity: number;
	}>;
	/** Full content of the current file */
	fileContent: string;
	/** Existing imports in the file */
	currentImports: string[];
	/** Programming language */
	language: string;
}

/**
 * Response from worker for diagnostic fix
 */
export interface DiagnosticFixResponse {
	/** The generated fix, or null if no fix could be generated */
	fix: DiagnosticFix | null;
}
