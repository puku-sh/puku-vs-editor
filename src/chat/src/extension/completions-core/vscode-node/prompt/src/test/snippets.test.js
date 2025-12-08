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
const snippets_1 = require("../snippetInclusion/snippets");
const assert = __importStar(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
suite('Unit tests for snippet.ts', () => {
    const bogusSnippet = {
        relativePath: 'snippet1.ts',
        score: 1.0,
        startLine: 1,
        endLine: 3,
        provider: snippets_1.SnippetProviderType.Path,
        semantics: snippets_1.SnippetSemantics.Snippet,
        snippet: (0, ts_dedent_1.default) `
				A
					B
					C`,
    };
    test('announceSnippet', function () {
        assert.deepStrictEqual((0, snippets_1.announceSnippet)(bogusSnippet), {
            headline: 'Compare this snippet from snippet1.ts:',
            snippet: (0, ts_dedent_1.default) `
				A
					B
					C`,
        });
    });
});
//# sourceMappingURL=snippets.test.js.map