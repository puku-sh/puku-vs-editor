"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalContextMessageMetadata = exports.RenderedUserMessageMetadata = exports.Conversation = exports.Turn = exports.RequestDebugInformation = exports.PromptMetadata = exports.TurnStatus = exports.PromptReference = void 0;
exports.normalizeSummariesOnRounds = normalizeSummariesOnRounds;
exports.getUniqueReferences = getUniqueReferences;
exports.getGlobalContextCacheKey = getGlobalContextCacheKey;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const types_1 = require("../../../util/common/types");
const map_1 = require("../../../util/vs/base/common/map");
const types_2 = require("../../../util/vs/base/common/types");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const vscodeTypes_1 = require("../../../vscodeTypes");
const intents_1 = require("../common/intents");
const chatVariablesCollection_1 = require("./chatVariablesCollection");
const specialRequestTypes_1 = require("./specialRequestTypes");
const toolCallRound_1 = require("./toolCallRound");
var prompt_tsx_2 = require("@vscode/prompt-tsx");
Object.defineProperty(exports, "PromptReference", { enumerable: true, get: function () { return prompt_tsx_2.PromptReference; } });
var TurnStatus;
(function (TurnStatus) {
    TurnStatus["InProgress"] = "in-progress";
    TurnStatus["Success"] = "success";
    TurnStatus["Cancelled"] = "cancelled";
    TurnStatus["OffTopic"] = "off-topic";
    TurnStatus["Filtered"] = "filtered";
    TurnStatus["PromptFiltered"] = "prompt-filtered";
    TurnStatus["Error"] = "error";
})(TurnStatus || (exports.TurnStatus = TurnStatus = {}));
class PromptMetadata {
    toString() {
        return Object.getPrototypeOf(this).constructor.name;
    }
}
exports.PromptMetadata = PromptMetadata;
class RequestDebugInformation {
    constructor(uri, intentId, languageId, initialDocumentText, userPrompt, userSelection) {
        this.uri = uri;
        this.intentId = intentId;
        this.languageId = languageId;
        this.initialDocumentText = initialDocumentText;
        this.userPrompt = userPrompt;
        this.userSelection = userSelection;
    }
}
exports.RequestDebugInformation = RequestDebugInformation;
class Turn {
    static fromRequest(id, request) {
        return new Turn(id, { message: request.prompt, type: 'user' }, new chatVariablesCollection_1.ChatVariablesCollection(request.references), request.toolReferences.map(intents_1.InternalToolReference.from), request.editedFileEvents, request.acceptedConfirmationData, (0, specialRequestTypes_1.isToolCallLimitAcceptance)(request) || (0, specialRequestTypes_1.isContinueOnError)(request));
    }
    constructor(id = (0, uuid_1.generateUuid)(), request, _promptVariables = undefined, _toolReferences = [], editedFileEvents, acceptedConfirmationData, isContinuation = false) {
        this.id = id;
        this.request = request;
        this._promptVariables = _promptVariables;
        this._toolReferences = _toolReferences;
        this.editedFileEvents = editedFileEvents;
        this.acceptedConfirmationData = acceptedConfirmationData;
        this.isContinuation = isContinuation;
        this._references = [];
        this._metadata = new Map();
        this.startTime = Date.now();
    }
    get promptVariables() {
        return this._promptVariables;
    }
    get toolReferences() {
        return this._toolReferences;
    }
    get references() {
        return this._references;
    }
    addReferences(newReferences) {
        this._references = getUniqueReferences([...this._references, ...newReferences]);
    }
    // --- response
    get responseMessage() {
        return this._responseInfo?.message;
    }
    get responseStatus() {
        return this._responseInfo?.status ?? TurnStatus.InProgress;
    }
    get responseId() {
        return this._responseInfo?.responseId;
    }
    get responseChatResult() {
        return this._responseInfo?.chatResult;
    }
    get resultMetadata() {
        return this._responseInfo?.chatResult?.metadata;
    }
    get renderedUserMessage() {
        const metadata = this.resultMetadata;
        return metadata?.renderedUserMessage;
    }
    get rounds() {
        const metadata = this.resultMetadata;
        const rounds = metadata?.toolCallRounds;
        if (!rounds || rounds.length === 0) {
            // Should always have at least one round
            const response = this.responseMessage?.message ?? '';
            return [new toolCallRound_1.ToolCallRound(response, [], undefined, this.id)];
        }
        return rounds;
    }
    setResponse(status, message, responseId, chatResult) {
        if (this._responseInfo?.status === TurnStatus.Cancelled) {
            // The cancelled result can be assigned from inside ToolCallingLoop
            return;
        }
        (0, types_2.assertType)(!this._responseInfo);
        this._responseInfo = { message, status, responseId, chatResult };
    }
    // --- metadata
    // Using 'any' for constructor args here because TS will complain about passing any class if 'unknown' is used, I'm not totally sure why.
    // The idea of this is that you pass in a class and we return instances of that class.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMetadata(key) {
        return this._metadata.get(key)?.at(-1);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAllMetadata(key) {
        return this._metadata.get(key);
    }
    setMetadata(value) {
        const key = Object.getPrototypeOf(value).constructor;
        const arr = this._metadata.get(key) ?? [];
        arr.push(value);
        this._metadata.set(key, arr);
    }
}
exports.Turn = Turn;
// TODO handle persisted 'previous' and '' IDs (?)
// 'previous' -> last tool call round of previous turn
// '' -> current turn, but with user message
/**
 * Move summaries from metadata onto rounds.
 * This is needed for summaries that were produced for a different turn than the current one, because we can only
 * return resultMetadata from a particular request for the current turn, and can't modify the data for previous turns.
 */
function normalizeSummariesOnRounds(turns) {
    for (const [idx, turn] of turns.entries()) {
        const turnSummary = turn.resultMetadata?.summary;
        if (turnSummary) {
            const roundInTurn = turn.rounds.find(round => round.id === turnSummary.toolCallRoundId);
            if (roundInTurn) {
                roundInTurn.summary = turnSummary.text;
            }
            else {
                const previousTurns = turns.slice(0, idx);
                for (const turn of previousTurns) {
                    const roundInPreviousTurn = turn.rounds.find(round => round.id === turnSummary.toolCallRoundId);
                    if (roundInPreviousTurn) {
                        roundInPreviousTurn.summary = turnSummary.text;
                        break;
                    }
                }
            }
        }
    }
}
class Conversation {
    constructor(sessionId, turns) {
        this.sessionId = sessionId;
        this._turns = [];
        (0, types_2.assertType)(turns.length > 0, 'A conversation must have at least one turn');
        this._turns = turns;
    }
    get turns() {
        return this._turns;
    }
    getLatestTurn() {
        return this._turns.at(-1); // safe, we checked for length in the ctor
    }
}
exports.Conversation = Conversation;
function getUniqueReferences(references) {
    const groupedPromptReferences = new map_1.ResourceMap();
    const variableReferences = [];
    const getCombinedRange = (a, b) => {
        if (a.contains(b)) {
            return a;
        }
        if (b.contains(a)) {
            return b;
        }
        const [firstRange, lastRange] = (a.start.line < b.start.line) ? [a, b] : [b, a];
        // check if a is before b
        if (firstRange.end.line >= (lastRange.start.line - 1)) {
            return new vscodeTypes_1.Range(firstRange.start, lastRange.end);
        }
        return undefined;
    };
    // remove overlaps from within the same promptContext
    references.forEach(targetReference => {
        const refAnchor = targetReference.anchor;
        if ('variableName' in refAnchor) {
            variableReferences.push(targetReference);
        }
        else if (!(0, types_1.isLocation)(refAnchor)) {
            groupedPromptReferences.set(refAnchor, targetReference);
        }
        else {
            // reference is a range
            const existingRefs = groupedPromptReferences.get(refAnchor.uri);
            const asValidLocation = (0, types_1.toLocation)(refAnchor);
            if (!asValidLocation) {
                return;
            }
            if (!existingRefs) {
                groupedPromptReferences.set(refAnchor.uri, [new prompt_tsx_1.PromptReference(asValidLocation, undefined, targetReference.options)]);
            }
            else if (!(existingRefs instanceof prompt_tsx_1.PromptReference)) {
                // check if existingRefs isn't already a full file
                const oldLocationsToKeep = [];
                let newRange = asValidLocation.range;
                existingRefs.forEach(existingRef => {
                    if ('variableName' in existingRef.anchor) {
                        return;
                    }
                    if (!(0, types_1.isLocation)(existingRef.anchor)) {
                        // this shouldn't be the case, since all PromptReferences added as part of an array should be ranges
                        return;
                    }
                    const existingRange = (0, types_1.toLocation)(existingRef.anchor);
                    if (!existingRange) {
                        return;
                    }
                    const combinedRange = getCombinedRange(newRange, existingRange.range);
                    if (combinedRange) {
                        // if we can consume this range, incorporate it into the new range and don't add it to the locations to keep
                        newRange = combinedRange;
                    }
                    else {
                        oldLocationsToKeep.push(existingRange);
                    }
                });
                const newRangeLocation = {
                    uri: refAnchor.uri,
                    range: newRange,
                };
                groupedPromptReferences.set(refAnchor.uri, [...oldLocationsToKeep, newRangeLocation]
                    .sort((a, b) => a.range.start.line - b.range.start.line || a.range.end.line - b.range.end.line)
                    .map(location => new prompt_tsx_1.PromptReference(location, undefined, targetReference.options)));
            }
        }
    });
    // sort values
    const finalValues = Array.from(groupedPromptReferences.keys())
        .sort((a, b) => a.toString().localeCompare(b.toString()))
        .map(e => {
        const values = groupedPromptReferences.get(e);
        if (!values) {
            // should not happen, these are all keys
            return [];
        }
        return values;
    }).flat();
    return [
        ...finalValues,
        ...variableReferences
    ];
}
class RenderedUserMessageMetadata {
    constructor(renderedUserMessage) {
        this.renderedUserMessage = renderedUserMessage;
    }
}
exports.RenderedUserMessageMetadata = RenderedUserMessageMetadata;
class GlobalContextMessageMetadata {
    constructor(renderedGlobalContext, cacheKey) {
        this.renderedGlobalContext = renderedGlobalContext;
        this.cacheKey = cacheKey;
    }
}
exports.GlobalContextMessageMetadata = GlobalContextMessageMetadata;
function getGlobalContextCacheKey(accessor) {
    const workspaceService = accessor.get(workspaceService_1.IWorkspaceService);
    return workspaceService.getWorkspaceFolders().map(folder => folder.toString()).join(',');
}
//# sourceMappingURL=conversation.js.map