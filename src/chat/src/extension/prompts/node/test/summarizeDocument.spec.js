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
const fs = __importStar(require("fs/promises"));
const vitest_1 = require("vitest");
const path = __importStar(require("../../../../util/vs/base/common/path"));
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const implementation_1 = require("../inline/summarizedDocument/implementation");
const fileVariable_1 = require("../panel/fileVariable");
const utils_1 = require("./utils");
(0, vitest_1.describe)('createSummarizedDocument[visualizable]', () => {
    (0, vitest_1.test)('[tsx] can summarize public fields', async () => {
        const filename = 'simpleClass.tsx';
        const result = await (0, utils_1.generateSummarizedDocument)((0, utils_1.fromFixtureOld)(filename, 'typescriptreact'), [9, 0], 1, { alwaysUseEllipsisForElisions: true });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
    });
    (0, vitest_1.test)('[cpp] CppNoExtraSemicolons', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('cppNoExtraSemicolons.cpp'), languageId: 'cpp' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, [50, 0], 628, { alwaysUseEllipsisForElisions: true });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file));
    });
    (0, vitest_1.test)('[cpp] Do not throw invalid range error', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('problem1.cpp'), languageId: 'cpp' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, [17, 10], 10, { alwaysUseEllipsisForElisions: true });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file));
    });
    (0, vitest_1.test)('[cpp] Do not throw invalid range error - 2', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('problem2.cpp'), languageId: 'cpp' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, [6, 19], 100, { alwaysUseEllipsisForElisions: true });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file));
    });
    (0, vitest_1.test)('should include nearby code - strings.test.ts', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('strings.test-example.ts'), languageId: 'typescript' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, [344, 0]);
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file));
    });
    (0, vitest_1.test)('should include nearby code - strings.test.ts - SummarizedDocumentLineNumberStyle.OmittedRanges', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('strings.test-example.ts'), languageId: 'typescript' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, [344, 0], undefined, { lineNumberStyle: implementation_1.SummarizedDocumentLineNumberStyle.OmittedRanges });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file, '2'));
    });
    (0, vitest_1.test)('should include nearby code - strings.test.ts - SummarizedDocumentLineNumberStyle.Full', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('strings.test-example.ts'), languageId: 'typescript' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, [344, 0], undefined, { lineNumberStyle: implementation_1.SummarizedDocumentLineNumberStyle.Full });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file, '3'));
    });
    (0, vitest_1.test)('should include whitespace touching the selection - codeEditorWidget.ts', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('codeEditorWidget.ts'), languageId: 'typescript' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, [1085, 2, 1089, 3]);
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file, '1'));
    });
    (0, vitest_1.test)('should not select parent node when the selection contains children but starts/ends in whitespace - codeEditorWidget.ts', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('codeEditorWidget.ts'), languageId: 'typescript' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, [211, 0, 213, 0]);
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file, '2'));
    });
    (0, vitest_1.test)('no selection - codeEditorWidget.ts', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('codeEditorWidget.ts'), languageId: 'typescript' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, undefined, utils_1.DEFAULT_CHAR_LIMIT, {
            costFnOverride: fileVariable_1.fileVariableCostFn,
        });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file, '3'));
    });
    (0, vitest_1.test)('should select at least one node - codeEditorWidget.ts', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('editorGroupWatermark.ts'), languageId: 'typescript' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, [24, 0]);
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file));
    });
    (0, vitest_1.test)('issue #6614: Should include ... only once when eliding code', async () => {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('view.css'), languageId: 'css' });
        const result = await (0, utils_1.generateSummarizedDocument)(file, [225, 0, 237, 15], 0, { alwaysUseEllipsisForElisions: false });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file));
    });
    (0, vitest_1.test)('should expand selection end to closing brace - extHost.api.impl.ts', async () => {
        const filename = 'extHost.api.impl.ts';
        const [otherCode, selectedCode] = await (0, utils_1.generateSummarizedDocumentAndExtractGoodSelection)((0, utils_1.fromFixtureOld)(filename, 'typescript'), [696, 0, 711, 0]);
        await (0, vitest_1.expect)(otherCode).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
        await (0, vitest_1.expect)(selectedCode).toMatchFileSnapshot((0, utils_1.selectionDocPathInFixture)(filename));
    });
    (0, vitest_1.test)('should expand selection when it sits on identifier - webview/index.ts', async () => {
        const filename = 'webview-index.ts';
        const [otherCode, selectedCode] = await (0, utils_1.generateSummarizedDocumentAndExtractGoodSelection)((0, utils_1.fromFixtureOld)(filename, 'typescript'), [47, 14]);
        await (0, vitest_1.expect)(otherCode).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
        await (0, vitest_1.expect)(selectedCode).toMatchFileSnapshot((0, utils_1.selectionDocPathInFixture)(filename));
    });
    (0, vitest_1.test)('should not expand selection to the left in whitespace - pullRequestModel.ts', async () => {
        const filename = 'pullRequestModel.ts';
        const [otherCode, selectedCode] = await (0, utils_1.generateSummarizedDocumentAndExtractGoodSelection)((0, utils_1.fromFixtureOld)(filename, 'typescript'), [1071, 0]);
        await (0, vitest_1.expect)(otherCode).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
        await (0, vitest_1.expect)(selectedCode).toMatchFileSnapshot((0, utils_1.selectionDocPathInFixture)(filename));
    });
    (0, vitest_1.test)('should not expand selection to select whitespace - keybindingParser.ts', async () => {
        const filename = 'keybindingParser.ts';
        const [otherCode, selectedCode] = await (0, utils_1.generateSummarizedDocumentAndExtractGoodSelection)((0, utils_1.fromFixtureOld)(filename, 'typescript'), [15, 8]);
        await (0, vitest_1.expect)(otherCode).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
        (0, vitest_1.expect)(selectedCode).toMatchInlineSnapshot(`""`);
    });
    (0, vitest_1.test)('should expand selection start to opening brace - BasketService.cs', async () => {
        const filename = 'BasketService.cs';
        const [otherCode, selectedCode] = await (0, utils_1.generateSummarizedDocumentAndExtractGoodSelection)((0, utils_1.fromFixtureOld)(filename, 'csharp', {
            insertSpaces: true,
            tabSize: 4,
        }), [44, 5]);
        await (0, vitest_1.expect)(otherCode).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
        await (0, vitest_1.expect)(selectedCode).toMatchFileSnapshot((0, utils_1.selectionDocPathInFixture)(filename));
    });
    (0, vitest_1.test)('should not expand end selection to select whitespace - pseudoStartStopConversationCallbackTest.ts', async () => {
        const filename = 'pseudoStartStopConversationCallbackTest.ts';
        const [otherCode, selectedCode] = await (0, utils_1.generateSummarizedDocumentAndExtractGoodSelection)((0, utils_1.fromFixtureOld)(filename, 'typescript'), [125, 0, 132, 0]);
        await (0, vitest_1.expect)(otherCode).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
        await (0, vitest_1.expect)(selectedCode).toMatchFileSnapshot((0, utils_1.selectionDocPathInFixture)(filename));
    });
    (0, vitest_1.test)('issue #5755: should not expand selection from property to the entire interface', async () => {
        const filename = 'vscode.proposed.chatParticipantAdditions.d.ts';
        const [otherCode, selectedCode] = await (0, utils_1.generateSummarizedDocumentAndExtractGoodSelection)((0, utils_1.fromFixtureOld)(filename, 'typescript'), [158, 0, 166, 0]);
        await (0, vitest_1.expect)(otherCode).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
        await (0, vitest_1.expect)(selectedCode).toMatchFileSnapshot((0, utils_1.selectionDocPathInFixture)(filename));
    });
    (0, vitest_1.test)('issue #5710: should move the start of the selection to next line', async () => {
        const filename = '5710.ts';
        const [otherCode, selectedCode] = await (0, utils_1.generateSummarizedDocumentAndExtractGoodSelection)((0, utils_1.fromFixtureOld)(filename, 'typescript'), [7, 66, 10, 5]);
        await (0, vitest_1.expect)(otherCode).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
        await (0, vitest_1.expect)(selectedCode).toMatchFileSnapshot((0, utils_1.selectionDocPathInFixture)(filename));
    });
    (0, vitest_1.test)('issue #7487: should not expand selection outside the React element', async () => {
        const filename = 'EditForm.tsx';
        const [otherCode, selectedCode] = await (0, utils_1.generateSummarizedDocumentAndExtractGoodSelection)((0, utils_1.fromFixtureOld)(filename, 'typescriptreact'), [138, 0, 147, 17]);
        await (0, vitest_1.expect)(otherCode).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
        await (0, vitest_1.expect)(selectedCode).toMatchFileSnapshot((0, utils_1.selectionDocPathInFixture)(filename));
    });
    (0, vitest_1.test)('issue #6614: should not expand selection to entire HTML document', async () => {
        const filename = 'workbench-dev.html';
        const [otherCode, selectedCode] = await (0, utils_1.generateSummarizedDocumentAndExtractGoodSelection)((0, utils_1.fromFixtureOld)(filename, 'html'), [75, 4, 75, 4]);
        await (0, vitest_1.expect)(otherCode).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
        await (0, vitest_1.expect)(selectedCode).toMatchFileSnapshot((0, utils_1.selectionDocPathInFixture)(filename));
    });
});
(0, vitest_1.describe)('cutoff cost', () => {
    (0, vitest_1.test)('Everything is too expensive', async () => {
        const filename = 'map.ts';
        const result = await (0, utils_1.generateSummarizedDocument)((0, utils_1.fromFixtureOld)(filename, 'typescript'), undefined, utils_1.DEFAULT_CHAR_LIMIT, {
            costFnOverride: () => false
        });
        (0, vitest_1.expect)(result.text).toBe('');
    });
    (0, vitest_1.test)('cutoff cost is respected', async () => {
        const viewport = offsetRange_1.OffsetRange.ofStartAndLength(0, 1323);
        function costFnOverride(n, currentScore) {
            // view port line 1 to line 49
            if (n.range.intersectsOrTouches(viewport)) {
                return 1;
            }
            else {
                return false;
            }
        }
        const filename = 'map.ts';
        const result = await (0, utils_1.generateSummarizedDocument)((0, utils_1.fromFixtureOld)(filename, 'typescript'), undefined, Number.MAX_SAFE_INTEGER, {
            costFnOverride
        });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename) + '.view-port');
    });
});
(0, vitest_1.describe)('/tests summarization[visualizable]', () => {
    (0, vitest_1.test)('keep constructor & method signatures', async () => {
        function costFnOverride(node, currentScore) {
            return node.kind === 'constructor' || node.kind === 'method_definition' ? 0 : currentScore;
        }
        const filename = 'bracketPairsTree.ts';
        const result = await (0, utils_1.generateSummarizedDocument)((0, utils_1.fromFixtureOld)(filename, 'typescript'), [88, 4, 102, 5], utils_1.DEFAULT_CHAR_LIMIT, { costFnOverride });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
    });
    (0, vitest_1.test)('keep constructor - 2', async () => {
        function costFnOverride(node, currentScore) {
            return node.kind === 'constructor' ? 0 : currentScore;
        }
        const filename = 'map.ts';
        const result = await (0, utils_1.generateSummarizedDocument)((0, utils_1.fromFixtureOld)(filename, 'typescript'), [671, 0, 725, 1], utils_1.DEFAULT_CHAR_LIMIT, { costFnOverride });
        await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filename));
    });
});
(0, vitest_1.describe)('createSummarizedDocuments', () => {
    (0, vitest_1.test)('summarize two document equally', async () => {
        const filenames = [
            'editorGroupWatermark.ts',
            'strings.test-example.ts'
        ];
        const files = [
            await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)(filenames[0]), languageId: 'typescript' }),
            await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)(filenames[1]), languageId: 'typescript' })
        ];
        const docs = await (0, utils_1.generateSummarizedDocuments)([
            {
                filePromise: files[0],
                selection: [24, 0]
            },
            {
                filePromise: files[1],
                selection: [344, 0]
            },
        ]);
        (0, vitest_1.expect)(docs.length).toBe(2);
        for (let i = 0; i < docs.length; i++) {
            const document = docs[i];
            (0, vitest_1.expect)(document.originalText).toBe(files[i].contents);
            await (0, vitest_1.expect)(document.text).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filenames[i] + '.round1'));
        }
    });
    (0, vitest_1.test)('summarize two document un-equally', async () => {
        const filenames = [
            'editorGroupWatermark.ts',
            'strings.test-example.ts'
        ];
        const files = [
            await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)(filenames[0]), languageId: 'typescript' }),
            await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)(filenames[1]), languageId: 'typescript' })
        ];
        const docs = await (0, utils_1.generateSummarizedDocuments)([
            {
                filePromise: files[0],
                selection: [24, 0]
            },
            {
                filePromise: files[1],
                selection: [344, 0]
            },
        ], 5000, {
            costFnOverride(node, currentCost, document) {
                if (document.uri.path.includes(filenames[1])) {
                    return 1;
                }
                return 100;
            },
        });
        // small budget, BIASED scores
        (0, vitest_1.expect)(docs.length).toBe(2);
        for (let i = 0; i < docs.length; i++) {
            const document = docs[i];
            (0, vitest_1.expect)(document.originalText).toBe(files[i].contents);
            await (0, vitest_1.expect)(document.text).toMatchFileSnapshot((0, utils_1.summarizedDocPathInFixture)(filenames[i] + '.round2'));
        }
    });
    vitest_1.test.skip('run on repositories', async () => {
        const N_FILES_LIMIT = 1500;
        const reposWithLangs = {
            'vscode-copilot': { repoPath: path.join(__dirname, '../../../../../src/'), language: 'typescript' },
            'llama.cpp': { repoPath: path.join(__dirname, '../../../../../../llama.cpp/src'), language: 'cpp' },
        };
        const langToExts = {
            'cpp': ['cpp', 'h'],
            'typescript': ['ts', 'tsx'],
        };
        const { repoPath, language } = reposWithLangs['vscode-copilot'];
        const exts = langToExts[language];
        async function* traverseDirectory(pathToDir) {
            const dirEntries = await fs.readdir(pathToDir, { withFileTypes: true });
            for (const entry of dirEntries) {
                if (entry.isDirectory()) {
                    yield* traverseDirectory(path.join(pathToDir, entry.name));
                }
                else if (exts.some(ext => !entry.parentPath.includes('fixture') && !entry.name.includes('.summarized.') && entry.name.endsWith('.' + ext))) {
                    console.log(path.join(pathToDir, entry.name));
                    yield path.join(pathToDir, entry.name);
                }
            }
        }
        let i = -1;
        for await (const filePath of traverseDirectory(repoPath)) {
            ++i;
            try {
                if (i > N_FILES_LIMIT) {
                    break;
                }
                const file = await (0, utils_1.loadFile)({ filePath, languageId: language });
                const fileLines = file.contents.split('\n');
                const selection = [Math.floor(fileLines.length / 2), Math.floor(fileLines[Math.floor(fileLines.length / 2)].length / 2)];
                const result = await (0, utils_1.generateSummarizedDocument)(file, selection, 400, { alwaysUseEllipsisForElisions: true });
                await (0, vitest_1.expect)(result.text).toMatchFileSnapshot((0, utils_1.getSummarizedSnapshotPath)(file));
            }
            catch (e) {
                console.log(`processing ${filePath} threw error`, e);
            }
        }
    });
});
//# sourceMappingURL=summarizeDocument.spec.js.map