"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Completion = void 0;
var Completion;
(function (Completion) {
    /**
     * The reason the model stopped generating tokens.
     */
    let FinishReason;
    (function (FinishReason) {
        /** If the model hit a natural stop point or a provided stop sequence. */
        FinishReason["Stop"] = "stop";
        /** If the maximum number of tokens specified in the request was reached. */
        FinishReason["Length"] = "length";
        /** If content was omitted due to a flag from our content filters. */
        FinishReason["ContentFilter"] = "content_filter";
    })(FinishReason = Completion.FinishReason || (Completion.FinishReason = {}));
})(Completion || (exports.Completion = Completion = {}));
//# sourceMappingURL=completionsAPI.js.map