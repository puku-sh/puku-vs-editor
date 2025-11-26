/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class McpDiscoveryRegistry {
    constructor() {
        this._discovery = [];
    }
    register(discovery) {
        this._discovery.push(discovery);
    }
    getAll() {
        return this._discovery;
    }
}
export const mcpDiscoveryRegistry = new McpDiscoveryRegistry();
//# sourceMappingURL=mcpDiscovery.js.map