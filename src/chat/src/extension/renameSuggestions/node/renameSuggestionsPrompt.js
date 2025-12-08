"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenameSuggestionsPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const languages_1 = require("../../../util/common/languages");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const definitionAroundCursor_1 = require("../../prompt/node/definitionAroundCursor");
const safetyRules_1 = require("../../prompts/node/base/safetyRules");
const definitionAtPosition_1 = require("../../prompts/node/panel/definitionAtPosition");
let RenameSuggestionsPrompt = class RenameSuggestionsPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, instaService, endpointProvider) {
        super(props);
        this.instaService = instaService;
        this.endpointProvider = endpointProvider;
        const { document, range } = this.props;
        this._defAtPos = instaService.createInstance(new descriptors_1.SyncDescriptor(definitionAtPosition_1.DefinitionAtPosition, [{ document, position: range.start }]));
    }
    async prepare(sizing, progress, token) {
        const { document, range } = this.props;
        const defState = await this._defAtPos.prepare();
        const isDefinitionBeingRenamed = defState.k === 'found' && defState.definitions.some(def => def.excerptRange.contains(this.props.range));
        if (!isDefinitionBeingRenamed) {
            const endpointInfo = await this.endpointProvider.getChatEndpoint('copilot-fast');
            const documentContext = {
                document,
                fileIndentInfo: undefined,
                language: (0, languages_1.getLanguage)(document.languageId),
                wholeRange: range,
                selection: new vscodeTypes_1.Selection(range.start, range.end),
            };
            this._defAroundCursor = this.instaService.createInstance(definitionAroundCursor_1.DefinitionAroundCursor, { documentContext, endpointInfo });
        }
        const state = {
            defAtPositionState: defState,
            defAroundCursorState: this._defAroundCursor ? await this._defAroundCursor.prepare(sizing) : undefined,
        };
        return state;
    }
    render(state, sizing) {
        const { document, range } = this.props;
        const symbolName = document.getText(range);
        const prefix = extractIdentifierPrefix(symbolName);
        const instructionToKeepPrefix = prefix ? ` keeping prefix '${prefix}'` : '';
        const renderedDef = this._defAtPos.render(state.defAtPositionState, sizing);
        const renderedDefAroundCursor = state.defAroundCursorState !== undefined && this._defAroundCursor?.render(state.defAroundCursorState, sizing);
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                "You are a distinguished software engineer.",
                vscpp("br", null),
                vscpp(safetyRules_1.LegacySafetyRules, null),
                "You must reply with a JSON array of strings of at least four new names, e.g., `[\"first\", \"second\", \"third\", \"fourth\"]`.",
                vscpp("br", null),
                "You must respect existing naming conventions",
                instructionToKeepPrefix,
                "."),
            renderedDefAroundCursor,
            vscpp(prompt_tsx_1.UserMessage, null,
                renderedDef !== undefined && vscpp(vscppf, null,
                    renderedDef,
                    vscpp("br", null)),
                "Think of the purpose of `",
                symbolName,
                "` in the given code. Think of several names that reflect what `",
                symbolName,
                "` is and what it does",
                instructionToKeepPrefix,
                ". Follow existing naming conventions. Reply with a JSON array of strings of at least four new names for `",
                symbolName,
                "`.")));
    }
};
exports.RenameSuggestionsPrompt = RenameSuggestionsPrompt;
exports.RenameSuggestionsPrompt = RenameSuggestionsPrompt = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, endpointProvider_1.IEndpointProvider)
], RenameSuggestionsPrompt);
/**
 * Extracts the prefix of an identifier. The prefix is defined as the leading sequence of dots, dollar signs, and underscores.
 *
 * @param identifier - The identifier to extract the prefix from.
 * @returns The prefix of the identifier, or undefined if no prefix is found.
 */
function extractIdentifierPrefix(identifier) {
    const prefix = identifier.match(/^([\\.\\$\\_]+)/)?.[0];
    return prefix;
}
//# sourceMappingURL=renameSuggestionsPrompt.js.map