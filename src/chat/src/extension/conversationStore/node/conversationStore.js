"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationStore = exports.IConversationStore = void 0;
const services_1 = require("../../../util/common/services");
const map_1 = require("../../../util/vs/base/common/map");
exports.IConversationStore = (0, services_1.createServiceIdentifier)('IConversationStore');
class ConversationStore {
    constructor() {
        this.conversationMap = new map_1.LRUCache(1000);
    }
    addConversation(responseId, conversation) {
        this.conversationMap.set(responseId, conversation);
    }
    getConversation(responseId) {
        return this.conversationMap.get(responseId);
    }
    get lastConversation() {
        return this.conversationMap.last;
    }
}
exports.ConversationStore = ConversationStore;
//# sourceMappingURL=conversationStore.js.map