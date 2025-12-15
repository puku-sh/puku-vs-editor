/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defineConfig } from '@vscode/test-cli';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { loadEnvFile } from 'process';
import { fileURLToPath } from 'url';

const isSanity = process.argv.includes('--sanity');
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (isSanity) {
	loadEnvFile(resolve(__dirname, '.env'));
}

const packageJsonPath = resolve(__dirname, 'package.json');
const raw = readFileSync(packageJsonPath, 'utf8');
const pkg = JSON.parse(raw);
pkg.engines.vscode = pkg.engines.vscode.split('-')[0];

// remove the date from the vscode engine version
writeFileSync(packageJsonPath, JSON.stringify(pkg, null, '\t'));

// and revert it once done
process.on('exit', () => writeFileSync(packageJsonPath, raw));

// Use our forked VS Code build if available
const vscodePath = resolve(__dirname, '../vscode/.build/electron/Puku.app/Contents/MacOS/Electron');
const vscodePathExists = existsSync(vscodePath);

if (!vscodePathExists) {
	console.error('\n❌ Puku VS Code not found at:', vscodePath);
	console.error('Please build VS Code first:');
	console.error('  cd ../../ && make build-vs\n');
	process.exit(1);
}

export default defineConfig({
	files: __dirname + (isSanity ? '/dist/sanity-test-extension.js' : '/dist/test-extension.js'),
	// Use our custom-built VS Code with all proposed APIs
	vscodeExecutablePath: vscodePath,
	launchArgs: [
		'--extensionDevelopmentPath=' + __dirname,
		'--enable-proposed-api=GitHub.puku-editor',
		'--disable-extensions',
		'--profile-temp'
	],
	mocha: {
		ui: 'tdd',
		color: true,
		forbidOnly: !!process.env.CI,
		timeout: 10000
	}
});
