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
exports.TestLogTarget = void 0;
const util = __importStar(require("node:util"));
const logger_1 = require("../logger");
class TestLogTarget {
    constructor() {
        this._messages = [];
    }
    logIt(level, category, ...extra) {
        this._messages.push({ level, category: category, extra });
    }
    hasMessage(level, ...extra) {
        return this._messages.some(m => m.level === level &&
            m.extra.length === extra.length &&
            m.extra
                .filter(e => !(e instanceof Error))
                .every((e, i) => {
                return util.isDeepStrictEqual(e, extra[i]);
            }));
    }
    assertHasMessage(level, ...extra) {
        if (!this.hasMessage(level, ...extra)) {
            throw new Error(`Expected message not found: ${logger_1.LogLevel[level]} ${JSON.stringify(extra)}. Actual messages: ${this._messages
                .map(m => '\n- ' + logger_1.LogLevel[m.level] + ': ' + JSON.stringify(m.extra))
                .join('')}`);
        }
    }
    /**
     * Checks for a logged message matching a given regex. Emulates
     * OutputChannelLog for conversion of log message to string.
     */
    hasMessageMatching(level, test) {
        return this._messages.some(m => m.level === level && test.test(`[${m.category}] ${m.extra.map(toPlainText).join(',')}`));
    }
    assertHasMessageMatching(level, test) {
        if (!this.hasMessageMatching(level, test)) {
            throw new Error(`Expected message not found: ${logger_1.LogLevel[level]} ${test}. Actual messages: ${this._messages
                .map(m => '\n- ' + logger_1.LogLevel[m.level] + ': ' + JSON.stringify(m.extra))
                .join('')}`);
        }
    }
    get messageCount() {
        return this._messages.length;
    }
    isEmpty() {
        return this._messages.length === 0;
    }
}
exports.TestLogTarget = TestLogTarget;
function toPlainText(x) {
    switch (typeof x) {
        case 'object':
            return util.inspect(x);
        default:
            return String(x);
    }
}
//# sourceMappingURL=loggerHelpers.js.map