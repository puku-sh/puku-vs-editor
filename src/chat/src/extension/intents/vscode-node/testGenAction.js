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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateTests = void 0;
const vscode = __importStar(require("vscode"));
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const parserService_1 = require("../../../platform/parser/node/parserService");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const testFiles_1 = require("../../prompt/node/testFiles");
const testInfoStorage_1 = require("../node/testIntent/testInfoStorage");
let GenerateTests = class GenerateTests {
    constructor(instaService, parserService, testGenInfoStorage, tabsAndEditorsService, ignoreService) {
        this.instaService = instaService;
        this.parserService = parserService;
        this.testGenInfoStorage = testGenInfoStorage;
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.ignoreService = ignoreService;
    }
    async runCommand(context) {
        let srcFile;
        let selection;
        if (context) {
            srcFile = textDocumentSnapshot_1.TextDocumentSnapshot.create(context.document);
            selection = context.selection;
        }
        else {
            const initialActiveEditor = vscode.window.activeTextEditor;
            if (initialActiveEditor === undefined) {
                return;
            }
            srcFile = textDocumentSnapshot_1.TextDocumentSnapshot.create(initialActiveEditor.document);
            selection = initialActiveEditor.selection;
        }
        if ((0, testFiles_1.isTestFile)(srcFile.uri)) {
            return vscode.commands.executeCommand('vscode.editorChat.start', {
                message: `/${"tests" /* Intent.Tests */} `,
                autoSend: true,
                initialRange: selection
            });
        }
        else {
            // identify the range for the symbol to test
            const testableNode = await this.identifyTestableNode(srcFile, selection);
            this.updateTestGenInfo(srcFile, testableNode, selection);
            // identify the file to write tests at -- either existing one or a new untitled one
            const testFile = await this.findOrCreateTestFile(srcFile);
            const testDoc = await vscode.workspace.openTextDocument(testFile);
            // identify where in the test file to insert the tests at
            const insertTestsAt = await this.determineTestInsertPosition(testDoc);
            const testEditor = await vscode.window.showTextDocument(testDoc, this.getTabGroupByUri(testFile));
            testEditor.selection = new vscode.Selection(insertTestsAt.start, insertTestsAt.end);
            testEditor.revealRange(insertTestsAt, vscode.TextEditorRevealType.InCenter);
            const isDocEmpty = insertTestsAt.end.line === 0 && insertTestsAt.end.character === 0;
            if (!isDocEmpty) {
                await testEditor.edit(editBuilder => {
                    editBuilder.insert(insertTestsAt.start, '\n\n');
                });
            }
            return vscode.commands.executeCommand('vscode.editorChat.start', {
                message: `/${"tests" /* Intent.Tests */}`,
                autoSend: true,
            });
        }
    }
    async determineTestInsertPosition(testDoc) {
        const testFileAST = this.parserService.getTreeSitterAST(testDoc);
        const lastTest = testFileAST ? await testFileAST.findLastTest() : null;
        let insertTestsAt;
        if (lastTest === null) {
            const lastLine = testDoc.lineAt(testDoc.lineCount - 1);
            insertTestsAt = new vscode.Range(lastLine.range.end, lastLine.range.end);
        }
        else {
            const lastTestEndPos = testDoc.positionAt(lastTest.endIndex);
            const endOfLastLine = testDoc.lineAt(lastTestEndPos).range.end;
            insertTestsAt = new vscode.Range(endOfLastLine, endOfLastLine);
        }
        return insertTestsAt;
    }
    updateTestGenInfo(srcFile, testableNode, selection) {
        this.testGenInfoStorage.sourceFileToTest = {
            uri: srcFile.uri,
            target: testableNode?.range ?? selection,
            identifier: testableNode?.identifier,
        };
    }
    async identifyTestableNode(srcFile, selection) {
        const srcFileAST = this.parserService.getTreeSitterAST(srcFile);
        if (!srcFileAST) {
            return null;
        }
        const testableNode = await srcFileAST.getTestableNode({
            startIndex: srcFile.offsetAt(selection.start),
            endIndex: srcFile.offsetAt(selection.end),
        });
        if (!testableNode) {
            return null;
        }
        const { startIndex, endIndex } = testableNode.node;
        const testedSymbolRange = new vscode.Range(srcFile.positionAt(startIndex), srcFile.positionAt(endIndex));
        return {
            identifier: testableNode.identifier.name,
            range: testedSymbolRange
        };
    }
    async findOrCreateTestFile(srcFile) {
        const finder = this.instaService.createInstance(testFiles_1.TestFileFinder);
        let testFile = await finder.findTestFileForSourceFile(srcFile, cancellation_1.CancellationToken.None);
        if (testFile !== undefined && await this.ignoreService.isCopilotIgnored(testFile)) {
            testFile = undefined;
        }
        if (testFile === undefined) {
            testFile = (0, testFiles_1.suggestUntitledTestFileLocation)(srcFile);
        }
        return testFile;
    }
    getTabGroupByUri(uri) {
        for (const tab of this.tabsAndEditorsService.tabs) {
            if (tab.uri?.toString() === uri.toString()) {
                return tab.tab.group.viewColumn;
            }
        }
        const currentTab = this.tabsAndEditorsService.activeTextEditor?.viewColumn;
        if (currentTab === undefined) {
            return vscode.ViewColumn.Two;
        }
        else {
            return currentTab > vscode.ViewColumn.One ? currentTab - 1 : vscode.ViewColumn.Beside;
        }
    }
};
exports.GenerateTests = GenerateTests;
exports.GenerateTests = GenerateTests = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, parserService_1.IParserService),
    __param(2, testInfoStorage_1.ITestGenInfoStorage),
    __param(3, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(4, ignoreService_1.IIgnoreService)
], GenerateTests);
//# sourceMappingURL=testGenAction.js.map