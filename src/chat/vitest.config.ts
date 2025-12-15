import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		// Use node environment for unit tests
		environment: 'node',

		// Test file patterns
		include: ['src/**/*.spec.ts'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.vscode-test/**',
			'**/test/simulation/**',
			// Exclude integration tests that need VS Code
			'**/*.integration.spec.ts',
			'**/*.e2e.spec.ts',
			// Exclude vscode-node tests (need VS Code Extension Host)
			'**/vscode-node/**/*.spec.ts',
			// Specific failing test files that need VS Code APIs
			'**/mcp/test/**/*.spec.ts',
			'**/chatSessions/**/*.spec.ts',
			'**/linkify/**/*.spec.ts',
			'**/log/**/*.spec.ts'
		],

		// Coverage settings
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/*.spec.ts',
				'**/*.test.ts',
				'**/test/**'
			]
		},

		// Timeouts
		testTimeout: 10000,
		hookTimeout: 10000,

		// Globals
		globals: true,

		// Reporter
		reporter: process.env.CI ? ['dot', 'json'] : ['verbose']
	},

	resolve: {
		alias: {
			// Match the paths from tsconfig.json if any
			'@': path.resolve(__dirname, './src')
		}
	}
});
