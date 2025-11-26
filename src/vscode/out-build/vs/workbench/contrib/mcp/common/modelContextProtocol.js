/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//#endregion
/**
 * Schema updated from the Model Context Protocol repository at
 * https://github.com/modelcontextprotocol/specification/tree/main/schema
 *
 * ⚠️ Do not edit within `namespace` manually except to update schema versions ⚠️
 */
export var MCP;
(function (MCP) {
    /** @internal */
    MCP.LATEST_PROTOCOL_VERSION = "2025-06-18";
    /** @internal */
    MCP.JSONRPC_VERSION = "2.0";
    // Standard JSON-RPC error codes
    /** @internal */
    MCP.PARSE_ERROR = -32700;
    /** @internal */
    MCP.INVALID_REQUEST = -32600;
    /** @internal */
    MCP.METHOD_NOT_FOUND = -32601;
    /** @internal */
    MCP.INVALID_PARAMS = -32602;
    /** @internal */
    MCP.INTERNAL_ERROR = -32603;
    // Implementation-specific JSON-RPC error codes [-32000, -32099]
    /** @internal */
    MCP.URL_ELICITATION_REQUIRED = -32042;
})(MCP || (MCP = {}));
//# sourceMappingURL=modelContextProtocol.js.map