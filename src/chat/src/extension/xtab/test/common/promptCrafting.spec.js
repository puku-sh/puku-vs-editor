"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const documentId_1 = require("../../../../platform/inlineEdits/common/dataTypes/documentId");
const xtabPromptOptions_1 = require("../../../../platform/inlineEdits/common/dataTypes/xtabPromptOptions");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const abstractText_1 = require("../../../../util/vs/editor/common/core/text/abstractText");
const promptCrafting_1 = require("../../common/promptCrafting");
function nLines(n) {
    return new abstractText_1.StringText(new Array(n).fill(0).map((_, i) => `${i + 1}`).join('\n'));
}
function computeTokens(s) {
    return Math.ceil(s.length / 4);
}
(0, vitest_1.suite)('Paged clipping - recently viewed files', () => {
    const id = documentId_1.DocumentId.create('file:///src/first.txt');
    (0, vitest_1.test)('can page correctly by lines of 2', () => {
        const { snippets } = (0, promptCrafting_1.buildCodeSnippetsUsingPagedClipping)([
            {
                id,
                content: nLines(4),
            }
        ], computeTokens, {
            ...xtabPromptOptions_1.DEFAULT_OPTIONS,
            recentlyViewedDocuments: {
                ...xtabPromptOptions_1.DEFAULT_OPTIONS.recentlyViewedDocuments,
                maxTokens: 4
            },
            pagedClipping: {
                pageSize: 2,
            }
        });
        (0, vitest_1.expect)(snippets).toMatchInlineSnapshot(`
			[
			  "<|recently_viewed_code_snippet|>
			code_snippet_file_path: /src/first.txt (truncated)
			1
			2
			<|/recently_viewed_code_snippet|>",
			]
		`);
    });
    (0, vitest_1.test)('can page correctly by lines of 4', () => {
        const { snippets } = (0, promptCrafting_1.buildCodeSnippetsUsingPagedClipping)([
            {
                id,
                content: nLines(4),
            }
        ], computeTokens, {
            ...xtabPromptOptions_1.DEFAULT_OPTIONS,
            recentlyViewedDocuments: {
                ...xtabPromptOptions_1.DEFAULT_OPTIONS.recentlyViewedDocuments,
                maxTokens: 2000
            },
            pagedClipping: {
                pageSize: 2,
            }
        });
        (0, vitest_1.expect)(snippets).toMatchInlineSnapshot(`
			[
			  "<|recently_viewed_code_snippet|>
			code_snippet_file_path: /src/first.txt
			1
			2
			3
			4
			<|/recently_viewed_code_snippet|>",
			]
		`);
    });
});
(0, vitest_1.suite)('Paged clipping - current file', () => {
    const opts = xtabPromptOptions_1.DEFAULT_OPTIONS.currentFile;
    function createTaggedFile(currentDocLines, areaAroundCodeToEdit, areaAroundEditWindowLinesRange, computeTokens, pageSize, opts) {
        return (0, promptCrafting_1.createTaggedCurrentFileContentUsingPagedClipping)(currentDocLines, areaAroundCodeToEdit, areaAroundEditWindowLinesRange, computeTokens, pageSize, opts).map(taggedCurrentFileContent => taggedCurrentFileContent.join('\n'));
    }
    (0, vitest_1.test)('unlim budget - includes whole context', () => {
        const docLines = nLines(40);
        const areaAroundCodeToEdit = `
<area_around_code_to_edit>
22
23
<code_to_edit>
24
25
<code_to_edit>
26
</area_around_code_to_edit>
`.trim();
        const result = createTaggedFile(docLines.getLines(), areaAroundCodeToEdit, new offsetRange_1.OffsetRange(21, 26), computeTokens, 10, { ...opts, maxTokens: 2000 });
        (0, vitest_1.assert)(result.isOk());
        const taggedCurrentFileContent = result.val;
        (0, vitest_1.expect)(taggedCurrentFileContent).toMatchInlineSnapshot(`
			"1
			2
			3
			4
			5
			6
			7
			8
			9
			10
			11
			12
			13
			14
			15
			16
			17
			18
			19
			20
			21
			<area_around_code_to_edit>
			22
			23
			<code_to_edit>
			24
			25
			<code_to_edit>
			26
			</area_around_code_to_edit>
			27
			28
			29
			30
			31
			32
			33
			34
			35
			36
			37
			38
			39
			40"
		`);
    });
    (0, vitest_1.test)('budget of 20', () => {
        const docLines = nLines(40);
        const areaAroundCodeToEdit = `
<area_around_code_to_edit>
22
23
<code_to_edit>
24
25
<code_to_edit>
26
</area_around_code_to_edit>
`.trim();
        const result = createTaggedFile(docLines.getLines(), areaAroundCodeToEdit, new offsetRange_1.OffsetRange(21, 26), computeTokens, 10, { ...opts, maxTokens: 20 });
        (0, vitest_1.assert)(result.isOk());
        const taggedCurrentFileContent = result.val;
        (0, vitest_1.expect)(taggedCurrentFileContent).toMatchInlineSnapshot(`
			"21
			<area_around_code_to_edit>
			22
			23
			<code_to_edit>
			24
			25
			<code_to_edit>
			26
			</area_around_code_to_edit>
			27
			28
			29
			30"
		`);
    });
    (0, vitest_1.test)('context above and below get same # of tokens', () => {
        const docLines = nLines(40);
        const areaAroundCodeToEdit = `
<a>
11
12
<b>
13
</b>
14
</a>
`.trim();
        const result = createTaggedFile(docLines.getLines(), areaAroundCodeToEdit, new offsetRange_1.OffsetRange(10, 14), computeTokens, 10, { ...opts, maxTokens: 50 });
        (0, vitest_1.assert)(result.isOk());
        const taggedCurrentFileContent = result.val;
        (0, vitest_1.expect)(taggedCurrentFileContent).toMatchInlineSnapshot(`
			"<a>
			11
			12
			<b>
			13
			</b>
			14
			</a>
			15
			16
			17
			18
			19
			20"
		`);
    });
});
//# sourceMappingURL=promptCrafting.spec.js.map