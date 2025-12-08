"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const toolNames_1 = require("../toolNames");
(0, vitest_1.describe)('ToolNames', () => {
    (0, vitest_1.it)('Can map tool names', async () => {
        (0, vitest_1.expect)((0, toolNames_1.getContributedToolName)(toolNames_1.ToolName.ApplyPatch)).toBe(toolNames_1.ContributedToolName.ApplyPatch);
        (0, vitest_1.expect)((0, toolNames_1.getToolName)(toolNames_1.ContributedToolName.ApplyPatch)).toBe(toolNames_1.ToolName.ApplyPatch);
    });
    (0, vitest_1.it)('returns original name for unmapped core tools', () => {
        // Core tool without a contributed alias
        const unmapped = toolNames_1.ToolName.CoreRunInTerminal;
        const mapped = (0, toolNames_1.getContributedToolName)(unmapped);
        (0, vitest_1.expect)(mapped).toBe(unmapped);
    });
    (0, vitest_1.it)('mapContributedToolNamesInString replaces all contributed tool names with core names', () => {
        const input = `Use ${toolNames_1.ContributedToolName.ReplaceString} and ${toolNames_1.ContributedToolName.ReadFile} in sequence.`;
        const output = (0, toolNames_1.mapContributedToolNamesInString)(input);
        (0, vitest_1.expect)(output).toContain(toolNames_1.ToolName.ReplaceString);
        (0, vitest_1.expect)(output).toContain(toolNames_1.ToolName.ReadFile);
        (0, vitest_1.expect)(output).not.toContain(toolNames_1.ContributedToolName.ReplaceString);
        (0, vitest_1.expect)(output).not.toContain(toolNames_1.ContributedToolName.ReadFile);
    });
    (0, vitest_1.it)('mapContributedToolNamesInSchema replaces strings recursively', () => {
        const schema = {
            one: `before ${toolNames_1.ContributedToolName.ReplaceString} after`,
            nested: {
                two: `${toolNames_1.ContributedToolName.ReadFile}`,
                arr: [
                    `${toolNames_1.ContributedToolName.FindFiles}`,
                    42,
                    { three: `${toolNames_1.ContributedToolName.FindTextInFiles}` },
                ],
            },
            unchanged: 123,
        };
        const mapped = (0, toolNames_1.mapContributedToolNamesInSchema)(schema);
        (0, vitest_1.expect)(mapped.one).toContain(toolNames_1.ToolName.ReplaceString);
        (0, vitest_1.expect)(mapped.nested.two).toBe(toolNames_1.ToolName.ReadFile);
        (0, vitest_1.expect)(mapped.nested.arr[0]).toBe(toolNames_1.ToolName.FindFiles);
        (0, vitest_1.expect)(mapped.nested.arr[1]).toBe(42);
        (0, vitest_1.expect)(mapped.nested.arr[2].three).toBe(toolNames_1.ToolName.FindTextInFiles);
        (0, vitest_1.expect)(mapped.unchanged).toBe(123);
    });
});
//# sourceMappingURL=toolNames.spec.js.map