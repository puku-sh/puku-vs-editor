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
const assert = __importStar(require("assert"));
const vitest_1 = require("vitest");
const codeOrDocsSearchErrors_1 = require("../../common/codeOrDocsSearchErrors");
(0, vitest_1.suite)('Search Client Errors', () => {
    (0, vitest_1.test)('should return an instance of InaccessibleRepoOrgError when error is missingInaccessibleRepoOrg', () => {
        const error = (0, codeOrDocsSearchErrors_1.constructSearchRepoError)({
            error: "ERROR_TYPE_MISSING_INACCESSIBLE_REPO_ORG" /* SearchRepoErrorType.missingInaccessibleRepoOrg */,
            message: 'Error message',
            repo: 'microsoft/vscode'
        });
        assert.ok(error instanceof codeOrDocsSearchErrors_1.InaccessibleRepoOrgError);
    });
    (0, vitest_1.test)('should return an instance of EmbeddingsUnavailableError when error is docsEmbeddingsUnavailable', () => {
        const error = (0, codeOrDocsSearchErrors_1.constructSearchRepoError)({
            error: "ERROR_TYPE_DOCS_EMBEDDINGS_UNAVAILABLE" /* SearchRepoErrorType.docsEmbeddingsUnavailable */,
            message: 'Error message',
            repo: 'microsoft/vscode'
        });
        assert.ok(error instanceof codeOrDocsSearchErrors_1.EmbeddingsUnavailableError);
    });
    (0, vitest_1.test)('should return an instance of NotIndexedError when error is notIndexed', () => {
        const error = (0, codeOrDocsSearchErrors_1.constructSearchRepoError)({
            error: "ERROR_TYPE_NOT_INDEXED" /* SearchRepoErrorType.notIndexed */,
            message: 'Error message',
            repo: 'microsoft/vscode'
        });
        assert.ok(error instanceof codeOrDocsSearchErrors_1.NotIndexedError);
    });
    (0, vitest_1.test)('should return an instance of CodeOrDocsSearchRepoError when error is unknown', () => {
        const error = (0, codeOrDocsSearchErrors_1.constructSearchRepoError)({
            error: 'unknownERror',
            message: 'Error message',
            repo: 'microsoft/vscode'
        });
        assert.ok(error instanceof codeOrDocsSearchErrors_1.CodeOrDocsSearchRepoError);
    });
    (0, vitest_1.test)('should return an instance of MaxRetriesExceededError when error is maxRetriesExceeded', () => {
        const error = (0, codeOrDocsSearchErrors_1.constructSearchError)({
            error: "ERROR_TYPE_MAX_RETRIES_EXCEEDED" /* SearchErrorType.maxRetriesExceeded */,
            message: 'Error message',
        });
        assert.ok(error instanceof codeOrDocsSearchErrors_1.MaxRetriesExceededError);
    });
    (0, vitest_1.test)('should return an instance of NoAccessToEndpointError when error is noAccessToEndpoint', () => {
        const error = (0, codeOrDocsSearchErrors_1.constructSearchError)({
            error: "ERROR_TYPE_NO_ACCESS_TO_ENDPOINT" /* SearchErrorType.noAccessToEndpoint */,
            message: 'Error message',
        });
        assert.ok(error instanceof codeOrDocsSearchErrors_1.NoAccessToEndpointError);
    });
    (0, vitest_1.test)('should return an instance of Error when error is not any of the known error types', () => {
        const error = (0, codeOrDocsSearchErrors_1.constructSearchError)({
            error: 'unknownError',
            message: 'Error message',
        });
        assert.ok(error instanceof Error);
    });
});
//# sourceMappingURL=codeOrDocsSearchErrors.spec.js.map