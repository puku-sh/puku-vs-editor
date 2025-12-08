"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSha256FromStream = createSha256FromStream;
const node_crypto_1 = require("node:crypto");
async function createSha256FromStream(stream) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    for await (const chunk of stream) {
        hash.update(chunk);
    }
    return hash.digest('hex');
}
//# sourceMappingURL=crypto.js.map