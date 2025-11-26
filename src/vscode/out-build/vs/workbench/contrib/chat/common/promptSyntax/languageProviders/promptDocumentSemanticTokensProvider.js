/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { getPromptsTypeForLanguageId } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
import { isGithubTarget } from './promptValidator.js';
let PromptDocumentSemanticTokensProvider = class PromptDocumentSemanticTokensProvider {
    constructor(promptsService) {
        this.promptsService = promptsService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptDocumentSemanticTokensProvider';
    }
    provideDocumentSemanticTokens(model, lastResultId, token) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType) {
            // if the model is not a prompt, we don't provide any semantic tokens
            return undefined;
        }
        const promptAST = this.promptsService.getParsedPromptFile(model);
        if (!promptAST.body) {
            return undefined;
        }
        if (isGithubTarget(promptType, promptAST.header?.target)) {
            // In Puku AI mode, we don't provide variable semantic tokens to tool references
            return undefined;
        }
        const variableReferences = promptAST.body.variableReferences;
        if (!variableReferences.length) {
            return undefined;
        }
        // Prepare semantic tokens data following the delta-encoded, 5-number tuple format:
        // [deltaLine, deltaStart, length, tokenType, tokenModifiers]
        // We expose a single token type 'variable' (index 0) and no modifiers (bitset 0).
        const data = [];
        let lastLine = 0;
        let lastChar = 0;
        // Ensure stable order (parser already produces them in order, but sort defensively)
        const ordered = [...variableReferences].sort((a, b) => a.range.startLineNumber === b.range.startLineNumber
            ? a.range.startColumn - b.range.startColumn
            : a.range.startLineNumber - b.range.startLineNumber);
        for (const ref of ordered) {
            // Also include the '#tool:' prefix for syntax highlighting purposes, even if it's not originally part of the variable name itself.
            const extraCharCount = '#tool:'.length;
            const line = ref.range.startLineNumber - 1; // zero-based
            const char = ref.range.startColumn - extraCharCount - 1; // zero-based
            const length = ref.range.endColumn - ref.range.startColumn + extraCharCount;
            const deltaLine = line - lastLine;
            const deltaChar = deltaLine === 0 ? char - lastChar : char;
            data.push(deltaLine, deltaChar, length, 0 /* variable token type index */, 0 /* no modifiers */);
            lastLine = line;
            lastChar = char;
            if (token.isCancellationRequested) {
                break; // Return what we have so far if cancelled.
            }
        }
        return { data: new Uint32Array(data) };
    }
    getLegend() {
        return { tokenTypes: ['variable'], tokenModifiers: [] };
    }
    releaseDocumentSemanticTokens(resultId) {
        // No caching/result management needed for the simple, stateless implementation.
    }
};
PromptDocumentSemanticTokensProvider = __decorate([
    __param(0, IPromptsService)
], PromptDocumentSemanticTokensProvider);
export { PromptDocumentSemanticTokensProvider };
//# sourceMappingURL=promptDocumentSemanticTokensProvider.js.map