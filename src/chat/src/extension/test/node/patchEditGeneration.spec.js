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
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const path = __importStar(require("../../../util/vs/base/common/path"));
const uri_1 = require("../../../util/vs/base/common/uri");
const editGeneration_1 = require("../../prompt/node/editGeneration");
const intents_1 = require("../../prompt/node/intents");
const codeMapper_1 = require("../../prompts/node/codeMapper/codeMapper");
const patchEditGeneration_1 = require("../../prompts/node/codeMapper/patchEditGeneration");
const fixturesRootFolder = path.join(__dirname, './fixtures/patch');
(0, vitest_1.suite)('PatchEditGeneration - sync', function () {
    const entries = (0, fs_1.readdirSync)(fixturesRootFolder);
    for (const entry of entries) {
        const fixturesFolder = path.join(fixturesRootFolder, entry);
        createTestsFromFixtures(fixturesFolder, (data) => {
            const replyProcessor = (0, patchEditGeneration_1.getPatchEditReplyProcessor)(new promptPathRepresentationService_1.PromptPathRepresentationService());
            const res = replyProcessor.process(data.patch, data.original);
            const actual = (0, intents_1.applyEdits)(data.original, res.edits);
            (0, assert_1.deepStrictEqual)(editGeneration_1.Lines.fromString(actual), editGeneration_1.Lines.fromString(data.expected));
        });
    }
});
(0, vitest_1.suite)('PatchEditGeneration - async', function () {
    const entries = (0, fs_1.readdirSync)(fixturesRootFolder);
    for (const entry of entries) {
        const fixturesFolder = path.join(fixturesRootFolder, entry);
        createTestsFromFixtures(fixturesFolder, async (data) => {
            const input = new chatMLFetcher_1.FetchStreamSource();
            input.update(data.patch, { text: data.patch });
            let actual = data.original;
            const outputCollector = {
                textEdit(_target, edits) {
                    actual = (0, intents_1.applyEdits)(actual, Array.isArray(edits) ? edits : [edits]);
                },
                notebookEdit() {
                    throw new Error('Unexpected notebook edit');
                }
            };
            const promise = (0, codeMapper_1.processPatchResponse)(uri_1.URI.parse('test://foo/bar'), data.original, input.stream, outputCollector, cancellation_1.CancellationToken.None);
            input.resolve();
            await promise;
            (0, assert_1.deepStrictEqual)(editGeneration_1.Lines.fromString(actual), editGeneration_1.Lines.fromString(data.expected));
        });
    }
});
function createTestsFromFixtures(fixturesFolder, runTest) {
    const entries = (0, fs_1.readdirSync)(fixturesFolder);
    const testsData = new Map();
    for (const entry of entries) {
        const match = entry.match(/^([^.]+)\.([^.]+)\.(txt|bin)$/);
        if (match) {
            const [, testName, inputName] = match;
            const content = fs_1.promises.readFile(path.join(fixturesFolder, entry), 'utf8');
            let data = testsData.get(testName);
            if (!data) {
                data = {};
                testsData.set(testName, data);
            }
            data[inputName] = content;
        }
    }
    for (const testName of testsData.keys()) {
        (0, vitest_1.test)(testName, async () => {
            const dataWithPromises = testsData.get(testName);
            const data = {};
            for (const key in dataWithPromises) {
                data[key] = await dataWithPromises[key];
            }
            runTest(data);
        });
    }
}
//# sourceMappingURL=patchEditGeneration.spec.js.map