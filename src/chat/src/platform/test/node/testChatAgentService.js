"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestChatAgentService = void 0;
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
class TestChatAgentService {
    register(options) {
        return new lifecycle_1.DisposableStore();
    }
}
exports.TestChatAgentService = TestChatAgentService;
//# sourceMappingURL=testChatAgentService.js.map