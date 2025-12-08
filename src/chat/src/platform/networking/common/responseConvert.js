"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.toResponseDelta = void 0;
exports.fromResponseDelta = fromResponseDelta;
const assert_1 = require("../../../util/vs/base/common/assert");
/**
 * Converts a ResponsePart to an IResponseDelta.
 * For non-content parts, the text is set to an empty string.
 * @param part The ResponsePart to convert
 */
const toResponseDelta = (part) => {
    switch (part.kind) {
        case 0 /* ResponsePartKind.ContentDelta */:
            return { text: part.delta };
        case 1 /* ResponsePartKind.Content */:
            return { text: part.content, logprobs: part.logProbs };
        case 4 /* ResponsePartKind.Annotation */:
            return {
                text: '',
                codeVulnAnnotations: part.codeVulnAnnotations,
                ipCitations: part.ipCitations,
                copilotReferences: part.copilotReferences
            };
        case 5 /* ResponsePartKind.Confirmation */:
            return {
                text: '',
                copilotConfirmation: part,
            };
        case 6 /* ResponsePartKind.Error */:
            return {
                text: '',
                copilotErrors: [part.error]
            };
        case 2 /* ResponsePartKind.ToolCallDelta */:
            return {
                text: '',
                copilotToolCalls: [{
                        name: part.name,
                        arguments: part.delta,
                        id: part.partId
                    }]
            };
        case 3 /* ResponsePartKind.ToolCall */:
            return {
                text: '',
                copilotToolCalls: [{
                        name: part.name,
                        arguments: part.arguments,
                        id: part.id
                    }]
            };
        case 8 /* ResponsePartKind.ThinkingDelta */:
            return { text: '' };
        case 7 /* ResponsePartKind.Thinking */:
            return { text: '' }; // todo@karthiknadig/@connor4312: do we still need this back-compat with responses API?
        default:
            (0, assert_1.assertNever)(part);
    }
};
exports.toResponseDelta = toResponseDelta;
const staticContentUUID = '8444605d-6c67-42c5-bbcb-a04b83f9f76e';
/**
 * Converts an IResponseDelta to a ResponsePart.
 * For non-content deltas, the text is ignored.
 * @param delta The IResponseDelta to convert
 */
function* fromResponseDelta(delta) {
    if (delta.text && delta.text.length > 0) {
        yield {
            kind: 0 /* ResponsePartKind.ContentDelta */,
            partId: staticContentUUID,
            delta: delta.text
        };
    }
    if (delta.codeVulnAnnotations?.length || delta.ipCitations?.length || delta.copilotReferences?.length) {
        yield {
            kind: 4 /* ResponsePartKind.Annotation */,
            codeVulnAnnotations: delta.codeVulnAnnotations,
            ipCitations: delta.ipCitations,
            copilotReferences: delta.copilotReferences
        };
    }
    if (delta.copilotErrors && delta.copilotErrors.length > 0) {
        yield {
            kind: 6 /* ResponsePartKind.Error */,
            error: delta.copilotErrors[0]
        };
    }
    if (delta.copilotToolCalls && delta.copilotToolCalls.length > 0) {
        for (const toolCall of delta.copilotToolCalls) {
            yield {
                kind: 3 /* ResponsePartKind.ToolCall */,
                partId: toolCall.id,
                name: toolCall.name,
                arguments: toolCall.arguments,
                id: toolCall.id
            };
        }
    }
    if (delta.thinking) {
        yield {
            kind: 8 /* ResponsePartKind.ThinkingDelta */,
            partId: '', // Unknown, must be set by caller if needed
            delta: delta.thinking
        };
    }
    if (delta.copilotConfirmation) {
        yield {
            kind: 5 /* ResponsePartKind.Confirmation */,
            title: delta.copilotConfirmation.title,
            message: delta.copilotConfirmation.message,
            confirmation: delta.copilotConfirmation.confirmation
        };
    }
}
//# sourceMappingURL=responseConvert.js.map