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
const sinon = __importStar(require("sinon"));
const vscode = __importStar(require("vscode"));
const authentication_1 = require("../../../../platform/authentication/common/authentication");
const copilotToken_1 = require("../../../../platform/authentication/common/copilotToken");
const devContainerConfigurationService_1 = require("../../../../platform/devcontainer/common/devContainerConfigurationService");
const vscodeIndex_1 = require("../../../../platform/embeddings/common/vscodeIndex");
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const gitCommitMessageService_1 = require("../../../../platform/git/common/gitCommitMessageService");
const settingsEditorSearchService_1 = require("../../../../platform/settingsEditor/common/settingsEditorSearchService");
const descriptors_1 = require("../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const mergeConflictService_1 = require("../../../git/common/mergeConflictService");
const mergeConflictServiceImpl_1 = require("../../../git/vscode/mergeConflictServiceImpl");
const intentService_1 = require("../../../intents/node/intentService");
const newIntent_1 = require("../../../intents/node/newIntent");
const services_1 = require("../../../test/vscode-node/services");
const conversationFeature_1 = require("../conversationFeature");
suite('Conversation feature test suite', function () {
    let accessor;
    let instaService;
    let sandbox;
    function createAccessor() {
        const testingServiceCollection = (0, services_1.createExtensionTestingServices)();
        testingServiceCollection.define(vscodeIndex_1.ICombinedEmbeddingIndex, new descriptors_1.SyncDescriptor(vscodeIndex_1.VSCodeCombinedIndexImpl, [/*useRemoteCache*/ false]));
        testingServiceCollection.define(newIntent_1.INewWorkspacePreviewContentManager, new descriptors_1.SyncDescriptor(newIntent_1.NewWorkspacePreviewContentManagerImpl));
        testingServiceCollection.define(gitCommitMessageService_1.IGitCommitMessageService, new gitCommitMessageService_1.NoopGitCommitMessageService());
        testingServiceCollection.define(devContainerConfigurationService_1.IDevContainerConfigurationService, new devContainerConfigurationService_1.FailingDevContainerConfigurationService());
        testingServiceCollection.define(intentService_1.IIntentService, new descriptors_1.SyncDescriptor(intentService_1.IntentService));
        testingServiceCollection.define(settingsEditorSearchService_1.ISettingsEditorSearchService, new descriptors_1.SyncDescriptor(settingsEditorSearchService_1.NoopSettingsEditorSearchService));
        testingServiceCollection.define(mergeConflictService_1.IMergeConflictService, new descriptors_1.SyncDescriptor(mergeConflictServiceImpl_1.TestMergeConflictServiceImpl));
        accessor = testingServiceCollection.createTestingAccessor();
        instaService = accessor.get(instantiation_1.IInstantiationService);
    }
    setup(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(vscode.commands, 'registerCommand').returns({ dispose: () => { } });
        sandbox.stub(vscode.workspace, 'registerFileSystemProvider').returns({ dispose: () => { } });
        createAccessor();
    });
    teardown(() => {
        sandbox.restore();
        const extensionContext = accessor.get(extensionContext_1.IVSCodeExtensionContext);
        extensionContext.subscriptions.forEach(sub => sub.dispose());
    });
    test.skip("If the 'interactive' namespace is not available, the feature is not enabled and not activated", function () {
        // TODO: The vscode module cannot be stubbed
        sandbox.stub(vscode, 'interactive').value(undefined);
        const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
        try {
            assert_1.default.deepStrictEqual(conversationFeature.enabled, false);
            assert_1.default.deepStrictEqual(conversationFeature.activated, false);
        }
        finally {
            conversationFeature.dispose();
        }
    });
    test("If the 'interactive' version does not match, the feature is not enabled and not activated", function () {
        const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
        try {
            assert_1.default.deepStrictEqual(conversationFeature.enabled, false);
            assert_1.default.deepStrictEqual(conversationFeature.activated, false);
        }
        finally {
            conversationFeature.dispose();
        }
    });
    test('The feature is enabled and activated in test mode', function () {
        const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
        try {
            const copilotToken = new copilotToken_1.CopilotToken({ token: 'token', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: true, copilot_plan: 'unknown' });
            setCopilotToken(accessor.get(authentication_1.IAuthenticationService), copilotToken);
            assert_1.default.deepStrictEqual(conversationFeature.enabled, true);
            assert_1.default.deepStrictEqual(conversationFeature.activated, true);
        }
        finally {
            conversationFeature.dispose();
        }
    });
    test('If the token envelope setting is set to true, the feature should be enabled', function () {
        const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
        try {
            const copilotToken = new copilotToken_1.CopilotToken({ token: 'token', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: true, copilot_plan: 'unknown' });
            setCopilotToken(accessor.get(authentication_1.IAuthenticationService), copilotToken);
            assert_1.default.deepStrictEqual(conversationFeature.enabled, true);
        }
        finally {
            conversationFeature.dispose();
        }
    });
    test('If the value returned by the token envelope is set to false, the feature is not enabled', function () {
        const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
        try {
            const copilotToken = new copilotToken_1.CopilotToken({ token: 'token', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: false, copilot_plan: 'unknown' });
            setCopilotToken(accessor.get(authentication_1.IAuthenticationService), copilotToken);
            assert_1.default.deepStrictEqual(conversationFeature.enabled, false);
        }
        finally {
            conversationFeature.dispose();
        }
    });
    test('The feature should be activated when it becomes enabled', function () {
        const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
        try {
            const copilotToken = new copilotToken_1.CopilotToken({ token: 'token', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: true, copilot_plan: 'unknown' });
            setCopilotToken(accessor.get(authentication_1.IAuthenticationService), copilotToken);
            assert_1.default.deepStrictEqual(conversationFeature.enabled, true);
            assert_1.default.deepStrictEqual(conversationFeature.activated, true);
        }
        finally {
            conversationFeature.dispose();
        }
    });
    test('The feature should listen for token changes', function () {
        const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
        try {
            const copilotToken = new copilotToken_1.CopilotToken({ token: 'token', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: true, copilot_plan: 'unknown' });
            setCopilotToken(accessor.get(authentication_1.IAuthenticationService), copilotToken);
            assert_1.default.deepStrictEqual(conversationFeature.enabled, true);
            assert_1.default.deepStrictEqual(conversationFeature.activated, true);
            const noChatCopilotToken = new copilotToken_1.CopilotToken({ token: 'token2', expires_at: 0, refresh_in: 0, username: 'fake2', isVscodeTeamMember: false, chat_enabled: false, copilot_plan: 'unknown' });
            setCopilotToken(accessor.get(authentication_1.IAuthenticationService), noChatCopilotToken);
            assert_1.default.deepStrictEqual(conversationFeature.enabled, false);
        }
        finally {
            conversationFeature.dispose();
        }
    });
    test('Feature activation should only happen once', function () {
        if (!vscode.chat.createChatParticipant) {
            this.skip();
        }
        const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
        try {
            const copilotToken = new copilotToken_1.CopilotToken({ token: 'token', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: true, copilot_plan: 'unknown' });
            const noChatCopilotToken = new copilotToken_1.CopilotToken({ token: 'token2', expires_at: 0, refresh_in: 0, username: 'fake2', isVscodeTeamMember: false, chat_enabled: false, copilot_plan: 'unknown' });
            setCopilotToken(accessor.get(authentication_1.IAuthenticationService), copilotToken);
            assert_1.default.deepStrictEqual(conversationFeature.enabled, true);
            assert_1.default.deepStrictEqual(conversationFeature.activated, true);
            setCopilotToken(accessor.get(authentication_1.IAuthenticationService), noChatCopilotToken);
            assert_1.default.deepStrictEqual(conversationFeature.enabled, false);
            assert_1.default.deepStrictEqual(conversationFeature.activated, true);
            setCopilotToken(accessor.get(authentication_1.IAuthenticationService), copilotToken);
            assert_1.default.deepStrictEqual(conversationFeature.enabled, true);
        }
        finally {
            conversationFeature.dispose();
        }
    });
    test('The feature should register a chat provider on activation', function () {
        if (!vscode.chat.createChatParticipant) {
            this.skip();
        }
        const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
        try {
            const copilotToken = new copilotToken_1.CopilotToken({ token: 'token', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: true, copilot_plan: 'unknown' });
            setCopilotToken(accessor.get(authentication_1.IAuthenticationService), copilotToken);
            assert_1.default.deepStrictEqual(conversationFeature.activated, true);
        }
        finally {
            conversationFeature.dispose();
        }
    });
});
//# sourceMappingURL=conversationFeature.test.js.map