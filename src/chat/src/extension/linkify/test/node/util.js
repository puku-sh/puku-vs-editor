"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceFile = workspaceFile;
exports.createMockFsService = createMockFsService;
exports.createMockWorkspaceService = createMockWorkspaceService;
exports.createTestLinkifierService = createTestLinkifierService;
exports.linkify = linkify;
exports.assertPartsEqual = assertPartsEqual;
const assert_1 = __importDefault(require("assert"));
const nullEnvService_1 = require("../../../../platform/env/common/nullEnvService");
const fileTypes_1 = require("../../../../platform/filesystem/common/fileTypes");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const uri_1 = require("../../../../util/vs/base/common/uri");
const linkifiedText_1 = require("../../common/linkifiedText");
const linkifyService_1 = require("../../common/linkifyService");
const workspace = uri_1.URI.file('/workspace');
function workspaceFile(path) {
    return uri_1.URI.joinPath(workspace, path);
}
function createMockFsService(listOfFiles) {
    const workspaceFiles = listOfFiles.map(f => uri_1.URI.isUri(f) ? f : workspaceFile(f));
    return new class {
        async stat(path) {
            if (path.path === '/' || path.path === workspace.path) {
                return { ctime: 0, mtime: 0, size: 0, type: fileTypes_1.FileType.File };
            }
            const entry = workspaceFiles.find(f => f.toString() === path.toString() || f.toString() === path.toString() + '/');
            if (!entry) {
                throw new Error(`File not found: ${path}`);
            }
            return { ctime: 0, mtime: 0, size: 0, type: fileTypes_1.FileType.File };
        }
    };
}
function createMockWorkspaceService() {
    return new class {
        getWorkspaceFolders() {
            return [workspace];
        }
    };
}
function createTestLinkifierService(...listOfFiles) {
    return new linkifyService_1.LinkifyService(createMockFsService(listOfFiles), createMockWorkspaceService(), nullEnvService_1.NullEnvService.Instance);
}
async function linkify(linkifer, text) {
    const linkifier = linkifer.createLinkifier({ requestId: undefined, references: [] }, []);
    const initial = await linkifier.append(text, cancellation_1.CancellationToken.None);
    const flushed = await linkifier.flush(cancellation_1.CancellationToken.None);
    if (!flushed) {
        return initial;
    }
    return {
        parts: (0, linkifiedText_1.coalesceParts)(initial.parts.concat(flushed.parts)),
    };
}
function assertPartsEqual(actualParts, expectedParts) {
    assert_1.default.strictEqual(actualParts.length, expectedParts.length, `got ${JSON.stringify(actualParts)}`);
    for (let i = 0; i < actualParts.length; i++) {
        const actual = actualParts[i];
        const expected = expectedParts[i];
        if (typeof actual === 'string') {
            assert_1.default.strictEqual(actual, expected);
        }
        else if (actual instanceof linkifiedText_1.LinkifyLocationAnchor) {
            (0, assert_1.default)(expected instanceof linkifiedText_1.LinkifyLocationAnchor, "Expected LinkifyLocationAnchor");
            assert_1.default.strictEqual(actual.value.toString(), expected.value.toString());
        }
        else {
            (0, assert_1.default)(actual instanceof linkifiedText_1.LinkifySymbolAnchor);
            (0, assert_1.default)(expected instanceof linkifiedText_1.LinkifySymbolAnchor, "Expected LinkifySymbolAnchor");
            assert_1.default.strictEqual(actual.symbolInformation.name, expected.symbolInformation.name);
        }
    }
}
//# sourceMappingURL=util.js.map