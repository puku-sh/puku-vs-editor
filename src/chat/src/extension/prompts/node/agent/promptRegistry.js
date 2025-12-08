"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptRegistry = void 0;
exports.PromptRegistry = new class {
    constructor() {
        this.promptsWithMatcher = [];
        this.familyPrefixList = [];
    }
    registerPrompt(prompt) {
        if (prompt.matchesModel) {
            this.promptsWithMatcher.push(prompt);
        }
        for (const prefix of prompt.familyPrefixes) {
            this.familyPrefixList.push({ prefix, prompt });
        }
    }
    async getPrompt(endpoint) {
        for (const prompt of this.promptsWithMatcher) {
            const matches = await prompt.matchesModel(endpoint);
            if (matches) {
                return prompt;
            }
        }
        for (const { prefix, prompt } of this.familyPrefixList) {
            if (endpoint.family.startsWith(prefix)) {
                return prompt;
            }
        }
        return undefined;
    }
}();
//# sourceMappingURL=promptRegistry.js.map