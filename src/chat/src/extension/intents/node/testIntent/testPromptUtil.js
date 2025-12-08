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
exports.formatRequestAndUserQuery = formatRequestAndUserQuery;
exports.relativeToWorkspace = relativeToWorkspace;
const path = __importStar(require("../../../../util/vs/base/common/path"));
function formatRequestAndUserQuery({ workspaceService, chatVariables, userQuery, testFileToWriteTo, testedSymbolIdentifier, context }) {
    const testTarget = testedSymbolIdentifier ? `\`${testedSymbolIdentifier}\`` : `my code`;
    const rewrittenMessage = chatVariables.substituteVariablesWithReferences(userQuery);
    const pathToTestFile = relativeToWorkspace(workspaceService, testFileToWriteTo.path);
    const requestAndUserQueryParts = [];
    requestAndUserQueryParts.push(`Please, generate tests for ${testTarget}.`);
    if (pathToTestFile !== null) {
        let locationMessage = `The tests will be placed in \`${pathToTestFile}\``;
        locationMessage += (pathToTestFile.includes('/')
            ? '.'
            : ` located in the same directory as \`${relativeToWorkspace(workspaceService, context.document.uri.path)}\`.`);
        requestAndUserQueryParts.push(locationMessage);
        requestAndUserQueryParts.push('Generate tests accordingly.');
    }
    requestAndUserQueryParts.push(rewrittenMessage);
    const requestAndUserQuery = requestAndUserQueryParts.filter(s => s !== '').join(' ').trim();
    return requestAndUserQuery;
}
/**
 * @return undefined if no workspace contains given path
 */
function relativeToWorkspace(workspaceService, absPath) {
    const workspaceOfTestFile = workspaceService.getWorkspaceFolders().find(folder => absPath.startsWith(folder.path));
    if (workspaceOfTestFile === undefined) {
        return null;
    }
    const relPath = path.relative(workspaceOfTestFile.path, absPath);
    // Convert the path separator to be platform-independent
    const relPathPosix = relPath.split(path.sep).join('/');
    return relPathPosix;
}
//# sourceMappingURL=testPromptUtil.js.map