"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestLogTarget = void 0;
const logService_1 = require("../../common/logService");
class TestLogTarget {
    constructor() {
        this._messages = [];
    }
    logIt(level, messageString) {
        this._messages.push({ level, message: messageString });
    }
    hasMessage(level, message) {
        return this._messages.some(m => m.level === level && m.message === message);
    }
    assertHasMessage(level, message) {
        if (!this.hasMessage(level, message)) {
            throw new Error(`Expected message not found: ${logService_1.LogLevel[level]} ${JSON.stringify(message)}. Actual messages: ${this._messages
                .map(m => '\n- ' + logService_1.LogLevel[m.level] + ': ' + JSON.stringify(m.message))
                .join('')}`);
        }
    }
    /**
     * Checks for a logged message matching a given regex. Emulates
     * OutputChannelLog for conversion of log message to string.
     */
    hasMessageMatching(level, test) {
        return this._messages.some(m => m.level === level && test.test(m.message));
    }
    isEmpty() {
        return this._messages.length === 0;
    }
}
exports.TestLogTarget = TestLogTarget;
//# sourceMappingURL=loggerHelpers.js.map