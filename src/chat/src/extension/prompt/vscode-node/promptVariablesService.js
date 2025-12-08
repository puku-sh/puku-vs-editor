"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptVariablesServiceImpl = void 0;
class PromptVariablesServiceImpl {
    async resolveVariablesInPrompt(message, variables) {
        for (const variable of this._reverseSortRefsWithRange(variables)) {
            message = message.slice(0, variable.range[0]) + `[#${variable.name}](#${variable.name}-context)` + message.slice(variable.range[1]);
        }
        return { message };
    }
    async resolveToolReferencesInPrompt(message, toolReferences) {
        // It's part of the extension API contract that these are in reverse order by range, but we sort it to be sure
        let previousRange;
        for (const toolReference of this._reverseSortRefsWithRange(toolReferences)) {
            // Tool sets are passed as all the tools as references with the same ranges. For now, just ignore tool references that have the same range.
            // The tools are sorted by range, so we only need to look at the previous one.
            const range = toolReference.range;
            if (previousRange && range[0] === previousRange[0] && range[1] === previousRange[1]) {
                continue;
            }
            message = message.slice(0, toolReference.range[0]) + `#${toolReference.name}` + message.slice(toolReference.range[1]);
            previousRange = range;
        }
        return message;
    }
    _reverseSortRefsWithRange(refs) {
        const refsWithRange = refs.filter(ref => !!ref.range);
        return refsWithRange.sort((a, b) => b.range[0] - a.range[0]);
    }
}
exports.PromptVariablesServiceImpl = PromptVariablesServiceImpl;
//# sourceMappingURL=promptVariablesService.js.map