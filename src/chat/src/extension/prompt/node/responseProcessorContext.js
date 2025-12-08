"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseProcessorContext = void 0;
class ResponseProcessorContext {
    constructor(chatSessionId, turn, messages, _interactionOutcomeComputer) {
        this.chatSessionId = chatSessionId;
        this.turn = turn;
        this.messages = messages;
        this._interactionOutcomeComputer = _interactionOutcomeComputer;
    }
    addAnnotations(annotations) {
        this._interactionOutcomeComputer.addAnnotations(annotations);
    }
    storeInInlineSession(store) {
        this._interactionOutcomeComputer.storeInInlineSession(store);
    }
}
exports.ResponseProcessorContext = ResponseProcessorContext;
//# sourceMappingURL=responseProcessorContext.js.map