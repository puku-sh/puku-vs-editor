"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotInteractiveEditorResponse = exports.OutcomeAnnotationLabel = exports.InteractionOutcome = exports.InteractionOutcomeComputer = void 0;
const chatResponseStreamImpl_1 = require("../../../util/common/chatResponseStreamImpl");
const map_1 = require("../../../util/vs/base/common/map");
const vscodeTypes_1 = require("../../../vscodeTypes");
//#region interpreting copilot response
/**
 * Determines the interaction outcome based on what passes through the stream.
 */
class InteractionOutcomeComputer {
    get _interactionOutcomeKind() {
        if (this._seenEdits.size > 0) {
            // edits have been sent to the response stream
            return (this._seenEdits.size === 1 && this._currentDocument && this._seenEdits.has(this._currentDocument)
                ? 'inlineEdit'
                : 'workspaceEdit');
        }
        if (this._seenMarkdown) {
            return 'conversational';
        }
        if (this._seenNoOpEdits) {
            return 'noopEdit';
        }
        return 'none';
    }
    get interactionOutcome() {
        return new InteractionOutcome(this._interactionOutcomeKind, this._annotations);
    }
    constructor(_currentDocument) {
        this._currentDocument = _currentDocument;
        this._annotations = [];
        this._seenMarkdown = false;
        this._seenEdits = new map_1.ResourceSet();
        this._seenNoOpEdits = false;
        this.store = undefined;
    }
    spyOnStream(outStream) {
        return chatResponseStreamImpl_1.ChatResponseStreamImpl.spy(outStream, (part) => {
            if (part instanceof vscodeTypes_1.ChatResponseMarkdownPart) {
                this._markEmittedMarkdown(part.value);
            }
            if (part instanceof vscodeTypes_1.ChatResponseTextEditPart) {
                this._markEmittedEdits(part.uri, part.edits);
            }
            if (part instanceof vscodeTypes_1.ChatResponseNotebookEditPart) {
                this._markEmittedNotebookEdits(part.uri, part.edits);
            }
        });
    }
    _markEmittedMarkdown(str) {
        this._seenMarkdown = true;
    }
    _markEmittedEdits(uri, edits) {
        this._seenEdits.add(uri);
    }
    _markEmittedNotebookEdits(uri, edits) {
        this._seenEdits.add(uri);
    }
    addAnnotations(annotations = []) {
        this._seenNoOpEdits = this._seenNoOpEdits || annotations.some(annotation => annotation.label === OutcomeAnnotationLabel.NOOP_EDITS);
        this._annotations = this._annotations.concat(annotations);
    }
    storeInInlineSession(store) {
        this.store = store;
    }
}
exports.InteractionOutcomeComputer = InteractionOutcomeComputer;
class InteractionOutcome {
    constructor(kind, annotations) {
        this.kind = kind;
        this.annotations = annotations;
    }
}
exports.InteractionOutcome = InteractionOutcome;
var OutcomeAnnotationLabel;
(function (OutcomeAnnotationLabel) {
    OutcomeAnnotationLabel["NO_PATCH"] = "no patch";
    OutcomeAnnotationLabel["INVALID_PATCH"] = "invalid patch";
    OutcomeAnnotationLabel["OTHER_FILE"] = "other file";
    OutcomeAnnotationLabel["MULTI_FILE"] = "multi file";
    OutcomeAnnotationLabel["INVALID_EDIT_OVERLAP"] = "overlapping edit";
    OutcomeAnnotationLabel["INVALID_PROJECTION"] = "invalid projection";
    OutcomeAnnotationLabel["INVALID_PATCH_LAZY"] = "patch lazy";
    OutcomeAnnotationLabel["INVALID_PATCH_COMMENT"] = "patch no comment";
    OutcomeAnnotationLabel["INVALID_PATCH_SMALL"] = "patch small";
    OutcomeAnnotationLabel["INVALID_PATCH_NOOP"] = "patch no op";
    OutcomeAnnotationLabel["SUMMARIZE_CONFLICT"] = "summarize conflict";
    OutcomeAnnotationLabel["NOOP_EDITS"] = "noop edits";
})(OutcomeAnnotationLabel || (exports.OutcomeAnnotationLabel = OutcomeAnnotationLabel = {}));
class CopilotInteractiveEditorResponse {
    constructor(kind, store, promptQuery, messageId, telemetry, editSurvivalTracker) {
        this.kind = kind;
        this.store = store;
        this.promptQuery = promptQuery;
        this.messageId = messageId;
        this.telemetry = telemetry;
        this.editSurvivalTracker = editSurvivalTracker;
    }
}
exports.CopilotInteractiveEditorResponse = CopilotInteractiveEditorResponse;
//# sourceMappingURL=promptCraftingTypes.js.map