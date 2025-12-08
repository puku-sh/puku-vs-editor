"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const test_electron_1 = require("@vscode/test-electron");
async function main() {
    const tempdir = await fs_1.promises.mkdtemp(os.tmpdir() + '/copilot-extension-test-');
    let exitCode;
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../..');
        // The path to the extension test script (must be javascript)
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './run');
        const launchArgs = [];
        // Disable other extensions while testing,
        launchArgs.push('--disable-extensions');
        // use a temporary folder so we can run multiple instances of the same VS Code together
        // see https://github.com/microsoft/vscode/issues/137678
        launchArgs.push('--user-data-dir', tempdir);
        const argv = await (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
            .options({
            stable: {
                type: 'boolean',
                default: false,
            },
            grep: {
                alias: 'g',
                type: 'string',
                default: '',
            },
        })
            .parse();
        const version = argv.stable ? 'stable' : 'insiders';
        const extensionTestsEnv = {};
        // Pass arguments to mocha by environment variables
        if (argv.grep) {
            extensionTestsEnv.MOCHA_GREP = argv.grep;
        }
        if (argv._.length > 0) {
            extensionTestsEnv.MOCHA_FILES = argv._.join('\n');
        }
        if (!process.stdout.isTTY) {
            extensionTestsEnv.NO_COLOR = 'true';
        }
        const workspaceFolder = await fs_1.promises.mkdtemp(path.join(os.tmpdir(), 'copilot-extension-test-'));
        launchArgs.push(workspaceFolder);
        extensionTestsEnv.CORETEST = 'true';
        //@dbaeumer This can be removed as soon as we have the cache handle CORETEST
        extensionTestsEnv.VITEST = 'true';
        // Download VS Code, unzip it and run the integration test
        exitCode = await (0, test_electron_1.runTests)({
            version,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs,
            extensionTestsEnv,
        });
    }
    catch (err) {
        console.error('Failed to run tests', err);
        exitCode = 1;
    }
    finally {
        await fs_1.promises.rm(tempdir, { recursive: true });
    }
    process.exit(exitCode);
}
void main();
//# sourceMappingURL=runTest.js.map