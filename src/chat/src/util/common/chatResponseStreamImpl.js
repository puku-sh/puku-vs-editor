"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatResponseStreamImpl = void 0;
exports.tryFinalizeResponseStream = tryFinalizeResponseStream;
const vscodeTypes_1 = require("../../vscodeTypes");
function tryFinalizeResponseStream(stream) {
    if (typeof stream.finalize === 'function') {
        return stream.finalize();
    }
}
/**
 * A `ChatResponseStream` that forwards all calls to a single callback.
 */
class ChatResponseStreamImpl {
    static spy(stream, callback, finalize) {
        return new ChatResponseStreamImpl((value) => {
            callback(value);
            stream.push(value);
        }, (reason) => {
            stream.clearToPreviousToolInvocation(reason);
        }, () => {
            finalize?.();
            return tryFinalizeResponseStream(stream);
        });
    }
    static filter(stream, callback, finalize) {
        return new ChatResponseStreamImpl((value) => {
            if (callback(value)) {
                stream.push(value);
            }
        }, (reason) => {
            stream.clearToPreviousToolInvocation(reason);
        }, () => {
            finalize?.();
            return tryFinalizeResponseStream(stream);
        });
    }
    static map(stream, callback, finalize) {
        return new ChatResponseStreamImpl((value) => {
            const result = callback(value);
            if (result) {
                stream.push(result);
            }
        }, (reason) => {
            stream.clearToPreviousToolInvocation(reason);
        }, () => {
            finalize?.();
            return tryFinalizeResponseStream(stream);
        });
    }
    constructor(_push, _clearToPreviousToolInvocation, _finalize) {
        this._push = _push;
        this._clearToPreviousToolInvocation = _clearToPreviousToolInvocation;
        this._finalize = _finalize;
    }
    async finalize() {
        await this._finalize?.();
    }
    clearToPreviousToolInvocation(reason) {
        this._clearToPreviousToolInvocation(reason);
    }
    markdown(value) {
        this._push(new vscodeTypes_1.ChatResponseMarkdownPart(value));
    }
    anchor(value, title) {
        this._push(new vscodeTypes_1.ChatResponseAnchorPart(value, title));
    }
    thinkingProgress(thinkingDelta) {
        this._push(new vscodeTypes_1.ChatResponseThinkingProgressPart(thinkingDelta.text ?? '', thinkingDelta.id, thinkingDelta.metadata));
    }
    button(command) {
        this._push(new vscodeTypes_1.ChatResponseCommandButtonPart(command));
    }
    filetree(value, baseUri) {
        this._push(new vscodeTypes_1.ChatResponseFileTreePart(value, baseUri));
    }
    externalEdit(target, callback) {
        const part = new vscodeTypes_1.ChatResponseExternalEditPart(target instanceof Array ? target : [target], callback);
        this._push(part);
        return part.applied;
    }
    progress(value, task) {
        if (typeof task === 'undefined') {
            this._push(new vscodeTypes_1.ChatResponseProgressPart(value));
        }
        else {
            this._push(new vscodeTypes_1.ChatResponseProgressPart2(value, task));
        }
    }
    reference(value, iconPath) {
        this._push(new vscodeTypes_1.ChatResponseReferencePart(value, iconPath));
    }
    reference2(value, iconPath, options) {
        this._push(new vscodeTypes_1.ChatResponseReferencePart2(value, iconPath, options));
    }
    codeCitation(value, license, snippet) {
        this._push(new vscodeTypes_1.ChatResponseCodeCitationPart(value, license, snippet));
    }
    push(part) {
        this._push(part);
    }
    textEdit(target, editsOrDone) {
        if (Array.isArray(editsOrDone) || editsOrDone instanceof vscodeTypes_1.TextEdit) {
            this._push(new vscodeTypes_1.ChatResponseTextEditPart(target, editsOrDone));
        }
        else {
            const part = new vscodeTypes_1.ChatResponseTextEditPart(target, []);
            part.isDone = true;
            this._push(part);
        }
    }
    notebookEdit(target, editsOrDone) {
        if (editsOrDone === true) {
            this._push(new vscodeTypes_1.ChatResponseNotebookEditPart(target, true));
        }
        else if (Array.isArray(editsOrDone)) {
            this._push(new vscodeTypes_1.ChatResponseNotebookEditPart(target, editsOrDone));
        }
        else {
            this._push(new vscodeTypes_1.ChatResponseNotebookEditPart(target, editsOrDone));
        }
    }
    markdownWithVulnerabilities(value, vulnerabilities) {
        this._push(new vscodeTypes_1.ChatResponseMarkdownWithVulnerabilitiesPart(value, vulnerabilities));
    }
    codeblockUri(value, isEdit) {
        try {
            this._push(new vscodeTypes_1.ChatResponseCodeblockUriPart(value, isEdit));
        }
        catch { } // TODO@joyceerhl remove try/catch
    }
    confirmation(title, message, data, buttons) {
        this._push(new vscodeTypes_1.ChatResponseConfirmationPart(title, message, data, buttons));
    }
    warning(value) {
        this._push(new vscodeTypes_1.ChatResponseWarningPart(value));
    }
    prepareToolInvocation(toolName) {
        this._push(new vscodeTypes_1.ChatPrepareToolInvocationPart(toolName));
    }
}
exports.ChatResponseStreamImpl = ChatResponseStreamImpl;
//# sourceMappingURL=chatResponseStreamImpl.js.map