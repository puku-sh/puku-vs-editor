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
const fs = __importStar(require("fs"));
require("../../src/extension/intents/node/allIntents"); // make sure all intents are registered
const commonTypes_1 = require("../../src/platform/chat/common/commonTypes");
const path_1 = require("../../src/util/vs/base/common/path");
const stest_1 = require("../base/stest");
const intentTest_1 = require("./intentTest");
(0, stest_1.ssuite)({ title: 'intent', location: 'panel' }, () => {
    runAdditionalCases((0, path_1.join)(__dirname, '../test/intent/panel-chat.json'));
    // Uncomment this line to run additional intent detection tests
    // runAdditionalCases(join(__dirname, '../test/intent/panel-chat-github.json'));
    // runAdditionalCases(join(__dirname, '../test/intent/panel-chat-unknown.json'));
});
function runAdditionalCases(sourceFile) {
    const additionalCases = JSON.parse(fs.readFileSync(sourceFile, { encoding: 'utf8' }));
    if (additionalCases && Array.isArray(additionalCases)) {
        additionalCases.forEach((testCase) => {
            if (typeof testCase === 'object' && !!testCase && testCase['Location'] === 'panel') {
                const query = testCase['Request'];
                const expectedIntent = testCase['Intent'];
                for (const strictMode of [true, false]) {
                    (0, intentTest_1.generateIntentTest)({
                        location: commonTypes_1.ChatLocation.Panel,
                        name: (strictMode ? '[strict] ' : '[relaxed] ') + `[${expectedIntent === 'github' ? 'github' : 'builtin'}] ` + query,
                        query,
                        expectedIntent: (['workspace', 'vscode', 'new', 'newNotebook', 'unknown', 'tests', 'setupTests', 'terminalExplain', 'github.copilot-dynamic.platform'].includes(expectedIntent)
                            ? (strictMode ? expectedIntent : [expectedIntent, 'unknown'])
                            : 'unknown'),
                    });
                }
            }
        });
    }
}
//# sourceMappingURL=panelChatIntent.stest.js.map