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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxDb250ZXh0UHJvdG9jb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21vZGVsQ29udGV4dFByb3RvY29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBaUJoRyxZQUFZO0FBRVo7Ozs7O0dBS0c7QUFDSCxNQUFNLEtBQVcsR0FBRyxDQTAwRG5CO0FBMTBERCxXQUFpQixHQUFHO0lBYW5CLGdCQUFnQjtJQUNILDJCQUF1QixHQUFHLFlBQVksQ0FBQztJQUNwRCxnQkFBZ0I7SUFDSCxtQkFBZSxHQUFHLEtBQUssQ0FBQztJQXNHckMsZ0NBQWdDO0lBQ2hDLGdCQUFnQjtJQUNILGVBQVcsR0FBRyxDQUFDLEtBQUssQ0FBQztJQUNsQyxnQkFBZ0I7SUFDSCxtQkFBZSxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQ3RDLGdCQUFnQjtJQUNILG9CQUFnQixHQUFHLENBQUMsS0FBSyxDQUFDO0lBQ3ZDLGdCQUFnQjtJQUNILGtCQUFjLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDckMsZ0JBQWdCO0lBQ0gsa0JBQWMsR0FBRyxDQUFDLEtBQUssQ0FBQztJQUVyQyxnRUFBZ0U7SUFDaEUsZ0JBQWdCO0lBQ0gsNEJBQXdCLEdBQUcsQ0FBQyxLQUFLLENBQUM7QUFzc0RoRCxDQUFDLEVBMTBEZ0IsR0FBRyxLQUFILEdBQUcsUUEwMERuQiJ9