"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const vitest_1 = require("vitest");
const simulationWorkspace_1 = require("../../../../platform/test/node/simulationWorkspace");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const textDocument_1 = require("../../../../util/common/test/shims/textDocument");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const map_1 = require("../../../../util/vs/base/common/map");
const uri_1 = require("../../../../util/vs/base/common/uri");
const descriptors_1 = require("../../../../util/vs/platform/instantiation/common/descriptors");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const services_1 = require("../../../test/node/services");
const toolNames_1 = require("../../common/toolNames");
const toolsRegistry_1 = require("../../common/toolsRegistry");
const toolsService_1 = require("../../common/toolsService");
const toolTestUtils_1 = require("./toolTestUtils");
(0, vitest_1.suite)('MultiReplaceString', () => {
    let accessor;
    const documents = new map_1.ResourceMap();
    (0, vitest_1.beforeAll)(() => {
        // Create a large document for testing truncation (3000 lines to exceed MAX_LINES_PER_READ)
        const largeContent = Array.from({ length: 3000 }, (_, i) => `line ${i + 1}`).join('\n');
        const allDocs = [
            (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/workspace/file.ts'), 'line 1\nline 2\n\nline 4\nline 5', 'ts'),
            (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/workspace/empty.ts'), '', 'ts'),
            (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/workspace/whitespace.ts'), ' \t\n', 'ts'),
            (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/workspace/large.ts'), largeContent, 'ts'),
            (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/workspace/multi-sr-bug.ts'), (0, fs_1.readFileSync)(__dirname + '/editFileToolUtilsFixtures/multi-sr-bug-original.txt', 'utf-8'), 'ts'),
            (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/workspace/math.js'), (0, fs_1.readFileSync)(__dirname + '/editFileToolUtilsFixtures/math-original.txt', 'utf-8'), 'js')
        ];
        for (const doc of allDocs) {
            documents.set(doc.document.uri, doc);
        }
        const services = (0, services_1.createExtensionUnitTestingServices)();
        services.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(testWorkspaceService_1.TestWorkspaceService, [
            [uri_1.URI.file('/workspace')],
            allDocs.map(d => d.document),
        ]));
        accessor = services.createTestingAccessor();
    });
    (0, vitest_1.afterAll)(() => {
        accessor.dispose();
    });
    async function invoke(params) {
        const edits = {};
        const stream = {
            markdown: () => { },
            codeblockUri: () => { },
            push: part => {
                if (part instanceof vscodeTypes_1.ChatResponseTextEditPart) {
                    edits[part.uri.toString()] ??= [];
                    edits[part.uri.toString()].push(...part.edits);
                }
            },
            textEdit: (uri, edit) => {
                if (typeof edit !== 'boolean') {
                    edits[uri.toString()] ??= [];
                    edits[uri.toString()].push(...(Array.isArray(edit) ? edit : [edit]));
                }
            }
        };
        const toolsService = accessor.get(toolsService_1.IToolsService);
        toolsService.getCopilotTool(toolNames_1.ToolName.MultiReplaceString)?.resolveInput?.(params, { stream }, toolsRegistry_1.CopilotToolMode.FullContext);
        const result = await toolsService.invokeTool(toolNames_1.ToolName.MultiReplaceString, { input: params, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        return { result, edits };
    }
    async function applyEditsInMap(r) {
        const results = {};
        for (const [uriStr, edits] of Object.entries(r)) {
            const doc = documents.get(uri_1.URI.parse(uriStr));
            if (!doc) {
                throw new Error(`No document found for ${uriStr}`);
            }
            (0, simulationWorkspace_1.applyEdits)(doc, edits, new vscodeTypes_1.Range(0, 0, 0, 0), new vscodeTypes_1.Range(0, 0, 0, 0));
            results[uriStr] = doc.document.getText();
        }
        return results;
    }
    (0, vitest_1.test)('replaces a simple string', async () => {
        const input = {
            explanation: 'Replace line 2 with "new line 2"',
            replacements: [{
                    filePath: '/workspace/file.ts',
                    explanation: 'Replace line 2 with "new line 2"',
                    newString: 'new line 2',
                    oldString: 'line 2',
                }]
        };
        const r = await invoke(input);
        (0, vitest_1.expect)(await applyEditsInMap(r.edits)).toMatchInlineSnapshot(`
			{
			  "file:///workspace/file.ts": "line 1
			new line 2

			line 4
			line 5",
			}
		`);
    });
    (0, vitest_1.test)('multi-sr bug', async () => {
        const input = {
            "explanation": "Update session imports and type annotations to use IModifiedFileEntryInternal",
            "replacements": [
                {
                    "explanation": "Update imports to include IModifiedFileEntryInternal",
                    "filePath": "/workspace/multi-sr-bug.ts",
                    "newString": "import { ChatEditingSessionState, ChatEditKind, getMultiDiffSourceUri, IChatEditingSession, IModifiedEntryTelemetryInfo, IModifiedFileEntry, IModifiedFileEntryInternal, IPendingFileOperation, ISnapshotEntry, IStreamingEdits, ModifiedFileEntryState } from '../../common/chatEditingService.js';",
                    "oldString": "import { ChatEditingSessionState, ChatEditKind, getMultiDiffSourceUri, IChatEditingSession, IModifiedEntryTelemetryInfo, IModifiedFileEntry, IPendingFileOperation, ISnapshotEntry, IStreamingEdits, ModifiedFileEntryState } from '../../common/chatEditingService.js';"
                },
                {
                    "explanation": "Remove unused IFile import",
                    "filePath": "/workspace/multi-sr-bug.ts",
                    "newString": `import { URI } from '../../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';`,
                    "oldString": `import { URI } from '../../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';
import { IFile } from '../../../../../base/node/zip.js';`
                },
                {
                    "explanation": "Update _entriesObs type to use IModifiedFileEntryInternal",
                    "filePath": "/workspace/multi-sr-bug.ts",
                    "newString": `	private readonly _entriesObs = observableValue<readonly IModifiedFileEntryInternal[]>(this, []);
	public get entries(): IObservable<readonly IModifiedFileEntry[]> {
		return this._entriesObs;
	}`,
                    "oldString": `	private readonly _entriesObs = observableValue<readonly AbstractChatEditingModifiedFileEntry[]>(this, []);
	public get entries(): IObservable<readonly IModifiedFileEntry[]> {
		return this._entriesObs;
	}`
                }
            ]
        };
        const r = await invoke(input);
        await (0, vitest_1.expect)(await applyEditsInMap(r.edits)).toMatchFileSnapshot(__dirname + '/editFileToolUtilsFixtures/multi-sr-bug-actual.txt');
    });
    (0, vitest_1.test)('The multi_replace_string_in_file trashed my file due to overlapping replacements #277154', async () => {
        const input = {
            "explanation": "Adding JSDoc comments to the div and mul functions",
            "replacements": [
                {
                    "filePath": "/workspace/math.js",
                    "oldString": `export function sumArray(a) {
	return a.reduce((sum, num) => sum + num, 0);
}

export function div(a, b) {
	// console.log fff fff
	return a / b;
}`,
                    "newString": `export function sumArray(a) {
	return a.reduce((sum, num) => sum + num, 0);
}

/**
 * Divides the first number by the second number.
 *
 * @param {number} a - The dividend.
 * @param {number} b - The divisor.
 * @returns {number} - The quotient of a divided by b.
 */
export function div(a, b) {
	// console.log fff fff
	return a / b;
}`,
                    "explanation": "Add JSDoc to div function"
                },
                {
                    "filePath": "/workspace/math.js",
                    "oldString": `export function div(a, b) {
	// console.log fff fff
	return a / b;
}

export function mul(a, b) {
	return a * b;
}

export function sumThreeFloats(a, b, c) {`,
                    "newString": `/**
 * Divides the first number by the second number.
 *
 * @param {number} a - The dividend.
 * @param {number} b - The divisor.
 * @returns {number} - The quotient of a divided by b.
 */
export function div(a, b) {
	// console.log fff fff
	return a / b;
}

/**
 * Multiplies two numbers together.
 *
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {number} - The product of a and b.
 */
export function mul(a, b) {
	return a * b;
}

export function sumThreeFloats(a, b, c) {`,
                    "explanation": "Add JSDoc to mul function"
                }
            ]
        };
        const r = await invoke(input);
        (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, r.result)).toMatchInlineSnapshot(`
			"The following files were successfully edited:
			/workspace/math.js
			Edit at index 1 conflicts with another replacement in /workspace/math.js. You can make another call to try again."
		`);
        const edits = Object.values(r.edits).flat(); //
        edits.sort((a, b) => a.range.start.compareTo(b.range.start));
        for (let i = 1; i < edits.length; i++) {
            const e1 = edits[i - 1];
            const e2 = edits[i];
            (0, vitest_1.expect)(e1.range.end.isBeforeOrEqual(e2.range.start)).toBe(true);
        }
    });
});
//# sourceMappingURL=multiReplaceStringTool.spec.js.map