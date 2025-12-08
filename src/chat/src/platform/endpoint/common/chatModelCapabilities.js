"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHiddenModelA = isHiddenModelA;
exports.isHiddenModelE = isHiddenModelE;
exports.isVSCModelA = isVSCModelA;
exports.isVSCModelB = isVSCModelB;
exports.modelPrefersInstructionsInUserMessage = modelPrefersInstructionsInUserMessage;
exports.modelPrefersInstructionsAfterHistory = modelPrefersInstructionsAfterHistory;
exports.modelSupportsApplyPatch = modelSupportsApplyPatch;
exports.modelPrefersJsonNotebookRepresentation = modelPrefersJsonNotebookRepresentation;
exports.modelSupportsReplaceString = modelSupportsReplaceString;
exports.modelSupportsMultiReplaceString = modelSupportsMultiReplaceString;
exports.modelCanUseReplaceStringExclusively = modelCanUseReplaceStringExclusively;
exports.modelShouldUseReplaceStringHealing = modelShouldUseReplaceStringHealing;
exports.modelCanUseMcpResultImageURL = modelCanUseMcpResultImageURL;
exports.modelCanUseImageURL = modelCanUseImageURL;
exports.modelCanUseApplyPatchExclusively = modelCanUseApplyPatchExclusively;
exports.modelNeedsStrongReplaceStringHint = modelNeedsStrongReplaceStringHint;
exports.modelSupportsSimplifiedApplyPatchInstructions = modelSupportsSimplifiedApplyPatchInstructions;
exports.isGpt5PlusFamily = isGpt5PlusFamily;
exports.isGptCodexFamily = isGptCodexFamily;
exports.isGpt5Family = isGpt5Family;
exports.isGptFamily = isGptFamily;
exports.isGpt51Family = isGpt51Family;
exports.getVerbosityForModelSync = getVerbosityForModelSync;
const crypto_1 = require("../../../util/common/crypto");
const HIDDEN_MODEL_A_HASHES = [
    'a99dd17dfee04155d863268596b7f6dd36d0a6531cd326348dbe7416142a21a3',
    '6b0f165d0590bf8d508540a796b4fda77bf6a0a4ed4e8524d5451b1913100a95'
];
const VSC_MODEL_HASHES_A = [
    '7b667eee9b3517fb9aae7061617fd9cec524859fcd6a20a605bfb142a6b0f14e',
    'e7cfc1a7adaf9e419044e731b7a9e21940a5280a438b472db0c46752dd70eab3',
    '878722e35e24b005604c37aa5371ae100e82465fbfbdf6fe3c1fdaf7c92edc96',
    '1d28f8e6e5af58c60e9a52385314a3c7bc61f7226e1444e31fe60c58c30e8235',
    '3104045f9b69dbb7a3d76cc8a0aa89eb05e10677c4dd914655ea87f4be000f4e',
    'b576d46942ee2c45ecd979cbbcb62688ae3171a07ac83f53b783787f345e3dd7',
    'b46570bfd230db11a82d5463c160b9830195def7086519ca319c41037b991820',
    '6b0f165d0590bf8d508540a796b4fda77bf6a0a4ed4e8524d5451b1913100a95',
];
const VSC_MODEL_HASHES_B = [
    'e30111497b2a7e8f1aa7beed60b69952537d99bcdc18987abc2f6add63a89960',
    'df610ed210bb9266ff8ab812908d5837538cdb1d7436de907fb7e970dab5d289',
    '6db59e9bfe6e2ce608c0ee0ade075c64e4d054f05305e3034481234703381bb5',
];
const HIDDEN_MODEL_E_HASHES = [
    '6013de0381f648b7f21518885c02b40b7583adfb33c6d9b64d3aed52c3934798'
];
function getModelId(model) {
    return 'id' in model ? model.id : model.model;
}
async function isHiddenModelA(model) {
    const h = await (0, crypto_1.getCachedSha256Hash)(model.family);
    return HIDDEN_MODEL_A_HASHES.includes(h);
}
async function isHiddenModelE(model) {
    const h = await (0, crypto_1.getCachedSha256Hash)(model.family);
    return HIDDEN_MODEL_E_HASHES.includes(h);
}
async function isVSCModelA(model) {
    const ID_hash = await (0, crypto_1.getCachedSha256Hash)(getModelId(model));
    const family_hash = await (0, crypto_1.getCachedSha256Hash)(model.family);
    return VSC_MODEL_HASHES_A.includes(ID_hash) || VSC_MODEL_HASHES_A.includes(family_hash);
}
async function isVSCModelB(model) {
    const ID_hash = await (0, crypto_1.getCachedSha256Hash)(getModelId(model));
    const family_hash = await (0, crypto_1.getCachedSha256Hash)(model.family);
    return VSC_MODEL_HASHES_B.includes(ID_hash) || VSC_MODEL_HASHES_B.includes(family_hash);
}
/**
 * Returns whether the instructions should be given in a user message instead
 * of a system message when talking to the model.
 */
function modelPrefersInstructionsInUserMessage(modelFamily) {
    return modelFamily.includes('claude-3.5-sonnet');
}
/**
 * Returns whether the instructions should be presented after the history
 * for the given model.
 */
function modelPrefersInstructionsAfterHistory(modelFamily) {
    return modelFamily.includes('claude-3.5-sonnet');
}
/**
 * Model supports apply_patch as an edit tool.
 */
async function modelSupportsApplyPatch(model) {
    return (model.family.startsWith('gpt') && !model.family.includes('gpt-4o')) || model.family === 'o4-mini' || await isVSCModelA(model) || await isVSCModelB(model);
}
/**
 * Model prefers JSON notebook representation.
 */
function modelPrefersJsonNotebookRepresentation(model) {
    return (model.family.startsWith('gpt') && !model.family.includes('gpt-4o')) || model.family === 'o4-mini';
}
/**
 * Model supports replace_string_in_file as an edit tool.
 */
async function modelSupportsReplaceString(model) {
    return model.family.includes('gemini') || model.family.includes('grok-code') || await modelSupportsMultiReplaceString(model);
}
/**
 * Model supports multi_replace_string_in_file as an edit tool.
 */
async function modelSupportsMultiReplaceString(model) {
    return model.family.startsWith('claude') || model.family.startsWith('Anthropic') || await isHiddenModelE(model);
}
/**
 * The model is capable of using replace_string_in_file exclusively,
 * without needing insert_edit_into_file.
 */
async function modelCanUseReplaceStringExclusively(model) {
    return model.family.startsWith('claude') || model.family.startsWith('Anthropic') || model.family.includes('grok-code') || await isHiddenModelE(model);
}
/**
 * We should attempt to automatically heal incorrect edits the model may emit.
 * @note whether this is respected is currently controlled via EXP
 */
function modelShouldUseReplaceStringHealing(model) {
    return model.family.includes('gemini');
}
/**
 * The model can accept image urls as the `image_url` parameter in mcp tool results.
 */
async function modelCanUseMcpResultImageURL(model) {
    return !model.family.startsWith('claude') && !model.family.startsWith('Anthropic') && !await isHiddenModelE(model);
}
/**
 * The model can accept image urls as the `image_url` parameter in requests.
 */
function modelCanUseImageURL(model) {
    return !model.family.startsWith('gemini');
}
/**
 * The model is capable of using apply_patch as an edit tool exclusively,
 * without needing insert_edit_into_file.
 */
async function modelCanUseApplyPatchExclusively(model) {
    return isGpt5PlusFamily(model.family) || await isVSCModelA(model) || await isVSCModelB(model);
}
/**
 * Whether, when replace_string and insert_edit tools are both available,
 * verbiage should be added in the system prompt directing the model to prefer
 * replace_string.
 */
function modelNeedsStrongReplaceStringHint(model) {
    return model.family.toLowerCase().includes('gemini');
}
/**
 * Model can take the simple, modern apply_patch instructions.
 */
async function modelSupportsSimplifiedApplyPatchInstructions(model) {
    return isGpt5PlusFamily(model.family) || await isVSCModelA(model) || await isVSCModelB(model);
}
function isGpt5PlusFamily(model) {
    if (!model) {
        return false;
    }
    const family = typeof model === 'string' ? model : model.family;
    return !!family.startsWith('gpt-5');
}
/**
 * Matches gpt-5-codex, gpt-5.1-codex, gpt-5.1-codex-mini, and any future models in this general family
 */
function isGptCodexFamily(model) {
    if (!model) {
        return false;
    }
    const family = typeof model === 'string' ? model : model.family;
    return !!family.startsWith('gpt-') && family.includes('-codex');
}
/**
 * GPT-5, -mini, -codex, not 5.1+
 */
function isGpt5Family(model) {
    if (!model) {
        return false;
    }
    const family = typeof model === 'string' ? model : model.family;
    return family === 'gpt-5' || family === 'gpt-5-mini' || family === 'gpt-5-codex';
}
function isGptFamily(model) {
    if (!model) {
        return false;
    }
    const family = typeof model === 'string' ? model : model.family;
    return !!family.startsWith('gpt-');
}
/**
 * Any GPT-5.1+ model
 */
function isGpt51Family(model) {
    if (!model) {
        return false;
    }
    const family = typeof model === 'string' ? model : model.family;
    return !!family.match(/^gpt-5\.\d+/i);
}
/**
 * This takes a sync shortcut and should only be called when a model hash would have already been computed while rendering the prompt.
 */
function getVerbosityForModelSync(model) {
    if (model.family === 'gpt-5.1' || model.family === 'gpt-5-mini') {
        return 'low';
    }
    return undefined;
}
//# sourceMappingURL=chatModelCapabilities.js.map