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
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const testHelpers_1 = require("./testHelpers");
suite('NotificationSender test suite', function () {
    test('should show information message every time when called without ID', async function () {
        const notificationSender = new testHelpers_1.TestNotificationSender();
        const message = 'Operation completed successfully';
        await notificationSender.showInformationMessage(message);
        await notificationSender.showInformationMessage(message);
        const count = notificationSender.sentMessages.length;
        assert.strictEqual(count, 2, `Expected showInformationMessage to be called twice, but was called ${count} times`);
    });
    test('should return action when provided to information message', async function () {
        const notificationSender = new testHelpers_1.TestNotificationSender();
        const action = { title: 'OK' };
        notificationSender.performAction('OK');
        const result = await notificationSender.showInformationMessage('Success', action);
        assert.deepStrictEqual(result, action);
    });
    test('should return undefined when action is dismissed for information message', async function () {
        const notificationSender = new testHelpers_1.TestNotificationSender();
        notificationSender.performDismiss();
        const result = await notificationSender.showInformationMessage('Success', { title: 'OK' });
        assert.strictEqual(result, undefined);
    });
    test('should show request message and return action', async function () {
        const notificationSender = new testHelpers_1.TestNotificationSender();
        const action = { title: 'Yes' };
        notificationSender.performAction('Yes');
        const result = await notificationSender.showInformationModal('Are you sure?', action, { title: 'No' });
        assert.deepStrictEqual(result, action);
        assert.strictEqual(notificationSender.sentMessages.length, 1);
        assert.strictEqual(notificationSender.sentMessages[0], 'Are you sure?');
    });
    test('should return undefined when request is dismissed', async function () {
        const notificationSender = new testHelpers_1.TestNotificationSender();
        notificationSender.performDismiss();
        const result = await notificationSender.showInformationModal('Are you sure?', { title: 'Yes' });
        assert.strictEqual(result, undefined);
    });
    test('should handle request without actions', async function () {
        const notificationSender = new testHelpers_1.TestNotificationSender();
        const result = await notificationSender.showInformationModal('Just showing info');
        assert.strictEqual(result, undefined);
        assert.strictEqual(notificationSender.sentMessages.length, 1);
        assert.strictEqual(notificationSender.sentMessages[0], 'Just showing info');
    });
});
//# sourceMappingURL=notificationSender.test.js.map