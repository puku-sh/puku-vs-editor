"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockLanguageModelServer = void 0;
const langModelServer_1 = require("../langModelServer");
/**
 * Mock implementation of LanguageModelServer for unit tests. It avoids binding
 * sockets and returns a deterministic configuration.
 */
class MockLanguageModelServer extends langModelServer_1.LanguageModelServer {
    constructor() {
        super(...arguments);
        this._cfg = { port: 12345, nonce: 'test-nonce' };
    }
    async start() {
    }
    setMockConfig(cfg) { this._cfg = cfg; }
    getConfig() { return this._cfg; }
}
exports.MockLanguageModelServer = MockLanguageModelServer;
//# sourceMappingURL=mockLanguageModelServer.js.map