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
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const Sinon = __importStar(require("sinon"));
const vscode_1 = require("vscode");
const __1 = require("..");
const copilotToken_1 = require("../../../../../../../platform/authentication/common/copilotToken");
const uuid_1 = require("../../../../../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
const connectionState_1 = require("../../../../lib/src/snippy/connectionState");
const context_1 = require("../../test/context");
function testExtensionContext() {
    return {
        subscriptions: [],
    };
}
suite('CodeReference', function () {
    let extensionContext;
    let instantiationService;
    let sub;
    setup(function () {
        const accessor = (0, context_1.createExtensionTestingContext)().createTestingAccessor();
        instantiationService = accessor.get(instantiation_1.IInstantiationService);
        extensionContext = testExtensionContext();
    });
    teardown(function () {
        extensionContext.subscriptions.forEach(sub => {
            sub.dispose();
        });
        sub?.dispose();
        connectionState_1.ConnectionState.setDisabled();
    });
    suite('subscriptions', function () {
        test('should be undefined by default', function () {
            const result = instantiationService.createInstance(__1.CodeReference);
            sub = result.subscriptions;
            assert.ok(!sub);
        });
        test('should be updated correctly when token change events received', function () {
            const codeQuote = instantiationService.createInstance(__1.CodeReference);
            const enabledToken = new copilotToken_1.CopilotToken({ token: `test token ${(0, uuid_1.generateUuid)()}`, expires_at: 0, refresh_in: 0, username: 'fixedTokenManager', isVscodeTeamMember: false, copilot_plan: 'unknown', code_quote_enabled: true });
            const disabledToken = new copilotToken_1.CopilotToken({ token: `test token ${(0, uuid_1.generateUuid)()}`, expires_at: 0, refresh_in: 0, username: 'fixedTokenManager', isVscodeTeamMember: false, copilot_plan: 'unknown', code_quote_enabled: false });
            codeQuote.onCopilotToken(enabledToken);
            assert.ok(codeQuote.enabled);
            assert.ok(codeQuote.subscriptions);
            assert.ok(codeQuote.subscriptions instanceof vscode_1.Disposable);
            const subSpy = Sinon.spy(codeQuote.subscriptions, 'dispose');
            codeQuote.onCopilotToken(disabledToken);
            assert.ok(!codeQuote.enabled);
            assert.strictEqual(codeQuote.subscriptions, undefined);
            assert.strictEqual(subSpy.calledOnce, true);
            codeQuote.onCopilotToken(enabledToken);
            assert.ok(codeQuote.enabled);
            assert.notStrictEqual(codeQuote.subscriptions, undefined);
        });
    });
});
//# sourceMappingURL=codeReferencing.test.js.map