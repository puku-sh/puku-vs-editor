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
const vscode = __importStar(require("vscode"));
const nullEnvService_1 = require("../../../../platform/env/common/nullEnvService");
const linkifiedText_1 = require("../../common/linkifiedText");
const linkifyService_1 = require("../../common/linkifyService");
const symbolLinkifier_1 = require("../../vscode-node/symbolLinkifier");
const util_1 = require("../node/util");
function createTestLinkifierService(...listOfFiles) {
    const fs = (0, util_1.createMockFsService)(listOfFiles);
    const workspaceService = (0, util_1.createMockWorkspaceService)();
    const linkifier = new linkifyService_1.LinkifyService(fs, workspaceService, nullEnvService_1.NullEnvService.Instance);
    linkifier.registerGlobalLinkifier({ create: () => new symbolLinkifier_1.SymbolLinkifier(fs, workspaceService) });
    return linkifier;
}
suite('Symbol Linkify', () => {
    test(`Should create symbol links from Markdown links`, async () => {
        const linkifier = createTestLinkifierService('file.ts', 'src/file.ts');
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[`symbol`](file.ts) [`symbol`](src/file.ts)')).parts, [
            new linkifiedText_1.LinkifySymbolAnchor({
                name: 'symbol',
                containerName: '',
                kind: vscode.SymbolKind.Constant,
                location: new vscode.Location((0, util_1.workspaceFile)('file.ts'), new vscode.Position(0, 0))
            }),
            ' ',
            new linkifiedText_1.LinkifySymbolAnchor({
                name: 'symbol',
                containerName: '',
                kind: vscode.SymbolKind.Constant,
                location: new vscode.Location((0, util_1.workspaceFile)('src/file.ts'), new vscode.Position(0, 0))
            })
        ]);
    });
    test(`Should de-linkify symbol links to files that don't exist`, async () => {
        const linkifier = createTestLinkifierService();
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[`symbol`](file.ts) [`symbol`](src/file.ts)')).parts, [
            '`symbol` `symbol`'
        ]);
    });
    test(`Should create symbol links for symbols containing $ or _`, async () => {
        const linkifier = createTestLinkifierService('file.ts', 'src/file.ts');
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[`_symbol`](file.ts) [`$symbol`](src/file.ts)')).parts, [
            new linkifiedText_1.LinkifySymbolAnchor({
                name: '_symbol',
                containerName: '',
                kind: vscode.SymbolKind.Constant,
                location: new vscode.Location((0, util_1.workspaceFile)('file.ts'), new vscode.Position(0, 0))
            }),
            ' ',
            new linkifiedText_1.LinkifySymbolAnchor({
                name: '$symbol',
                containerName: '',
                kind: vscode.SymbolKind.Constant,
                location: new vscode.Location((0, util_1.workspaceFile)('src/file.ts'), new vscode.Position(0, 0))
            })
        ]);
    });
    test(`Should create symbol links for symbols with function call or generic syntax`, async () => {
        const linkifier = createTestLinkifierService('file.ts', 'src/file.ts');
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[`symbol<T>`](file.ts) [`func()`](src/file.ts)')).parts, [
            new linkifiedText_1.LinkifySymbolAnchor({
                name: 'symbol<T>',
                containerName: '',
                kind: vscode.SymbolKind.Constant,
                location: new vscode.Location((0, util_1.workspaceFile)('file.ts'), new vscode.Position(0, 0))
            }),
            ' ',
            new linkifiedText_1.LinkifySymbolAnchor({
                name: 'func()',
                containerName: '',
                kind: vscode.SymbolKind.Constant,
                location: new vscode.Location((0, util_1.workspaceFile)('src/file.ts'), new vscode.Position(0, 0))
            })
        ]);
    });
    test(`Should support files with spaces`, async () => {
        const linkifier = createTestLinkifierService('space file.ts');
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[`symbol`](space%20file.ts) [`symbol`](space%20file.ts)')).parts, [
            new linkifiedText_1.LinkifySymbolAnchor({
                name: 'symbol',
                containerName: '',
                kind: vscode.SymbolKind.Constant,
                location: new vscode.Location((0, util_1.workspaceFile)('space file.ts'), new vscode.Position(0, 0))
            }),
            ' ',
            new linkifiedText_1.LinkifySymbolAnchor({
                name: 'symbol',
                containerName: '',
                kind: vscode.SymbolKind.Constant,
                location: new vscode.Location((0, util_1.workspaceFile)('space file.ts'), new vscode.Position(0, 0))
            })
        ]);
    });
});
//# sourceMappingURL=symbolLinkifier.test.js.map