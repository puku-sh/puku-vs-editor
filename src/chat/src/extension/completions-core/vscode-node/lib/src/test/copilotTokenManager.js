"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeCopilotTokenManager = void 0;
const copilotToken_1 = require("../../../../../../platform/authentication/common/copilotToken");
const uuid_1 = require("../../../../../../util/vs/base/common/uuid");
// Buffer to allow refresh to happen successfully
class FakeCopilotTokenManager {
    constructor() {
        this._token = FakeCopilotTokenManager.createTestCopilotToken({ token: 'tid=test;rt=1' });
    }
    get token() {
        return this._token;
    }
    primeToken() {
        return Promise.resolve(true);
    }
    async getToken() {
        return this._token;
    }
    resetToken(httpError) {
    }
    getLastToken() {
        return this._token;
    }
    static { this.REFRESH_BUFFER_SECONDS = 60; }
    static createTestCopilotToken(tokenInfo) {
        const expires_at = Date.now() + ((tokenInfo?.refresh_in ?? 0) + FakeCopilotTokenManager.REFRESH_BUFFER_SECONDS) * 1000;
        const realToken = {
            token: `test token ${(0, uuid_1.generateUuid)()}`,
            username: 'testuser',
            isVscodeTeamMember: false,
            copilot_plan: 'free',
            refresh_in: 0,
            expires_at,
            ...tokenInfo
        };
        return new copilotToken_1.CopilotToken(realToken);
    }
}
exports.FakeCopilotTokenManager = FakeCopilotTokenManager;
//# sourceMappingURL=copilotTokenManager.js.map