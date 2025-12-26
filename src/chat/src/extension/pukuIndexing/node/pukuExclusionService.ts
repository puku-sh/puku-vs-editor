/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Puku. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { PukuGitignoreService } from './pukuGitignoreService';
import { IPukuConfigService } from '../common/pukuConfig';

/**
 * Reason why a file was excluded from indexing
 */
export enum ExclusionReason {
	NotExcluded = 'not_excluded',
	ForceIncluded = 'force_included',
	Gitignore = 'gitignore',
	UserPattern = 'user_pattern',
	VSCodeSettings = 'vscode_settings',
	FileSize = 'file_size',
	BinaryFile = 'binary_file',
	GeneratedFile = 'generated_file',
	MinifiedFile = 'minified_file',
	ProjectType = 'project_type',
	StaticPattern = 'static_pattern',
}

/**
 * Result of exclusion check with detailed reason
 */
export interface ExclusionResult {
	excluded: boolean;
	reason: ExclusionReason;
	matchedPattern?: string;
}

/**
 * Statistics about current exclusion configuration
 */
export interface ExclusionStats {
	hasGitignore: boolean;
	forceIncludeCount: number;
	userExcludeCount: number;
	vscodeExcludeCount: number;
	staticPatternCount: number;
}

/**
 * Project type detection result
 */
interface ProjectTypeConfig {
	types: string[];
	patterns: string[];
}

/**
 * Unified service for determining if files should be excluded from indexing
 *
 * Priority order (highest to lowest):
 * 1. Force Include Patterns (puku.indexing.include) - User override
 * 2. .gitignore Rules - Project source of truth
 * 3. User Exclude Patterns (puku.indexing.exclude) - Custom exclusions
 * 4. VS Code Files.Exclude - Editor settings
 * 5. Static Fallback Patterns - Default exclusions
 *
 * This architecture enables:
 * - User customization via settings
 * - Respecting project conventions (.gitignore)
 * - Force-include overrides for special cases
 * - Clear priority hierarchy
 * - Detailed logging and debugging
 */
export class PukuExclusionService {
	private _gitignoreService?: PukuGitignoreService;
	private _workspaceRoot?: string;
	private _configChangeDisposable?: vscode.Disposable;

	// Cached patterns from user settings
	private _forceIncludePatterns: string[] = [];
	private _excludePatterns: string[] = [];

	// Project type auto-detected patterns
	private _projectTypePatterns: string[] = [];
	private _detectedProjectTypes: string[] = [];

	// Static fallback patterns (lowest priority)
	private readonly _staticFallbackPatterns = [
		'node_modules',
		'.git',
		'dist',
		'build',
		'.next',
		'.puku',
		'out',
		'.vscode-test',
	];

	constructor(
		private readonly _config: IPukuConfigService,
	) { }

	/**
	 * Initialize the service with workspace root
	 */
	async initialize(workspaceRoot: string): Promise<void> {
		this._workspaceRoot = workspaceRoot;

		// Initialize gitignore service
		this._gitignoreService = new PukuGitignoreService();
		await this._gitignoreService.initialize(workspaceRoot);

		// Load user settings
		this._loadUserSettings();

		// Detect project type and apply auto-exclusions
		await this._detectAndApplyProjectType();

		// Watch for settings changes
		this._configChangeDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('puku.indexing')) {
				this._loadUserSettings();
				// Re-detect project type if settings changed
				this._detectAndApplyProjectType();
			}
		});

		// Log initialization
		const stats = this.getStats();
		console.log('[PukuExclusion] Initialized:', stats);
	}

	/**
	 * Check if a file should be excluded from indexing
	 * @param uri - File URI or path (absolute or relative)
	 * @returns true if file should be excluded
	 */
	async shouldExclude(uri: vscode.Uri | string): Promise<boolean> {
		const result = await this.shouldExcludeWithReason(uri);
		return result.excluded;
	}

	/**
	 * Check if a file should be excluded with detailed reason
	 * Useful for debugging and logging
	 *
	 * @param uri - File URI or path (absolute or relative)
	 * @returns Exclusion result with reason and matched pattern
	 */
	async shouldExcludeWithReason(uri: vscode.Uri | string): Promise<ExclusionResult> {
		const filePath = typeof uri === 'string' ? uri : uri.fsPath;
		const relativePath = this._getRelativePath(filePath);

		// 1. Check force include (HIGHEST PRIORITY - overrides everything)
		const forceIncluded = this._checkForceInclude(relativePath);
		if (forceIncluded.matched) {
			return {
				excluded: false,
				reason: ExclusionReason.ForceIncluded,
				matchedPattern: forceIncluded.pattern,
			};
		}

		// Check if gitignore should be respected
		const respectGitignore = vscode.workspace.getConfiguration('puku.indexing').get<boolean>('respectGitignore', true);

		// 2. Check .gitignore (project source of truth)
		if (respectGitignore && this._gitignoreService?.isIgnored(relativePath)) {
			return {
				excluded: true,
				reason: ExclusionReason.Gitignore,
			};
		}

		// 3. Check user exclude patterns
		const userExcluded = this._checkUserExclude(relativePath);
		if (userExcluded.matched) {
			return {
				excluded: true,
				reason: ExclusionReason.UserPattern,
				matchedPattern: userExcluded.pattern,
			};
		}

		// Check if VS Code settings should be respected
		const respectVSCodeExclude = vscode.workspace.getConfiguration('puku.indexing').get<boolean>('respectVSCodeExclude', true);

		// 4. Check VS Code files.exclude
		if (respectVSCodeExclude) {
			const vscodeExcluded = this._checkVSCodeExclude(relativePath);
			if (vscodeExcluded.matched) {
				return {
					excluded: true,
					reason: ExclusionReason.VSCodeSettings,
					matchedPattern: vscodeExcluded.pattern,
				};
			}
		}

		// 5. Check binary files (images, PDFs, executables, etc.)
		// Convert string to URI if needed
		const uriObj = typeof uri === 'string' ? vscode.Uri.file(uri) : uri;
		const binaryCheck = await this._checkBinaryFile(uriObj);
		if (binaryCheck.excluded) {
			return binaryCheck;
		}

		// 6. Check generated files (protobuf, prisma, etc.)
		const generatedCheck = await this._checkGeneratedFile(uriObj);
		if (generatedCheck.excluded) {
			return generatedCheck;
		}

		// 7. Check minified files (webpack bundles, uglified code)
		const minifiedCheck = await this._checkMinifiedFile(uriObj);
		if (minifiedCheck.excluded) {
			return minifiedCheck;
		}

		// 8. Check project type patterns (auto-detected language-specific exclusions)
		const projectTypeExcluded = this._checkProjectTypePatterns(relativePath);
		if (projectTypeExcluded.matched) {
			return {
				excluded: true,
				reason: ExclusionReason.ProjectType,
				matchedPattern: projectTypeExcluded.pattern,
			};
		}

		// 9. Check static fallback patterns (LOWEST PRIORITY)
		const staticExcluded = this._checkStaticPatterns(filePath);
		if (staticExcluded.matched) {
			return {
				excluded: true,
				reason: ExclusionReason.StaticPattern,
				matchedPattern: staticExcluded.pattern,
			};
		}

		// Not excluded
		return {
			excluded: false,
			reason: ExclusionReason.NotExcluded,
		};
	}

	/**
	 * Get statistics about current exclusion configuration
	 * Useful for debugging and understanding what rules are active
	 */
	getStats(): ExclusionStats {
		const filesExclude = vscode.workspace.getConfiguration('files').get<Record<string, boolean>>('exclude', {});
		const enabledVSCodePatterns = Object.entries(filesExclude).filter(([_, enabled]) => enabled).length;

		return {
			hasGitignore: this._gitignoreService?.hasGitignore() ?? false,
			forceIncludeCount: this._forceIncludePatterns.length,
			userExcludeCount: this._excludePatterns.length,
			vscodeExcludeCount: enabledVSCodePatterns,
			staticPatternCount: this._staticFallbackPatterns.length,
		};
	}

	/**
	 * Load user settings from VS Code configuration
	 */
	private _loadUserSettings(): void {
		const config = vscode.workspace.getConfiguration('puku.indexing');
		this._forceIncludePatterns = config.get<string[]>('include', []);
		this._excludePatterns = config.get<string[]>('exclude', []);

		console.log('[PukuExclusion] Loaded user settings:', {
			forceInclude: this._forceIncludePatterns,
			exclude: this._excludePatterns,
		});
	}

	/**
	 * Convert absolute path to relative path from workspace root
	 */
	private _getRelativePath(filePath: string): string {
		if (!this._workspaceRoot) {
			return filePath;
		}

		if (filePath.startsWith(this._workspaceRoot)) {
			const relative = filePath.substring(this._workspaceRoot.length);
			// Remove leading slash
			return relative.startsWith(path.sep) ? relative.substring(1) : relative;
		}

		return filePath;
	}

	/**
	 * Check if path matches force include patterns
	 */
	private _checkForceInclude(relativePath: string): { matched: boolean; pattern?: string } {
		// Normalize path separators for cross-platform compatibility
		const normalizedPath = relativePath.replace(/\\/g, '/');

		for (const pattern of this._forceIncludePatterns) {
			if (minimatch(normalizedPath, pattern)) {
				return { matched: true, pattern };
			}
		}
		return { matched: false };
	}

	/**
	 * Check if path matches user exclude patterns
	 */
	private _checkUserExclude(relativePath: string): { matched: boolean; pattern?: string } {
		// Normalize path separators for cross-platform compatibility
		const normalizedPath = relativePath.replace(/\\/g, '/');

		for (const pattern of this._excludePatterns) {
			if (minimatch(normalizedPath, pattern)) {
				return { matched: true, pattern };
			}
		}
		return { matched: false };
	}

	/**
	 * Check if path matches VS Code files.exclude
	 */
	private _checkVSCodeExclude(relativePath: string): { matched: boolean; pattern?: string } {
		const filesExclude = vscode.workspace.getConfiguration('files').get<Record<string, boolean>>('exclude', {});

		// Normalize path separators for cross-platform compatibility
		const normalizedPath = relativePath.replace(/\\/g, '/');

		for (const [pattern, enabled] of Object.entries(filesExclude)) {
			if (enabled && minimatch(normalizedPath, pattern)) {
				return { matched: true, pattern };
			}
		}

		return { matched: false };
	}

	/**
	 * Check if path matches static fallback patterns
	 * Uses simple substring matching for performance
	 */
	private _checkStaticPatterns(filePath: string): { matched: boolean; pattern?: string } {
		for (const pattern of this._staticFallbackPatterns) {
			if (filePath.includes(pattern)) {
				return { matched: true, pattern };
			}
		}
		return { matched: false };
	}

	/**
	 * Check if file is binary (images, PDFs, executables, etc.)
	 * Uses multiple detection methods for accuracy
	 */
	private async _checkBinaryFile(uri: vscode.Uri): Promise<ExclusionResult> {
		const config = vscode.workspace.getConfiguration('puku.indexing');
		const skipBinary = config.get<boolean>('skipBinaryFiles', true);

		if (!skipBinary) {
			return { excluded: false, reason: ExclusionReason.NotExcluded };
		}

		const ext = path.extname(uri.fsPath).toLowerCase();

		// Method 1: Check against configured binary extensions (fast path)
		const binaryExtensions = config.get<string[]>('binaryExtensions', [
			'.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
			'.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.wasm', '.db', '.sqlite',
		]);

		if (binaryExtensions.includes(ext)) {
			return {
				excluded: true,
				reason: ExclusionReason.BinaryFile,
				matchedPattern: `Binary extension: ${ext}`
			};
		}

		// Method 2 & 3: Content analysis (read first 8KB)
		try {
			const buffer = await vscode.workspace.fs.readFile(uri);
			const sample = buffer.slice(0, 8192); // First 8KB

			// Method 2: Check for null bytes (most reliable indicator of binary)
			if (sample.includes(0)) {
				return {
					excluded: true,
					reason: ExclusionReason.BinaryFile,
					matchedPattern: 'Contains null bytes'
				};
			}

			// Method 3: Check for high ratio of non-printable characters
			let nonPrintable = 0;
			for (let i = 0; i < sample.length; i++) {
				const byte = sample[i];
				// Non-printable: not whitespace (tab=9, LF=10, CR=13), not ASCII 32-126
				if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
					nonPrintable++;
				}
			}

			const ratio = nonPrintable / sample.length;
			if (ratio > 0.3) { // >30% non-printable = binary
				return {
					excluded: true,
					reason: ExclusionReason.BinaryFile,
					matchedPattern: `${(ratio * 100).toFixed(1)}% non-printable`
				};
			}

			return { excluded: false, reason: ExclusionReason.NotExcluded };
		} catch (error) {
			// If read fails, assume text (graceful degradation)
			return { excluded: false, reason: ExclusionReason.NotExcluded };
		}
	}

	/**
	 * Check if file is generated (protobuf, prisma, etc.)
	 * Looks for generation markers in first 20 lines
	 */
	private async _checkGeneratedFile(uri: vscode.Uri): Promise<ExclusionResult> {
		const config = vscode.workspace.getConfiguration('puku.indexing');
		const skipGenerated = config.get<boolean>('skipGeneratedFiles', true);

		if (!skipGenerated) {
			return { excluded: false, reason: ExclusionReason.NotExcluded };
		}

		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const text = document.getText();

			// Check first 20 lines (where markers typically are)
			const lines = text.split('\n').slice(0, 20);
			const headerText = lines.join('\n');

			// Standard markers
			const standardMarkers = [
				'@generated',
				'AUTO-GENERATED',
				'Code generated by',
				'DO NOT EDIT',
				'This file is automatically generated',
				'automatically generated',
				'autogenerated',
			];

			for (const marker of standardMarkers) {
				if (headerText.includes(marker)) {
					return {
						excluded: true,
						reason: ExclusionReason.GeneratedFile,
						matchedPattern: `Marker: "${marker}"`
					};
				}
			}

			// Tool-specific markers
			const toolMarkers = [
				'Generated by protoc',
				'prisma/client',
				'swagger-codegen',
				'openapi-generator',
				'@graphql-codegen',
				'grpc-tools',
			];

			for (const marker of toolMarkers) {
				if (headerText.includes(marker)) {
					return {
						excluded: true,
						reason: ExclusionReason.GeneratedFile,
						matchedPattern: `Tool: "${marker}"`
					};
				}
			}

			// Pattern matching
			const patterns = [
				/\/\/\s*AUTO-GENERATED FILE/i,
				/\/\*\s*DO NOT EDIT\s*\*\//i,
				/<auto-generated>/i,
				/This file was generated/i,
			];

			for (const pattern of patterns) {
				if (pattern.test(headerText)) {
					return {
						excluded: true,
						reason: ExclusionReason.GeneratedFile,
						matchedPattern: `Pattern: ${pattern.source}`
					};
				}
			}

			// Custom user markers
			const customMarkers = config.get<string[]>('generatedMarkers', []);
			for (const marker of customMarkers) {
				if (headerText.includes(marker)) {
					return {
						excluded: true,
						reason: ExclusionReason.GeneratedFile,
						matchedPattern: `Custom: "${marker}"`
					};
				}
			}

			return { excluded: false, reason: ExclusionReason.NotExcluded };
		} catch (error) {
			// If read fails, assume not generated
			return { excluded: false, reason: ExclusionReason.NotExcluded };
		}
	}

	/**
	 * Check if file is minified (webpack bundles, uglified code)
	 * Uses multiple detection methods for accuracy
	 */
	private async _checkMinifiedFile(uri: vscode.Uri): Promise<ExclusionResult> {
		const config = vscode.workspace.getConfiguration('puku.indexing');
		const skipMinified = config.get<boolean>('skipMinifiedFiles', true);

		if (!skipMinified) {
			return { excluded: false, reason: ExclusionReason.NotExcluded };
		}

		// Method 1: Extension check (instant)
		const ext = path.extname(uri.fsPath).toLowerCase();
		if (ext === '.min.js' || ext === '.min.css' || ext === '.min.mjs') {
			return {
				excluded: true,
				reason: ExclusionReason.MinifiedFile,
				matchedPattern: `Minified extension: ${ext}`
			};
		}

		// Only check content for .js/.mjs/.css files (optimization)
		if (!['.js', '.mjs', '.css'].includes(ext)) {
			return { excluded: false, reason: ExclusionReason.NotExcluded };
		}

		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const content = document.getText();
			const lines = content.split('\n');

			if (lines.length === 0) {
				return { excluded: false, reason: ExclusionReason.NotExcluded };
			}

			// Method 2: Check for bundle markers in first 10 lines
			const firstLines = lines.slice(0, 10).join('\n');
			const bundleMarkers = [
				'webpackJsonp',
				'__webpack_require__',
				'!function(e,t)',
				'/******/ (function(modules)',
				'(function(modules)',
				'System.register',
			];

			for (const marker of bundleMarkers) {
				if (firstLines.includes(marker)) {
					return {
						excluded: true,
						reason: ExclusionReason.MinifiedFile,
						matchedPattern: `Bundle marker: "${marker}"`
					};
				}
			}

			// Method 3: Line length heuristics
			const avgLineLength = content.length / lines.length;
			const firstLine = lines[0];
			const maxLineLength = Math.max(...lines.slice(0, 100).map(l => l.length));

			// Very long average line
			if (avgLineLength > 500) {
				return {
					excluded: true,
					reason: ExclusionReason.MinifiedFile,
					matchedPattern: `Avg line length: ${avgLineLength.toFixed(0)} chars`
				};
			}

			// First line extremely long with few total lines
			if (firstLine.length > 1000 && lines.length < 10) {
				return {
					excluded: true,
					reason: ExclusionReason.MinifiedFile,
					matchedPattern: `First line: ${firstLine.length} chars, only ${lines.length} lines`
				};
			}

			// Single massive line
			if (maxLineLength > 10000) {
				return {
					excluded: true,
					reason: ExclusionReason.MinifiedFile,
					matchedPattern: `Max line: ${maxLineLength} chars`
				};
			}

			// Method 4: Whitespace ratio (for smaller files)
			if (content.length > 1000) {
				const whitespaceCount = (content.match(/\s/g) || []).length;
				const whitespaceRatio = whitespaceCount / content.length;

				if (whitespaceRatio < 0.05) {
					return {
						excluded: true,
						reason: ExclusionReason.MinifiedFile,
						matchedPattern: `Whitespace: ${(whitespaceRatio * 100).toFixed(1)}%`
					};
				}
			}

			return { excluded: false, reason: ExclusionReason.NotExcluded };
		} catch (error) {
			return { excluded: false, reason: ExclusionReason.NotExcluded };
		}
	}

	/**
	 * Detect project type and apply auto-exclusions
	 */
	private async _detectAndApplyProjectType(): Promise<void> {
		if (!this._workspaceRoot) {
			return;
		}

		const config = vscode.workspace.getConfiguration('puku.indexing');
		const autoDetect = config.get<boolean>('autoDetectProjectType', true);
		const override = config.get<string[]>('projectTypeOverride', []);

		// Use override if provided, otherwise auto-detect
		if (override.length > 0) {
			// Manual override - use specified types
			const result = await this._detectProjectType(this._workspaceRoot, override);
			this._projectTypePatterns = result.patterns;
			this._detectedProjectTypes = result.types;
		} else if (autoDetect) {
			// Auto-detect project type
			const result = await this._detectProjectType(this._workspaceRoot);
			this._projectTypePatterns = result.patterns;
			this._detectedProjectTypes = result.types;
		} else {
			// Detection disabled
			this._projectTypePatterns = [];
			this._detectedProjectTypes = [];
		}
	}

	/**
	 * Detect project type based on marker files
	 */
	private async _detectProjectType(workspaceRoot: string, forceTypes?: string[]): Promise<ProjectTypeConfig> {
		const detectedTypes: string[] = [];
		const autoExcludePatterns: string[] = [];

		// If force types provided, only detect those
		const shouldDetect = (type: string) => !forceTypes || forceTypes.includes(type);

		// JavaScript/TypeScript
		if (shouldDetect('javascript') && await this._fileExists(path.join(workspaceRoot, 'package.json'))) {
			detectedTypes.push('javascript');
			autoExcludePatterns.push(
				'node_modules',
				'dist',
				'build',
				'.next',
				'out',
				'coverage',
				'*.min.js',
				'*.min.css',
				'package-lock.json',
				'yarn.lock',
				'pnpm-lock.yaml',
			);
		}

		// Python
		if (shouldDetect('python')) {
			const pythonMarkers = [
				'requirements.txt',
				'setup.py',
				'pyproject.toml',
				'Pipfile',
			];

			for (const marker of pythonMarkers) {
				if (await this._fileExists(path.join(workspaceRoot, marker))) {
					detectedTypes.push('python');
					autoExcludePatterns.push(
						'__pycache__',
						'*.pyc',
						'*.pyo',
						'*.pyd',
						'.venv',
						'venv',
						'env',
						'.Python',
						'pip-log.txt',
						'.eggs',
						'*.egg-info',
						'dist',
						'build',
						'.pytest_cache',
						'.mypy_cache',
					);
					break;
				}
			}
		}

		// Go
		if (shouldDetect('go') && await this._fileExists(path.join(workspaceRoot, 'go.mod'))) {
			detectedTypes.push('go');
			autoExcludePatterns.push(
				'vendor',
				'*.exe',
				'*.dll',
				'*.so',
				'*.dylib',
				'*.test',
			);
		}

		// Rust
		if (shouldDetect('rust') && await this._fileExists(path.join(workspaceRoot, 'Cargo.toml'))) {
			detectedTypes.push('rust');
			autoExcludePatterns.push(
				'target',
				'Cargo.lock',
				'**/*.rs.bk',
			);
		}

		// Java/Kotlin
		if (shouldDetect('java')) {
			const javaMarkers = ['pom.xml', 'build.gradle', 'build.gradle.kts'];
			for (const marker of javaMarkers) {
				if (await this._fileExists(path.join(workspaceRoot, marker))) {
					detectedTypes.push('java');
					autoExcludePatterns.push(
						'target',
						'build',
						'.gradle',
						'*.class',
						'*.jar',
						'*.war',
					);
					break;
				}
			}
		}

		// Ruby
		if (shouldDetect('ruby') && await this._fileExists(path.join(workspaceRoot, 'Gemfile'))) {
			detectedTypes.push('ruby');
			autoExcludePatterns.push(
				'vendor/bundle',
				'.bundle',
				'*.gem',
			);
		}

		// PHP
		if (shouldDetect('php') && await this._fileExists(path.join(workspaceRoot, 'composer.json'))) {
			detectedTypes.push('php');
			autoExcludePatterns.push(
				'vendor',
				'composer.lock',
			);
		}

		// C#/.NET
		if (shouldDetect('csharp')) {
			// For C#, we check if any .csproj file exists
			try {
				const files = await vscode.workspace.findFiles('**/*.csproj', null, 1);
				if (files.length > 0) {
					detectedTypes.push('csharp');
					autoExcludePatterns.push(
						'bin',
						'obj',
						'packages',
						'*.dll',
						'*.exe',
					);
				}
			} catch {
				// Ignore errors
			}
		}

		// Deduplicate patterns (for monorepos with multiple languages)
		const uniquePatterns = [...new Set(autoExcludePatterns)];

		console.log('[PukuExclusion] Detected project types:', {
			types: detectedTypes,
			autoExclusions: uniquePatterns.length
		});

		return {
			types: detectedTypes,
			patterns: uniquePatterns,
		};
	}

	/**
	 * Check if file exists
	 */
	private async _fileExists(filePath: string): Promise<boolean> {
		try {
			await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Check if path matches project type patterns
	 */
	private _checkProjectTypePatterns(relativePath: string): { matched: boolean; pattern?: string } {
		// Normalize path separators for cross-platform compatibility
		const normalizedPath = relativePath.replace(/\\/g, '/');

		for (const pattern of this._projectTypePatterns) {
			if (minimatch(normalizedPath, pattern)) {
				return { matched: true, pattern };
			}
		}
		return { matched: false };
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this._gitignoreService?.dispose();
		this._configChangeDisposable?.dispose();
	}
}
