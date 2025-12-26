/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { expect, suite, test, beforeEach, afterEach } from 'vitest';
import { PukuGitignoreService } from '../pukuGitignoreService';

suite('PukuGitignoreService', () => {
	let tempDir: string;
	let service: PukuGitignoreService;

	beforeEach(() => {
		// Create temporary directory for each test
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puku-gitignore-test-'));
		service = new PukuGitignoreService();
	});

	afterEach(() => {
		// Clean up
		service.dispose();
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	test('should initialize without .gitignore', async () => {
		await service.initialize(tempDir);
		expect(service.hasGitignore()).toBe(false);
	});

	test('should load .gitignore when present', async () => {
		// Create .gitignore
		const gitignorePath = path.join(tempDir, '.gitignore');
		fs.writeFileSync(gitignorePath, 'node_modules/\n*.log\n');

		await service.initialize(tempDir);
		expect(service.hasGitignore()).toBe(true);
	});

	test('should ignore files matching .gitignore patterns', async () => {
		// Create .gitignore
		const gitignorePath = path.join(tempDir, '.gitignore');
		fs.writeFileSync(gitignorePath, 'node_modules/\n*.log\ndist/\n');

		await service.initialize(tempDir);

		// Test absolute paths
		expect(service.isIgnored(path.join(tempDir, 'node_modules/package.json'))).toBe(true);
		expect(service.isIgnored(path.join(tempDir, 'dist/bundle.js'))).toBe(true);
		expect(service.isIgnored(path.join(tempDir, 'debug.log'))).toBe(true);

		// Test relative paths
		expect(service.isIgnored('node_modules/package.json')).toBe(true);
		expect(service.isIgnored('dist/bundle.js')).toBe(true);
		expect(service.isIgnored('debug.log')).toBe(true);
	});

	test('should not ignore files not in .gitignore', async () => {
		// Create .gitignore
		const gitignorePath = path.join(tempDir, '.gitignore');
		fs.writeFileSync(gitignorePath, 'node_modules/\n*.log\n');

		await service.initialize(tempDir);

		// Source files should not be ignored
		expect(service.isIgnored('src/index.ts')).toBe(false);
		expect(service.isIgnored('README.md')).toBe(false);
		expect(service.isIgnored('package.json')).toBe(false);
	});

	test('should handle nested paths', async () => {
		const gitignorePath = path.join(tempDir, '.gitignore');
		fs.writeFileSync(gitignorePath, 'build/\n*.min.js\n');

		await service.initialize(tempDir);

		// Nested paths
		expect(service.isIgnored('build/app.js')).toBe(true);
		expect(service.isIgnored('build/nested/deep/file.js')).toBe(true);
		expect(service.isIgnored('src/lib/app.min.js')).toBe(true);

		// Not ignored
		expect(service.isIgnored('src/app.js')).toBe(false);
	});

	test('should handle comments and blank lines', async () => {
		const gitignorePath = path.join(tempDir, '.gitignore');
		fs.writeFileSync(gitignorePath, `
# This is a comment
node_modules/

# Another comment
*.log

`);

		await service.initialize(tempDir);

		expect(service.isIgnored('node_modules/package.json')).toBe(true);
		expect(service.isIgnored('debug.log')).toBe(true);
		expect(service.isIgnored('src/index.ts')).toBe(false);
	});

	test('should handle Windows-style paths', async () => {
		const gitignorePath = path.join(tempDir, '.gitignore');
		fs.writeFileSync(gitignorePath, 'node_modules/\ndist/\n');

		await service.initialize(tempDir);

		// Windows-style paths should work
		const windowsPath = 'node_modules\\package.json';
		expect(service.isIgnored(windowsPath)).toBe(true);
	});

	test('should return false when not initialized', () => {
		// Service not initialized
		expect(service.isIgnored('any/path')).toBe(false);
		expect(service.hasGitignore()).toBe(false);
	});

	test('should handle .gitignore with negation patterns', async () => {
		const gitignorePath = path.join(tempDir, '.gitignore');
		fs.writeFileSync(gitignorePath, `
*.log
!important.log
`);

		await service.initialize(tempDir);

		expect(service.isIgnored('debug.log')).toBe(true);
		expect(service.isIgnored('important.log')).toBe(false); // Negated
	});

	test('should handle project-specific patterns', async () => {
		const gitignorePath = path.join(tempDir, '.gitignore');
		fs.writeFileSync(gitignorePath, `
# Node.js
node_modules/
npm-debug.log

# Build outputs
dist/
build/
.next/
out/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
`);

		await service.initialize(tempDir);

		// Node.js
		expect(service.isIgnored('node_modules/react/index.js')).toBe(true);
		expect(service.isIgnored('npm-debug.log')).toBe(true);

		// Build outputs
		expect(service.isIgnored('dist/bundle.js')).toBe(true);
		expect(service.isIgnored('build/app.js')).toBe(true);
		expect(service.isIgnored('.next/cache/file')).toBe(true);
		expect(service.isIgnored('out/main.js')).toBe(true);

		// Environment
		expect(service.isIgnored('.env')).toBe(true);
		expect(service.isIgnored('.env.local')).toBe(true);

		// IDE
		expect(service.isIgnored('.vscode/settings.json')).toBe(true);
		expect(service.isIgnored('.idea/workspace.xml')).toBe(true);

		// Source files not ignored
		expect(service.isIgnored('src/index.ts')).toBe(false);
		expect(service.isIgnored('package.json')).toBe(false);
	});
});
