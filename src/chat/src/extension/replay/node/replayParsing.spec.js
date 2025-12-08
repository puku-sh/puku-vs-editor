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
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const vitest_1 = require("vitest");
const replayParser_1 = require("./replayParser");
(0, vitest_1.suite)('replay file parsing', function () {
    (0, vitest_1.test)('full parsing example', async function () {
        const content = fs.readFileSync(path.join(__dirname, 'spec.chatreplay.json'), 'utf8');
        const parsed = (0, replayParser_1.parseReplay)(content);
        assert_1.default.strictEqual(parsed.length, 9, 'should have 9 steps');
        assert_1.default.strictEqual(parsed[0].kind, 'userQuery', 'should start with userQuery');
        parsed.forEach(step => {
            (0, assert_1.default)(step.line > 0, 'should have line value assigned to each step');
        });
    });
});
//# sourceMappingURL=replayParsing.spec.js.map