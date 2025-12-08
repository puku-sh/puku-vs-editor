"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestChatSessionService = void 0;
const event_1 = require("../../../../util/vs/base/common/event");
class TestChatSessionService {
    get onDidDisposeChatSession() {
        return event_1.Event.None;
    }
}
exports.TestChatSessionService = TestChatSessionService;
//# sourceMappingURL=testChatSessionService.js.map