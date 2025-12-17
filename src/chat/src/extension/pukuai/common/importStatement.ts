/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Based on GitHub Copilot Chat's import detection (importStatement.ts)
 *--------------------------------------------------------------------------------------------*/

/**
 * Detect if a line is an import statement (language-aware)
 * Based on Copilot's approach in vscode-copilot-chat/src/extension/prompt/common/importStatement.ts
 */
export function isImportStatement(line: string, languageId: string): boolean {
	switch (languageId) {
		case 'java':
			return !!line.match(/^\s*import\s/);
		case 'typescript':
		case 'typescriptreact':
		case 'javascript':
		case 'javascriptreact':
			return !!line.match(/^\s*import[\s{*]|^\s*[var|const|let].*=\s*require\(/);
		case 'php':
			return !!line.match(/^\s*use/);
		case 'rust':
			return !!line.match(/^\s*use\s+[\w:{}, ]+\s*(as\s+\w+)?;/);
		case 'python':
			return !!line.match(/^\s*from\s+[\w.]+\s+import\s+[\w, *]+$/)
				|| !!line.match(/^\s*import\s+[\w, ]+$/);
		case 'go':
			return !!line.match(/^\s*import\s+/);
		case 'csharp':
			return !!line.match(/^\s*using\s+/);
		case 'ruby':
			return !!line.match(/^\s*require(_relative)?\s+['"]|^\s*require(_relative)?\(/);
		case 'c':
		case 'cpp':
			return !!line.match(/^\s*#include\s+["<]/);
		default:
			return false;
	}
}
