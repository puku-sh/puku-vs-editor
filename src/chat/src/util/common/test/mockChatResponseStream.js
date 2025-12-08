"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpyChatResponseStream = void 0;
const vscodeTypes_1 = require("../../../vscodeTypes");
const arrays_1 = require("../../vs/base/common/arrays");
const chatResponseStreamImpl_1 = require("../chatResponseStreamImpl");
const types_1 = require("../types");
class SpyChatResponseStream extends chatResponseStreamImpl_1.ChatResponseStreamImpl {
    get currentProgress() {
        return (0, arrays_1.coalesce)(this.items
            .map((part) => {
            if (part instanceof vscodeTypes_1.ChatResponseMarkdownPart) {
                return part.value.value;
            }
            if (part instanceof vscodeTypes_1.ChatResponseAnchorPart) {
                if ((0, types_1.isUri)(part.value)) {
                    return part.value.toString();
                }
                else if ((0, types_1.isLocation)(part.value)) {
                    return part.value.uri.toString();
                }
                else if ((0, types_1.isSymbolInformation)(part.value2)) {
                    return part.value2.name;
                }
            }
            return undefined;
        })).join('');
    }
    get confirmations() {
        return this.items.filter((part) => part instanceof vscodeTypes_1.ChatResponseConfirmationPart);
    }
    get fileTrees() {
        return this.items.filter((part) => part instanceof vscodeTypes_1.ChatResponseFileTreePart);
    }
    get commandButtons() {
        return this.items.filter((part) => part instanceof vscodeTypes_1.ChatResponseCommandButtonPart).map(part => part.value);
    }
    constructor() {
        super((part) => this.items.push(part), () => { });
        this.items = [];
    }
}
exports.SpyChatResponseStream = SpyChatResponseStream;
//# sourceMappingURL=mockChatResponseStream.js.map