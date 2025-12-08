"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceChunkSearchStrategyId = void 0;
/**
 * Internal ids used to identify strategies in telemetry.
 */
var WorkspaceChunkSearchStrategyId;
(function (WorkspaceChunkSearchStrategyId) {
    WorkspaceChunkSearchStrategyId["Embeddings"] = "ada";
    WorkspaceChunkSearchStrategyId["CodeSearch"] = "codesearch";
    WorkspaceChunkSearchStrategyId["Tfidf"] = "tfidf";
    WorkspaceChunkSearchStrategyId["FullWorkspace"] = "fullWorkspace";
})(WorkspaceChunkSearchStrategyId || (exports.WorkspaceChunkSearchStrategyId = WorkspaceChunkSearchStrategyId = {}));
//# sourceMappingURL=workspaceChunkSearch.js.map