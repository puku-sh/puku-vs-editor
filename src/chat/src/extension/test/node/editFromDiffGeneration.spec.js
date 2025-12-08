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
const assert_1 = require("assert");
const fs_1 = require("fs");
const vitest_1 = require("vitest");
const path = __importStar(require("../../../util/vs/base/common/path"));
const editFromDiffGeneration_1 = require("../../prompt/node/editFromDiffGeneration");
const editGeneration_1 = require("../../prompt/node/editGeneration");
const intents_1 = require("../../prompt/node/intents");
(0, vitest_1.suite)('Real Diff Apply', function () {
    createTestsFromFixtures(path.join(__dirname, './fixtures/gitdiff'), (original, diff, expected, messages) => {
        const reporter = new ReporterImpl();
        const linesEdits = (0, editFromDiffGeneration_1.createEditsFromRealDiff)(editGeneration_1.Lines.fromString(original), editGeneration_1.Lines.fromString(diff), reporter);
        const actual = (0, intents_1.applyEdits)(original, linesEdits.map(e => e.toTextEdit()));
        (0, assert_1.deepStrictEqual)(editGeneration_1.Lines.fromString(actual), editGeneration_1.Lines.fromString(expected));
        (0, assert_1.deepStrictEqual)(reporter.messages, messages);
        (0, assert_1.deepStrictEqual)(reporter.recovered, []);
    });
});
(0, vitest_1.suite)('Pseudo Diff Apply', function () {
    createTestsFromFixtures(path.join(__dirname, './fixtures/pseudodiff'), (original, diff, expected, messages) => {
        const reporter = new ReporterImpl();
        const linesEdits = (0, editFromDiffGeneration_1.createEditsFromPseudoDiff)(editGeneration_1.Lines.fromString(original), editGeneration_1.Lines.fromString(diff), reporter);
        const actual = (0, intents_1.applyEdits)(original, linesEdits.map(e => e.toTextEdit()));
        (0, assert_1.deepStrictEqual)(editGeneration_1.Lines.fromString(actual), editGeneration_1.Lines.fromString(expected));
        (0, assert_1.deepStrictEqual)(reporter.messages, messages);
    });
});
class ReporterImpl {
    constructor() {
        this.recovered = [];
        this.messages = [];
    }
    recovery(originalLine, newLine) {
        this.recovered.push([originalLine, newLine]);
    }
    warning(message) {
        this.messages.push(message);
    }
}
function createTestsFromFixtures(testDir, runTest) {
    const entries = (0, fs_1.readdirSync)(testDir);
    for (const entry of entries) {
        const match = entry.match(/^(\d\d-\w+)-([^.]+)$/);
        if (match) {
            (0, vitest_1.test)(`${match[1]} - ${match[2].replace(/_/g, ' ')}`, async () => {
                const expected = await fs_1.promises.readFile(path.join(testDir, entry), 'utf8');
                const diff = await fs_1.promises.readFile(path.join(testDir, `${entry}.diff`), 'utf8');
                const original = await fs_1.promises.readFile(path.join(testDir, match[1]), 'utf8');
                let messages = [];
                try {
                    messages = JSON.parse(await fs_1.promises.readFile(path.join(testDir, `${entry}.messages`), 'utf8'));
                }
                catch (e) {
                    // ignore
                }
                runTest(original, diff, expected, messages);
            });
        }
    }
}
//# sourceMappingURL=editFromDiffGeneration.spec.js.map