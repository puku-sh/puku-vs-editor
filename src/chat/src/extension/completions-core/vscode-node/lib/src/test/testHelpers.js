"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestNotificationSender = void 0;
exports.positionToString = positionToString;
exports.rangeToString = rangeToString;
exports.restoreEnvAfterTest = restoreEnvAfterTest;
function positionToString(p) {
    return `${p.line}:${p.character}`;
}
function rangeToString(r) {
    return `[${positionToString(r.start)}--${positionToString(r.end)}]`;
}
function restoreEnvAfterTest() {
    const origEnv = { ...process.env };
    teardown(function () {
        // remove any keys that were added
        for (const key of Object.keys(process.env)) {
            if (!(key in origEnv)) {
                delete process.env[key];
            }
        }
        // restore the original values
        for (const key of Object.keys(origEnv)) {
            process.env[key] = origEnv[key];
        }
    });
}
class TestNotificationSender {
    constructor() {
        this.sentMessages = [];
        this.warningPromises = [];
        this.informationPromises = [];
    }
    performDismiss() {
        this.actionToPerform = 'DISMISS';
    }
    performAction(title) {
        this.actionToPerform = title;
    }
    showWarningMessage(message, ...actions) {
        this.sentMessages.push(message);
        let warningPromise;
        if (this.actionToPerform) {
            if (this.actionToPerform === 'DISMISS') {
                warningPromise = Promise.resolve(undefined);
            }
            else {
                const action = actions.find(a => a.title === this.actionToPerform);
                warningPromise = action ? Promise.resolve(action) : Promise.resolve(undefined);
            }
        }
        else {
            // If not set, default to the first action
            warningPromise = actions ? Promise.resolve(actions[0]) : Promise.resolve(undefined);
        }
        this.warningPromises.push(warningPromise);
        return warningPromise;
    }
    showInformationMessage(message, ...actions) {
        this.sentMessages.push(message);
        let informationPromise;
        if (this.actionToPerform) {
            if (this.actionToPerform === 'DISMISS') {
                informationPromise = Promise.resolve(undefined);
            }
            else {
                const action = actions.find(a => a.title === this.actionToPerform);
                informationPromise = action ? Promise.resolve(action) : Promise.resolve(undefined);
            }
        }
        else {
            // If not set, default to the first action
            informationPromise = actions ? Promise.resolve(actions[0]) : Promise.resolve(undefined);
        }
        this.informationPromises.push(informationPromise);
        return informationPromise;
    }
    showInformationModal(message, ...actions) {
        return this.showInformationMessage(message, ...actions);
    }
    async waitForMessages() {
        await Promise.all(this.warningPromises);
        await Promise.all(this.informationPromises);
    }
}
exports.TestNotificationSender = TestNotificationSender;
//# sourceMappingURL=testHelpers.js.map