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
const jsx_runtime_1 = require("../../../../../prompt/jsx-runtime//jsx-runtime");
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/** @jsxRuntime automatic */
/** @jsxImportSource ../../../../../prompt/jsx-runtime/ */
const assert = __importStar(require("assert"));
const ignoreService_1 = require("../../../../../../../../platform/ignore/common/ignoreService");
const descriptors_1 = require("../../../../../../../../util/vs/platform/instantiation/common/descriptors");
const virtualPrompt_1 = require("../../../../../prompt/src/components/virtualPrompt");
const completionsObservableWorkspace_1 = require("../../../completionsObservableWorkspace");
const completionsPrompt_1 = require("../../../test/completionsPrompt");
const context_1 = require("../../../test/context");
const snapshot_1 = require("../../../test/snapshot");
const testContentExclusion_1 = require("../../../test/testContentExclusion");
const textDocumentManager_1 = require("../../../textDocumentManager");
const completionsPromptFactory_test_1 = require("../../completionsPromptFactory/test/completionsPromptFactory.test");
const recentEditsProvider_1 = require("../../recentEdits/recentEditsProvider");
const recentEditsReducer_1 = require("../../recentEdits/recentEditsReducer");
const recentEdits_1 = require("../recentEdits");
class MockRecentEditsProvider extends recentEditsProvider_1.FullRecentEditsProvider {
    constructor() {
        super(...arguments);
        this.getRecentEdits = () => [];
    }
    getEditSummary(edit) {
        return (0, recentEditsReducer_1.summarizeEdit)(edit, this.config);
    }
}
suite('Recent Edits Component', function () {
    let accessor;
    let mockRecentEditsProvider;
    let ignoreService;
    setup(function () {
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(completionsObservableWorkspace_1.ICompletionsObservableWorkspace, new completionsPromptFactory_test_1.CompletionsMutableObservableWorkspace());
        serviceCollection.define(recentEditsProvider_1.ICompletionsRecentEditsProviderService, new descriptors_1.SyncDescriptor(MockRecentEditsProvider, [undefined]));
        serviceCollection.define(ignoreService_1.IIgnoreService, new testContentExclusion_1.MockIgnoreService());
        accessor = serviceCollection.createTestingAccessor();
        ignoreService = accessor.get(ignoreService_1.IIgnoreService);
        mockRecentEditsProvider = accessor.get(recentEditsProvider_1.ICompletionsRecentEditsProviderService);
    });
    test('renders nothing when recent edits are disabled', async function () {
        mockRecentEditsProvider.isEnabled = () => false;
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        const doc = tdm.setTextDocument('file:///foo.ts', 'typescript', 'const x = |;');
        const snapshot = await createSnapshot(accessor, doc, '|');
        assert.throws(() => (0, snapshot_1.querySnapshot)(snapshot, 'RecentEdits'));
    });
    test('renders recent edits correctly', async function () {
        mockRecentEditsProvider.config.maxEdits = 5;
        mockRecentEditsProvider.config.diffContextLines = 1;
        mockRecentEditsProvider.config.activeDocDistanceLimitFromCursor = -1;
        mockRecentEditsProvider.config.summarizationFormat = 'diff';
        mockRecentEditsProvider.config.maxFiles = 5;
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.init([{ uri: 'file:///root/' }]);
        const doc = tdm.setTextDocument('file:///root/relative/main.ts', 'typescript', 'function hello() {\n  return "world";\n}\n|');
        const fakeHunk = {
            file: doc.uri,
            startLine: 2,
            endLine: 2,
            diff: {
                file: doc.uri,
                pre: 1,
                post: 3,
                oldLen: 1,
                newLen: 1,
                before: [],
                removed: ['  return "world";'],
                added: ['  return "hello";'],
                after: [],
            },
            timestamp: 1,
        };
        mockRecentEditsProvider.getRecentEdits = () => [fakeHunk];
        const snapshot = await createSnapshot(accessor, doc, '|');
        const text = (0, snapshot_1.querySnapshot)(snapshot, 'RecentEdits.Chunk.Text');
        assert.ok(text.includes('These are recently edited files. Do not suggest code that has been deleted.'));
        assert.ok(text.includes('File: relative/main.ts'));
        assert.ok(text.includes('@@ -2,1 +2,1 @@'));
        assert.ok(text.includes('-  return "world";'));
        assert.ok(text.includes('+  return "hello";'));
        assert.ok(text.includes('End of recent edits'));
    });
    test('renders recent edits correctly w/o deleted lines', async function () {
        mockRecentEditsProvider.config.maxEdits = 5;
        mockRecentEditsProvider.config.diffContextLines = 1;
        mockRecentEditsProvider.config.activeDocDistanceLimitFromCursor = -1;
        mockRecentEditsProvider.config.summarizationFormat = 'diff';
        mockRecentEditsProvider.config.maxFiles = 5;
        mockRecentEditsProvider.config.removeDeletedLines = true;
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.init([{ uri: 'file:///root/' }]);
        const doc = tdm.setTextDocument('file:///root/relative/main.ts', 'typescript', 'function hello() {\n  return "world";\n}\n|');
        const fakeHunk = {
            file: doc.uri,
            startLine: 2,
            endLine: 2,
            diff: {
                file: doc.uri,
                pre: 1,
                post: 3,
                oldLen: 0,
                newLen: 1,
                before: [],
                removed: ['  return "world";'],
                added: ['  return "hello";'],
                after: [],
            },
            timestamp: 1,
        };
        mockRecentEditsProvider.getRecentEdits = () => [fakeHunk];
        const snapshot = await createSnapshot(accessor, doc, '|');
        const text = (0, snapshot_1.querySnapshot)(snapshot, 'RecentEdits.Chunk.Text');
        assert.strictEqual(text, `These are recently edited files. Do not suggest code that has been deleted.
File: relative/main.ts
--- a/file:///root/relative/main.ts
+++ b/file:///root/relative/main.ts
@@ -2,1 +2,1 @@
+  return "hello";
End of recent edits\n`.replace(/\n {12}/g, '\n'));
    });
    test('limits the total number of open files from which to source edits', async function () {
        mockRecentEditsProvider.config.maxEdits = 5;
        mockRecentEditsProvider.config.activeDocDistanceLimitFromCursor = -1;
        mockRecentEditsProvider.config.summarizationFormat = 'diff';
        mockRecentEditsProvider.config.maxFiles = 2;
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.init([{ uri: 'file:///root/' }]);
        const fileUris = ['file:///root/file-1', 'file:///root/file-2', 'file:///root/file-3'];
        for (const uri of fileUris) {
            tdm.setTextDocument(uri, 'typescript', 'dummy\n|');
        }
        const doc = tdm.setTextDocument('file:///root/relative/main.ts', 'typescript', 'dummy\n|');
        const fakeHunks = fileUris.map((uri, idx) => ({
            file: uri,
            startLine: 1,
            endLine: 1,
            diff: {
                file: uri,
                pre: 0,
                post: 1,
                oldLen: 0,
                newLen: 1,
                before: [],
                removed: [],
                added: [`edit-${idx + 1}`],
                after: [],
            },
            timestamp: idx + 1,
        }));
        mockRecentEditsProvider.getRecentEdits = () => fakeHunks;
        const snapshot = await createSnapshot(accessor, doc, '|');
        const text = (0, snapshot_1.querySnapshot)(snapshot, 'RecentEdits.Chunk.Text');
        assert.strictEqual(text, `These are recently edited files. Do not suggest code that has been deleted.
File: file-2
--- a/file:///root/file-2
+++ b/file:///root/file-2
@@ -1,0 +1,1 @@
+edit-2
File: file-3
--- a/file:///root/file-3
+++ b/file:///root/file-3
@@ -1,0 +1,1 @@
+edit-3
End of recent edits\n`.replace(/\n {12}/g, '\n'));
    });
    test('ignores edits over the max line limit', async function () {
        mockRecentEditsProvider.config.diffContextLines = 1;
        mockRecentEditsProvider.config.activeDocDistanceLimitFromCursor = -1;
        mockRecentEditsProvider.config.summarizationFormat = 'diff';
        mockRecentEditsProvider.config.maxFiles = 10;
        mockRecentEditsProvider.config.removeDeletedLines = true;
        mockRecentEditsProvider.config.maxLinesPerEdit = 1;
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.init([{ uri: 'file:///root/' }]);
        const fileUris = ['file:///root/file-1', 'file:///root/file-2', 'file:///root/file-3'];
        for (const uri of fileUris) {
            tdm.setTextDocument(uri, 'typescript', 'dummy\n|');
        }
        const doc = tdm.setTextDocument('file:///root/relative/main.ts', 'typescript', 'dummy\n|');
        const fakeHunks = fileUris.map((uri, idx) => ({
            file: uri,
            startLine: 1,
            endLine: 1,
            diff: {
                file: uri,
                pre: 0,
                post: 1,
                oldLen: 0,
                newLen: 1,
                before: [],
                removed: [],
                added: [`edit-${idx + 1}`],
                after: [],
            },
            timestamp: idx + 1,
        }));
        fakeHunks[0].diff.added.push('a second edit that breaks the 1 line limit');
        mockRecentEditsProvider.getRecentEdits = () => fakeHunks;
        const snapshot = await createSnapshot(accessor, doc, '|');
        const text = (0, snapshot_1.querySnapshot)(snapshot, 'RecentEdits.Chunk.Text');
        assert.strictEqual(text, `These are recently edited files. Do not suggest code that has been deleted.
File: file-2
--- a/file:///root/file-2
+++ b/file:///root/file-2
@@ -1,0 +1,1 @@
+edit-2
File: file-3
--- a/file:///root/file-3
+++ b/file:///root/file-3
@@ -1,0 +1,1 @@
+edit-3
End of recent edits\n`.replace(/\n {12}/g, '\n'));
    });
    test('returns none if too close to the cursor', async function () {
        mockRecentEditsProvider.config.maxEdits = 5;
        mockRecentEditsProvider.config.diffContextLines = 1;
        mockRecentEditsProvider.config.activeDocDistanceLimitFromCursor = -1;
        mockRecentEditsProvider.config.summarizationFormat = 'diff';
        mockRecentEditsProvider.config.maxFiles = 5;
        mockRecentEditsProvider.config.activeDocDistanceLimitFromCursor = 3;
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.init([{ uri: 'file:///root/' }]);
        const doc = tdm.setTextDocument('file:///root/relative/main.ts', 'typescript', 'function hello() {\n  return "world";\n}\n|');
        const fakeHunk = {
            file: doc.uri,
            startLine: 2,
            endLine: 2,
            diff: {
                file: doc.uri,
                pre: 1,
                post: 3,
                oldLen: 1,
                newLen: 1,
                before: [],
                removed: ['  return "world";'],
                added: ['  return "hello";'],
                after: [],
            },
            timestamp: 1,
        };
        mockRecentEditsProvider.getRecentEdits = () => [fakeHunk];
        const snapshot = await createSnapshot(accessor, doc, '|');
        assert.throws(() => (0, snapshot_1.querySnapshot)(snapshot, 'RecentEdits'));
    });
    test('editIsTooCloseToCursor function returns true when edit directly intersects', function () {
        const edit = {
            startLine: 2,
            endLine: 2,
        };
        let filterByCursorLine = true;
        let cursorLine = 1;
        let activeDocDistanceLimitFromCursor = 1;
        const editTooClose = (0, recentEdits_1.editIsTooCloseToCursor)(edit, filterByCursorLine, cursorLine, activeDocDistanceLimitFromCursor);
        assert.strictEqual(editTooClose, true);
        cursorLine = 3;
        activeDocDistanceLimitFromCursor = 4;
        const editTooClose2 = (0, recentEdits_1.editIsTooCloseToCursor)(edit, filterByCursorLine, cursorLine, activeDocDistanceLimitFromCursor);
        assert.strictEqual(editTooClose2, true);
        filterByCursorLine = false;
        assert.strictEqual((0, recentEdits_1.editIsTooCloseToCursor)(edit, filterByCursorLine, cursorLine, activeDocDistanceLimitFromCursor), false);
    });
    test('edits from content excluded documents are not included', async function () {
        mockRecentEditsProvider.config.maxEdits = 5;
        mockRecentEditsProvider.config.diffContextLines = 1;
        mockRecentEditsProvider.config.activeDocDistanceLimitFromCursor = -1;
        mockRecentEditsProvider.config.summarizationFormat = 'diff';
        mockRecentEditsProvider.config.maxFiles = 5;
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.init([{ uri: 'file:///root/' }]);
        const doc = tdm.setTextDocument('file:///root/relative/main.ts', 'typescript', 'function hello() {\n  return "world";\n}\n|');
        const excludedDoc = tdm.setTextDocument('file:///root/relative/excluded.ts', 'typescript', 'function excluded() {\n  return "excluded";\n}\n|');
        ignoreService.setBlockListUris([excludedDoc.uri]);
        const fakeEdits = [
            {
                file: doc.uri,
                startLine: 2,
                endLine: 2,
                diff: {
                    file: doc.uri,
                    pre: 1,
                    post: 3,
                    oldLen: 1,
                    newLen: 1,
                    before: [],
                    removed: ['  return "world";'],
                    added: ['  return "hello";'],
                    after: [],
                },
                timestamp: 1,
            },
            {
                file: excludedDoc.uri,
                startLine: 2,
                endLine: 2,
                diff: {
                    file: excludedDoc.uri,
                    pre: 1,
                    post: 3,
                    oldLen: 1,
                    newLen: 1,
                    before: [],
                    removed: ['  return "world";'],
                    added: ['  return "hello";'],
                    after: [],
                },
                timestamp: 1,
            },
        ];
        mockRecentEditsProvider.getRecentEdits = () => fakeEdits;
        const snapshot = await createSnapshot(accessor, doc, '|');
        const text = (0, snapshot_1.querySnapshot)(snapshot, 'RecentEdits.Chunk.Text');
        assert.ok(text.includes('These are recently edited files. Do not suggest code that has been deleted.'));
        assert.ok(text.includes('File: relative/main.ts'));
        assert.ok(!text.includes('File: relative/excluded.ts'));
    });
    async function createSnapshot(accessor, doc, marker) {
        const position = doc.positionAt(doc.getText().indexOf(marker));
        const tdms = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        const recentEditsProvider = accessor.get(recentEditsProvider_1.ICompletionsRecentEditsProviderService);
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(recentEdits_1.RecentEdits, { tdms: tdms, recentEditsProvider: recentEditsProvider }));
        const pipe = virtualPrompt.createPipe();
        await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, doc, position));
        return virtualPrompt.snapshot().snapshot;
    }
});
//# sourceMappingURL=recentEdits.test.js.map