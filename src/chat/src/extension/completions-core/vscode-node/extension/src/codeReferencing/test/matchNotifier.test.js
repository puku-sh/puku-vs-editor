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
const sinon_1 = __importDefault(require("sinon"));
const vscode_1 = require("vscode");
const extensionContext_1 = require("../../../../../../../platform/extContext/common/extensionContext");
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
const notificationSender_1 = require("../../../../lib/src/notificationSender");
const constants_1 = require("../../../../lib/src/snippy/constants");
const telemetry_1 = require("../../../../lib/src/test/telemetry");
const context_1 = require("../../test/context");
const matchNotifier_1 = require("../matchNotifier");
suite('.match', function () {
    let accessor;
    setup(function () {
        accessor = (0, context_1.createExtensionTestingContext)().createTestingAccessor();
    });
    test('populates the globalState object', async function () {
        const extensionContext = accessor.get(extensionContext_1.IVSCodeExtensionContext);
        const globalState = extensionContext.globalState;
        await (0, matchNotifier_1.notify)(accessor);
        assert.ok(globalState.get('codeReference.notified'));
    });
    test('notifies the user', async function () {
        const testNotificationSender = accessor.get(notificationSender_1.ICompletionsNotificationSender);
        testNotificationSender.performAction('View reference');
        await (0, matchNotifier_1.notify)(accessor);
        assert.strictEqual(testNotificationSender.sentMessages.length, 1);
    });
    test('sends a telemetry event on view reference action', async function () {
        const testNotificationSender = accessor.get(notificationSender_1.ICompletionsNotificationSender);
        testNotificationSender.performAction('View reference');
        const telemetry = await (0, telemetry_1.withInMemoryTelemetry)(accessor, async (accessor) => {
            await (0, matchNotifier_1.notify)(accessor);
        });
        assert.strictEqual(telemetry.reporter.events.length, 1);
        assert.strictEqual(telemetry.reporter.events[0].name, 'code_referencing.match_notification.acknowledge.count');
    });
    test('executes the output panel display command on view reference action', async function () {
        const spy = sinon_1.default.spy(vscode_1.commands, 'executeCommand');
        const testNotificationSender = accessor.get(notificationSender_1.ICompletionsNotificationSender);
        testNotificationSender.performAction('View reference');
        await (0, matchNotifier_1.notify)(accessor);
        await testNotificationSender.waitForMessages();
        assert.ok(spy.calledOnce);
        assert.ok(spy.calledWith(constants_1.OutputPaneShowCommand));
        spy.restore();
    });
    test('opens the settings page on change setting action', async function () {
        const stub = sinon_1.default.stub(vscode_1.env, 'openExternal');
        const testNotificationSender = accessor.get(notificationSender_1.ICompletionsNotificationSender);
        testNotificationSender.performAction('Change setting');
        await (0, matchNotifier_1.notify)(accessor);
        await testNotificationSender.waitForMessages();
        assert.ok(stub.calledOnce);
        assert.ok(stub.calledWith(sinon_1.default.match({
            scheme: 'https',
            authority: 'aka.ms',
            path: '/github-copilot-settings',
        })));
        stub.restore();
    });
    test('sends a telemetry event on notification dismissal', async function () {
        const testNotificationSender = accessor.get(notificationSender_1.ICompletionsNotificationSender);
        testNotificationSender.performDismiss();
        const telemetry = await (0, telemetry_1.withInMemoryTelemetry)(accessor, async (accessor) => {
            await (0, matchNotifier_1.notify)(accessor);
        });
        await testNotificationSender.waitForMessages();
        assert.strictEqual(telemetry.reporter.events.length, 1);
        assert.strictEqual(telemetry.reporter.events[0].name, 'code_referencing.match_notification.ignore.count');
    });
    test('does not notify if already notified', async function () {
        const extensionContext = accessor.get(extensionContext_1.IVSCodeExtensionContext);
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const globalState = extensionContext.globalState;
        const testNotificationSender = accessor.get(notificationSender_1.ICompletionsNotificationSender);
        testNotificationSender.performAction('View reference');
        await globalState.update('codeReference.notified', true);
        await instantiationService.invokeFunction(matchNotifier_1.notify);
        await testNotificationSender.waitForMessages();
        assert.strictEqual(testNotificationSender.sentMessages.length, 0);
    });
});
//# sourceMappingURL=matchNotifier.test.js.map