"use strict";
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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const path_1 = __importDefault(require("path"));
const commandToConfigConverter_1 = require("../../src/extension/onboardDebug/node/commandToConfigConverter");
const gitExtensionService_1 = require("../../src/platform/git/common/gitExtensionService");
const workspaceService_1 = require("../../src/platform/workspace/common/workspaceService");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const event_1 = require("../../src/util/vs/base/common/event");
const uri_1 = require("../../src/util/vs/base/common/uri");
const descriptors_1 = require("../../src/util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const rubric_1 = require("../base/rubric");
const stest_1 = require("../base/stest");
(0, stest_1.ssuite)({ title: 'Debug config to command', location: 'context' }, () => {
    const WORKSPACE_FOLDER = uri_1.URI.file('/workspace');
    async function score(testingServiceCollection, cwd, args) {
        testingServiceCollection.define(gitExtensionService_1.IGitExtensionService, new descriptors_1.SyncDescriptor(class {
            constructor() {
                this.onDidChange = event_1.Event.None;
                this.extensionAvailable = false;
            }
            getExtensionApi() {
                return undefined;
            }
        }));
        const accessor = testingServiceCollection.createTestingAccessor();
        accessor.get(workspaceService_1.IWorkspaceService).getWorkspaceFolders().push(WORKSPACE_FOLDER);
        const cvt = accessor.get(instantiation_1.IInstantiationService).createInstance(commandToConfigConverter_1.DebugCommandToConfigConverter);
        const result = await cvt.convert(cwd, args, cancellation_1.CancellationToken.None);
        if (!result.ok) {
            throw new Error('Expected tools to be found');
        }
        return { accessor, r: result.config?.configurations[0] };
    }
    (0, stest_1.stest)({ description: 'node test' }, async (testingServiceCollection) => {
        const { accessor, r } = await score(testingServiceCollection, WORKSPACE_FOLDER.fsPath, ['node', 'index.js']);
        (0, rubric_1.rubric)(accessor, () => assert.ok(r?.type === 'node'), () => assert.ok(r?.program.endsWith('index.js')), () => assert.ok(!r?.cwd || r?.cwd === '${workspaceFolder}'));
    });
    (0, stest_1.stest)({ description: 'node subdirectory and arg' }, async (testingServiceCollection) => {
        const { accessor, r } = await score(testingServiceCollection, path_1.default.join(WORKSPACE_FOLDER.fsPath, 'foo'), ['node', 'index', '--my-arg']);
        (0, rubric_1.rubric)(accessor, () => assert.ok(r?.type === 'node'), () => assert.ok(r?.program.endsWith('index.js')), () => assert.ok(r?.cwd.endsWith('foo')), () => assert.deepStrictEqual(r?.args, ['--my-arg']));
    });
    (0, stest_1.stest)({ description: 'python3 subdirectory and arg' }, async (testingServiceCollection) => {
        const { accessor, r } = await score(testingServiceCollection, path_1.default.join(WORKSPACE_FOLDER.fsPath, 'foo'), ['python3', 'cool.py', '--my-arg']);
        (0, rubric_1.rubric)(accessor, () => assert.ok(r?.type === 'python' || r?.type === 'debugpy'), () => assert.ok(r?.program.endsWith('cool.py')), () => assert.ok(r?.cwd.endsWith('foo')), () => assert.deepStrictEqual(r?.args, ['--my-arg']));
    });
    (0, stest_1.stest)({ description: 'opening a browser' }, async (testingServiceCollection) => {
        const { accessor, r } = await score(testingServiceCollection, path_1.default.join(WORKSPACE_FOLDER.fsPath), ['chrome.exe', 'https://microsoft.com']);
        (0, rubric_1.rubric)(accessor, () => assert.ok(r?.type === 'chrome'), () => assert.deepStrictEqual(r?.url, 'https://microsoft.com'));
    });
    (0, stest_1.stest)({ description: 'cargo run platform-specific' }, async (testingServiceCollection) => {
        const { accessor, r } = await score(testingServiceCollection, path_1.default.join(WORKSPACE_FOLDER.fsPath), ['cargo', 'run']);
        (0, rubric_1.rubric)(accessor, 
        // test env service always advertises linux:
        () => assert.strictEqual(r?.type, 'lldb'), () => assert.ok(r?.program.includes('target/debug')));
    });
});
//# sourceMappingURL=debugCommandToConfig.stest.js.map