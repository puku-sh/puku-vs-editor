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
const assert_1 = __importDefault(require("assert"));
const path = __importStar(require("path"));
const copilotCli_1 = require("../../src/extension/agents/copilotcli/node/copilotCli");
const copilotcliPromptResolver_1 = require("../../src/extension/agents/copilotcli/node/copilotcliPromptResolver");
const copilotcliSessionService_1 = require("../../src/extension/agents/copilotcli/node/copilotcliSessionService");
const mcpHandler_1 = require("../../src/extension/agents/copilotcli/node/mcpHandler");
const langModelServer_1 = require("../../src/extension/agents/node/langModelServer");
const testHelpers_1 = require("../../src/extension/test/node/testHelpers");
const async_1 = require("../../src/util/vs/base/common/async");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const lifecycle_1 = require("../../src/util/vs/base/common/lifecycle");
const descriptors_1 = require("../../src/util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../src/vscodeTypes");
const stest_1 = require("../base/stest");
function registerChatServices(testingServiceCollection) {
    class TestCopilotCLISDK extends copilotCli_1.CopilotCLISDK {
        async ensureNodePtyShim() {
            // Override to do nothing in tests
        }
    }
    class TestCopilotCLISessionService extends copilotcliSessionService_1.CopilotCLISessionService {
        async monitorSessionFiles() {
            // Override to do nothing in tests
        }
    }
    testingServiceCollection.define(copilotcliSessionService_1.ICopilotCLISessionService, new descriptors_1.SyncDescriptor(TestCopilotCLISessionService));
    testingServiceCollection.define(copilotCli_1.ICopilotCLIModels, new descriptors_1.SyncDescriptor(copilotCli_1.CopilotCLIModels));
    testingServiceCollection.define(copilotCli_1.ICopilotCLISDK, new descriptors_1.SyncDescriptor(TestCopilotCLISDK));
    testingServiceCollection.define(langModelServer_1.ILanguageModelServer, new descriptors_1.SyncDescriptor(langModelServer_1.LanguageModelServer));
    testingServiceCollection.define(mcpHandler_1.ICopilotCLIMCPHandler, new descriptors_1.SyncDescriptor(mcpHandler_1.CopilotCLIMCPHandler));
    const accessor = testingServiceCollection.createTestingAccessor();
    const copilotCLISessionService = accessor.get(copilotcliSessionService_1.ICopilotCLISessionService);
    const instaService = accessor.get(instantiation_1.IInstantiationService);
    const promptResolver = instaService.createInstance(copilotcliPromptResolver_1.CopilotCLIPromptResolver);
    return { sessionService: copilotCLISessionService, promptResolver };
}
function testRunner(cb) {
    return async (testingServiceCollection) => {
        const disposables = new lifecycle_1.DisposableStore();
        try {
            const services = registerChatServices(testingServiceCollection);
            const stream = new testHelpers_1.MockChatResponseStream();
            await cb(services, stream, disposables);
        }
        finally {
            disposables.dispose();
        }
    };
}
const scenariosPath = path.join(__dirname, '..', 'test/scenarios/test-cli');
stest_1.ssuite.skip({ title: '@cli', location: 'external' }, async (_) => {
    (0, stest_1.stest)({ description: 'can start a session' }, testRunner(async ({ sessionService }, stream, disposables) => {
        const session = await sessionService.createSession('What is 1+8?', {}, cancellation_1.CancellationToken.None);
        disposables.add(session);
        disposables.add(session.object.attachStream(stream));
        await session.object.handleRequest('What is 1+8?', [], undefined, cancellation_1.CancellationToken.None);
        // Verify we have a response of 9.
        assert_1.default.strictEqual(session.object.status, vscodeTypes_1.ChatSessionStatus.Completed);
        assert_1.default.ok(stream.output.join('\n').includes('9'), 'Expected response to include "9"');
        // Can send a subsequent request.
        await session.object.handleRequest('What is 11+25?', [], undefined, cancellation_1.CancellationToken.None);
        // Verify we have a response of 36.
        assert_1.default.strictEqual(session.object.status, vscodeTypes_1.ChatSessionStatus.Completed);
        assert_1.default.ok(stream.output.join('\n').includes('36'), 'Expected response to include "36"');
    }));
    (0, stest_1.stest)({ description: 'can resume a session' }, testRunner(async ({ sessionService }, stream, disposables) => {
        let sessionId = '';
        {
            const session = await sessionService.createSession('What is 1+8?', {}, cancellation_1.CancellationToken.None);
            sessionId = session.object.sessionId;
            await session.object.handleRequest('What is 1+8?', [], undefined, cancellation_1.CancellationToken.None);
            session.dispose();
        }
        {
            const session = await new Promise((resolve, reject) => {
                const interval = disposables.add(new async_1.IntervalTimer());
                interval.cancelAndSet(async () => {
                    const session = await sessionService.getSession(sessionId, { readonly: false }, cancellation_1.CancellationToken.None);
                    if (session) {
                        interval.dispose();
                        resolve(session);
                    }
                }, 50);
                disposables.add((0, async_1.disposableTimeout)(() => reject(new Error('Timed out waiting for session')), 5_000));
            });
            disposables.add(session);
            disposables.add(session.object.attachStream(stream));
            await session.object.handleRequest('What was my previous question?', [], undefined, cancellation_1.CancellationToken.None);
            // Verify we have a response of 9.
            assert_1.default.strictEqual(session.object.status, vscodeTypes_1.ChatSessionStatus.Completed);
            assert_1.default.ok(stream.output.join('\n').includes('8'), 'Expected response to include "8"');
        }
    }));
    (0, stest_1.stest)({ description: 'can read file without permission' }, testRunner(async ({ sessionService }, stream, disposables) => {
        const workingDirectory = path.join(scenariosPath, 'wkspc1');
        const file = path.join(workingDirectory, 'sample.js');
        const prompt = `Explain the contents of the file '${path.basename(file)}'. There is no need to check for contents in the directory. This file exists on disc.`;
        const session = await sessionService.createSession(prompt, { workingDirectory }, cancellation_1.CancellationToken.None);
        disposables.add(session);
        disposables.add(session.object.attachStream(stream));
        await session.object.handleRequest(prompt, [], undefined, cancellation_1.CancellationToken.None);
        assert_1.default.strictEqual(session.object.status, vscodeTypes_1.ChatSessionStatus.Completed);
        assert_1.default.ok(stream.output.join('\n').includes('add'), 'Expected response to include "add"');
    }));
    (0, stest_1.stest)({ description: 'request permission when reading file outside workspace' }, testRunner(async ({ sessionService }, stream, disposables) => {
        const workingDirectory = path.join(scenariosPath, 'wkspc1');
        const externalFile = path.join(scenariosPath, 'wkspc2', 'foobar.js');
        const prompt = `Explain the contents of the file '${path.basename(externalFile)}'. This file exists on disc but not in the current working directory.`;
        const session = await sessionService.createSession(prompt, { workingDirectory }, cancellation_1.CancellationToken.None);
        disposables.add(session);
        disposables.add(session.object.attachStream(stream));
        let permissionRequested = false;
        session.object.attachPermissionHandler(async (permission) => {
            if (permission.kind === 'read' && permission.path.toLowerCase() === externalFile.toLowerCase()) {
                permissionRequested = true;
                return true;
            }
            else if (permission.kind === 'shell' && (permission.intention.toLowerCase().includes('search') || permission.intention.toLowerCase().includes('find'))) {
                permissionRequested = true;
                return true;
            }
            else {
                return false;
            }
        });
        await session.object.handleRequest(prompt, [], undefined, cancellation_1.CancellationToken.None);
        assert_1.default.strictEqual(session.object.status, vscodeTypes_1.ChatSessionStatus.Completed);
        assert_1.default.ok(permissionRequested, 'Expected permission to be requested for external file');
    }));
    (0, stest_1.stest)({ description: 'can read attachment without permission' }, testRunner(async ({ sessionService, promptResolver }, stream, disposables) => {
        const workingDirectory = path.join(scenariosPath, 'wkspc1');
        const file = path.join(workingDirectory, 'sample.js');
        const { prompt, attachments } = await resolvePromptWithFileReferences(`Explain the contents of the attached file. There is no need to check for contents in the directory. This file exists on disc.`, [file], promptResolver);
        const session = await sessionService.createSession(prompt, { workingDirectory }, cancellation_1.CancellationToken.None);
        disposables.add(session);
        disposables.add(session.object.attachStream(stream));
        await session.object.handleRequest(prompt, attachments, undefined, cancellation_1.CancellationToken.None);
        assert_1.default.strictEqual(session.object.status, vscodeTypes_1.ChatSessionStatus.Completed);
        assert_1.default.ok(stream.output.join('\n').includes('add'), 'Expected response to include "add"');
    }));
});
function createWithRequestWithFileReference(prompt, files) {
    const request = new testHelpers_1.TestChatRequest(prompt);
    request.references = files.map(file => ({
        id: `file-${file}`,
        name: path.basename(file),
        value: vscodeTypes_1.Uri.file(file),
    }));
    return request;
}
function resolvePromptWithFileReferences(prompt, files, promptResolver) {
    return promptResolver.resolvePrompt(createWithRequestWithFileReference(prompt, files), cancellation_1.CancellationToken.None);
}
//# sourceMappingURL=cli.stest.js.map